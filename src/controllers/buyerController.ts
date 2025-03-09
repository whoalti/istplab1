import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Buyer } from '../entities/Buyer';
import { Purchase } from '../entities/Purchase';
import { CustomError } from '../utils/errors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class BuyerController {
    private buyerRepository = AppDataSource.getRepository(Buyer);
    private purchaseRepository = AppDataSource.getRepository(Purchase);

    getAllBuyers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const buyers = await this.buyerRepository.find({
                select: ['buyer_id', 'username'] 
            });
            res.json(buyers);
        } catch (error) {
            next(new CustomError('Failed to fetch buyers', 500));
        }
    }

    getBuyerById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const buyer = await this.buyerRepository.findOne({
                where: { buyer_id: req.params.id },
                select: ['buyer_id', 'username']
            });

            if (!buyer) {
                return next(new CustomError('Buyer not found', 404));
            }

            res.json(buyer);
        } catch (error) {
            next(new CustomError('Failed to fetch buyer', 500));
        }
    }

    registerBuyer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return next(new CustomError('Username and password are required', 400));
            }

            const existingBuyer = await this.buyerRepository.findOne({ 
                where: { username }
            });

            if (existingBuyer) {
                return next(new CustomError('Username already exists', 400));
            }

            const saltRounds = 10;
            const password_hash = await bcrypt.hash(password, saltRounds);

            const buyer = this.buyerRepository.create({
                username,
                password_hash
            });

            const savedBuyer = await this.buyerRepository.save(buyer);

            const { password_hash: _, ...buyerWithoutPassword } = savedBuyer;
            res.status(201).json(buyerWithoutPassword);
        } catch (error) {
            next(error);
        }
    }

    loginBuyer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return next(new CustomError('Username and password are required', 400));
            }

            const buyer = await this.buyerRepository.findOne({
                where: { username }
            });

            if (!buyer) {
                return next(new CustomError('Invalid credentials', 401));
            }

            const isPasswordValid = await bcrypt.compare(password, buyer.password_hash);

            if (!isPasswordValid) {
                return next(new CustomError('Invalid credentials', 401));
            }

            const token = jwt.sign(
                { buyer_id: buyer.buyer_id, username: buyer.username },
                process.env.JWT_SECRET || 'default-secret-key',
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Login successful',
                token,
                buyer: {
                    buyer_id: buyer.buyer_id,
                    username: buyer.username
                }
            });
        } catch (error) {
            next(error);
        }
    }

    updateBuyer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { username, password } = req.body;
            const buyerId = req.params.id;

            const buyer = await this.buyerRepository.findOne({
                where: { buyer_id: buyerId }
            });

            if (!buyer) {
                return next(new CustomError('Buyer not found', 404));
            }

            if (username && username !== buyer.username) {
                const existingBuyer = await this.buyerRepository.findOne({
                    where: { username }
                });

                if (existingBuyer) {
                    return next(new CustomError('Username already exists', 400));
                }

                buyer.username = username;
            }

            if (password) {
                const saltRounds = 10;
                buyer.password_hash = await bcrypt.hash(password, saltRounds);
            }

            await this.buyerRepository.save(buyer);

            res.json({
                message: 'Buyer updated successfully',
                buyer: {
                    buyer_id: buyer.buyer_id,
                    username: buyer.username
                }
            });
        } catch (error) {
            next(error);
        }
    }

    deleteBuyer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.buyerRepository.delete(req.params.id);

            if (result.affected === 0) {
                return next(new CustomError('Buyer not found', 404));
            }

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    getBuyerPurchases = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const purchases = await this.purchaseRepository.find({
                where: { buyer: { buyer_id: req.params.id } },
                relations: ['product']
            });

            res.json(purchases);
        } catch (error) {
            next(new CustomError('Failed to fetch purchases', 500));
        }
    }

    registerView = async (req: Request, res: Response) => {
        try {
            res.render('buyers/register', {
                title: 'Register'
            });
        } catch (error) {
            console.error('Error rendering register page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the register page'
            });
        }
    }

    loginView = async (req: Request, res: Response) => {
        try {
            res.render('buyers/login', {
                title: 'Login'
            });
        } catch (error) {
            console.error('Error rendering login page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the login page'
            });
        }
    }

    profileView = async (req: Request, res: Response) => {
        try {
            const buyerId = req.user?.buyer_id;
            
            if (!buyerId) {
                return res.redirect('/login');
            }

            const buyer = await this.buyerRepository.findOne({
                where: { buyer_id: buyerId },
                select: ['buyer_id', 'username']
            });

            if (!buyer) {
                return res.status(404).render('error', {
                    title: 'Not Found',
                    message: 'Buyer profile not found'
                });
            }

            const purchases = await this.purchaseRepository.find({
                where: { buyer: { buyer_id: buyerId } },
                relations: ['product'],
                order: { purchase_date: 'DESC' }
            });

            res.render('buyers/profile', {
                title: 'My Profile',
                buyer,
                purchases
            });
        } catch (error) {
            console.error('Error rendering profile page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the profile page'
            });
        }
    }
}