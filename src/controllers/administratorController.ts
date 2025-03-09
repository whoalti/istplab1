import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Administrator } from '../entities/Administrator';
import { CustomError } from '../utils/errors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatisticsController } from './statisticsController';

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
}