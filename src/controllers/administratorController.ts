import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Administrator } from '../entities/Administrator';
import { CustomError } from '../utils/errors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatisticsController } from './statisticsController';
import { Buyer } from '../entities/Buyer';
import { Purchase } from '../entities/Purchase';

export class AdministratorController {
    private adminRepository = AppDataSource.getRepository(Administrator);

    getAllAdmins = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const admins = await this.adminRepository.find({
                select: ['admin_id', 'username'] 
            });
            res.json(admins);
        } catch (error) {
            next(new CustomError('Failed to fetch administrators', 500));
        }
    }

    getAdminById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const admin = await this.adminRepository.findOne({
                where: { admin_id: req.params.id },
                select: ['admin_id', 'username']
            });

            if (!admin) {
                return next(new CustomError('Administrator not found', 404));
            }

            res.json(admin);
        } catch (error) {
            next(new CustomError('Failed to fetch administrator', 500));
        }
    }

    createAdmin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return next(new CustomError('Username and password are required', 400));
            }

            const existingAdmin = await this.adminRepository.findOne({ 
                where: { username }
            });

            if (existingAdmin) {
                return next(new CustomError('Username already exists', 400));
            }

            const saltRounds = 10;
            const password_hash = await bcrypt.hash(password, saltRounds);

            const admin = this.adminRepository.create({
                username,
                password_hash
            });

            const savedAdmin = await this.adminRepository.save(admin);

            const { password_hash: _, ...adminWithoutPassword } = savedAdmin;
            res.status(201).json(adminWithoutPassword);
        } catch (error) {
            next(error);
        }
    }

    loginAdmin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { username, password } = req.body;
    
            if (!username || !password) {
                if (req.xhr || req.headers.accept?.includes('application/json')) {
                    return res.status(400).json({ message: 'Username and password are required' });
                }
                return next(new CustomError('Username and password are required', 400));
            }
    
            const admin = await this.adminRepository.findOne({
                where: { username }
            });
    
            if (!admin) {
                if (req.xhr || req.headers.accept?.includes('application/json')) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }
                return next(new CustomError('Invalid credentials', 401));
            }
    
            const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    
            if (!isPasswordValid) {
                if (req.xhr || req.headers.accept?.includes('application/json')) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }
                return next(new CustomError('Invalid credentials', 401));
            }
    
            const token = jwt.sign(
                { 
                    admin_id: admin.admin_id, 
                    username: admin.username, 
                    role: 'admin'  
                },
                process.env.JWT_SECRET || 'default-secret-key',
                { expiresIn: '24h' }
            );
    
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.json({
                    message: 'Login successful',
                    token,
                    admin: {
                        admin_id: admin.admin_id,
                        username: admin.username
                    }
                });
            }
    
            res.cookie('token', token, { maxAge: 86400000, httpOnly: true });
            res.redirect('/admin/dashboard');
        } catch (error) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                console.error('Admin login error:', error);
                return res.status(500).json({ message: 'Internal server error' });
            }
            next(error);
        }
    }

    updateAdmin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { username, password } = req.body;
            const adminId = req.params.id;

            const admin = await this.adminRepository.findOne({
                where: { admin_id: adminId }
            });

            if (!admin) {
                return next(new CustomError('Administrator not found', 404));
            }

            if (username && username !== admin.username) {
                const existingAdmin = await this.adminRepository.findOne({
                    where: { username }
                });

                if (existingAdmin) {
                    return next(new CustomError('Username already exists', 400));
                }

                admin.username = username;
            }

            if (password) {
                const saltRounds = 10;
                admin.password_hash = await bcrypt.hash(password, saltRounds);
            }

            await this.adminRepository.save(admin);

            res.json({
                message: 'Administrator updated successfully',
                admin: {
                    admin_id: admin.admin_id,
                    username: admin.username
                }
            });
        } catch (error) {
            next(error);
        }
    }

    deleteAdmin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.adminRepository.delete(req.params.id);

            if (result.affected === 0) {
                return next(new CustomError('Administrator not found', 404));
            }

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    loginView = async (req: Request, res: Response) => {
        try {
            res.render('admin/login', {
                title: 'Admin Login'
            });
        } catch (error) {
            console.error('Error rendering admin login page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the admin login page'
            });
        }
    }

    dashboardView = async (req: Request, res: Response) => {
        try {
            const statisticsController = new StatisticsController();
            return statisticsController.dashboardView(req, res);
        } catch (error) {
            console.error('Error rendering admin dashboard:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the admin dashboard'
            });
        }
    }

    viewAllCustomers = async (req: Request, res: Response) => {
        try {
            const buyerRepository = AppDataSource.getRepository(Buyer);
            const customers = await buyerRepository.find({
                select: ['buyer_id', 'username'],
                order: { username: 'ASC' }
            });
    
            const purchaseRepository = AppDataSource.getRepository(Purchase);
            
            for (const customer of customers) {
                const purchases = await purchaseRepository.find({
                    where: { buyer: { buyer_id: customer.buyer_id } }
                });
                
                const totalSpent = purchases.reduce((sum, purchase) => {
                    return sum + (typeof purchase.amount === 'number' ? 
                        purchase.amount : parseFloat(purchase.amount));
                }, 0);
                
                (customer as any).purchaseCount = purchases.length;
                (customer as any).totalSpent = totalSpent;
                (customer as any).lastPurchaseDate = purchases.length > 0 ? 
                    purchases.sort((a, b) => 
                        new Date(b.purchase_date).getTime() - 
                        new Date(a.purchase_date).getTime()
                    )[0].purchase_date : null;
            }
    
            res.render('admin/customers', {
                title: 'Customer Management',
                customers
            });
        } catch (error) {
            console.error('Error rendering customers page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the customers page'
            });
        }
    }
    
    viewCustomerDetails = async (req: Request, res: Response) => {
        try {
            const buyerId = req.params.id;
            const buyerRepository = AppDataSource.getRepository(Buyer);
            const purchaseRepository = AppDataSource.getRepository(Purchase);
            
            const customer = await buyerRepository.findOne({
                where: { buyer_id: buyerId }
            });
            
            if (!customer) {
                return res.status(404).render('error', {
                    title: 'Customer Not Found',
                    message: 'The requested customer could not be found'
                });
            }
            
            const purchases = await purchaseRepository.find({
                where: { buyer: { buyer_id: buyerId } },
                relations: ['product'],
                order: { purchase_date: 'DESC' }
            });
            
            const totalSpent = purchases.reduce((sum, purchase) => {
                return sum + (typeof purchase.amount === 'number' ? 
                    purchase.amount : parseFloat(purchase.amount));
            }, 0);
            
            const purchaseCount = purchases.length;
            const avgOrderValue = purchaseCount > 0 ? totalSpent / purchaseCount : 0;
            
            res.render('admin/customer-details', {
                title: `Customer: ${customer.username}`,
                customer,
                purchases,
                stats: {
                    totalSpent,
                    purchaseCount,
                    avgOrderValue
                }
            });
        } catch (error) {
            console.error('Error rendering customer details page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the customer details'
            });
        }
    }
}