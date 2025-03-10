import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Purchase } from '../entities/Purchase';
import { Product } from '../entities/Product';
import { Buyer } from '../entities/Buyer';
import { Statistics } from '../entities/Statistics';
import { CustomError } from '../utils/errors';

export class PurchaseController {
    private purchaseRepository = AppDataSource.getRepository(Purchase);
    private productRepository = AppDataSource.getRepository(Product);
    private buyerRepository = AppDataSource.getRepository(Buyer);
    private statisticsRepository = AppDataSource.getRepository(Statistics);

    getAllPurchases = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const purchases = await this.purchaseRepository.find({
                relations: ['buyer', 'product'],
                order: { purchase_date: 'DESC' }
            });
            
            res.json(purchases);
        } catch (error) {
            next(new CustomError('Failed to fetch purchases', 500));
        }
    }

    getPurchaseById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const purchase = await this.purchaseRepository.findOne({
                where: { purchase_id: req.params.id },
                relations: ['buyer', 'product']
            });

            if (!purchase) {
                return next(new CustomError('Purchase not found', 404));
            }

            res.json(purchase);
        } catch (error) {
            next(new CustomError('Failed to fetch purchase', 500));
        }
    }

    createPurchase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { productId, quantity = 1 } = req.body;
            const buyerId = req.user?.buyer_id;

            if (!buyerId) {
                next(new CustomError('User not authenticated', 401));
                return;
            }

            const product = await this.productRepository.findOne({
                where: { product_id: productId }
            });

            if (!product) {
                next(new CustomError('Product not found', 404));
                return;
            }

            if (product.stock_quantity < quantity) {
                next(new CustomError(`Not enough stock. Only ${product.stock_quantity} available.`, 400));
                return;
            }

            const amount = product.price * quantity;

            const purchase = this.purchaseRepository.create({
                amount,
                buyer: { buyer_id: buyerId },
                product: { product_id: productId }
            });

            product.stock_quantity -= quantity;

            let statistics = await this.statisticsRepository.findOne({
                where: { product: { product_id: productId } }
            });

            if (!statistics) {
                statistics = this.statisticsRepository.create({
                    product: { product_id: productId },
                    total_sales: 0,
                    total_revenue: 0
                });
            }

            statistics.total_sales += quantity;
            statistics.total_revenue += amount;

            await queryRunner.manager.save(product);
            await queryRunner.manager.save(purchase);
            await queryRunner.manager.save(statistics);

            await queryRunner.commitTransaction();

            if (req.xhr || req.headers.accept?.includes('application/json')) {
                res.status(201).json({
                    message: 'Purchase successful',
                    purchase
                });
                return;
            }
            
            res.redirect('/profile');
            return;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            next(error);
        } finally {
            await queryRunner.release();
        }
    }

    getUserPurchases = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const buyerId = req.user?.buyer_id;

            if (!buyerId) {
                return next(new CustomError('User not authenticated', 401));
            }

            const purchases = await this.purchaseRepository.find({
                where: { buyer: { buyer_id: buyerId } },
                relations: ['product'],
                order: { purchase_date: 'DESC' }
            });

            res.json(purchases);
        } catch (error) {
            next(error);
        }
    }

    getPurchaseStatistics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const buyerId = req.user?.buyer_id;

            if (!buyerId) {
                return next(new CustomError('User not authenticated', 401));
            }

            const purchases = await this.purchaseRepository.find({
                where: { buyer: { buyer_id: buyerId } }
            });

            const totalSpent = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.amount.toString()), 0);
            const purchaseCount = purchases.length;

            res.json({
                totalSpent,
                purchaseCount,
                averageSpent: purchaseCount > 0 ? totalSpent / purchaseCount : 0
            });
        } catch (error) {
            next(error);
        }
    }

    getFilteredPurchases = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { startDate, endDate, buyerId, productId } = req.query;
            
            const queryBuilder = this.purchaseRepository.createQueryBuilder('purchase')
                .leftJoinAndSelect('purchase.buyer', 'buyer')
                .leftJoinAndSelect('purchase.product', 'product')
                .orderBy('purchase.purchase_date', 'DESC');
            
            if (startDate && endDate) {
                queryBuilder.andWhere(
                    'purchase.purchase_date BETWEEN :startDate AND :endDate',
                    { 
                        startDate: new Date(startDate as string), 
                        endDate: new Date(endDate as string) 
                    }
                );
            }
            
            if (buyerId) {
                queryBuilder.andWhere('buyer.buyer_id = :buyerId', { buyerId });
            }
            
            if (productId) {
                queryBuilder.andWhere('product.product_id = :productId', { productId });
            }
            
            const purchases = await queryBuilder.getMany();
            
            res.json(purchases);
        } catch (error) {
            next(error);
        }
    }

    checkoutView = async (req: Request, res: Response) => {
        try {
            const { productId } = req.params;
            
            const product = await this.productRepository.findOne({
                where: { product_id: productId },
                relations: ['categories']
            });
            
            if (!product) {
                return res.status(404).render('error', {
                    title: 'Product Not Found',
                    message: 'The requested product could not be found'
                });
            }
            
            res.render('purchases/checkout', {
                title: 'Checkout',
                product,
                quantity: 1,
                totalAmount: product.price
            });
        } catch (error) {
            console.error('Error rendering checkout page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the checkout page'
            });
        }
    }

    confirmationView = async (req: Request, res: Response) => {
        try {
            const { purchaseId } = req.params;
            
            const purchase = await this.purchaseRepository.findOne({
                where: { purchase_id: purchaseId },
                relations: ['product']
            });
            
            if (!purchase) {
                return res.status(404).render('error', {
                    title: 'Purchase Not Found',
                    message: 'The requested purchase could not be found'
                });
            }
            
            res.render('purchases/confirmation', {
                title: 'Order Confirmation',
                purchase
            });
        } catch (error) {
            console.error('Error rendering confirmation page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the confirmation page'
            });
        }
    }

    adminOrdersView = async (req: Request, res: Response) => {
        try {
            const { startDate, endDate, status } = req.query;
            
            const purchaseRepository = AppDataSource.getRepository(Purchase);
            const queryBuilder = purchaseRepository.createQueryBuilder('purchase')
                .leftJoinAndSelect('purchase.buyer', 'buyer')
                .leftJoinAndSelect('purchase.product', 'product')
                .orderBy('purchase.purchase_date', 'DESC');
            
            if (startDate && endDate) {
                queryBuilder.andWhere(
                    'purchase.purchase_date BETWEEN :startDate AND :endDate',
                    { 
                        startDate: new Date(startDate as string), 
                        endDate: new Date(endDate as string) 
                    }
                );
            }
            
            const orders = await queryBuilder.getMany();
            
            const totalRevenue = orders.reduce((sum, order) => {
                return sum + (typeof order.amount === 'number' ? 
                    order.amount : parseFloat(order.amount));
            }, 0);
            
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);
            
            const defaultStartDate = startDate || thirtyDaysAgo.toISOString().split('T')[0];
            const defaultEndDate = endDate || today.toISOString().split('T')[0];
            
            res.render('admin/orders', {
                title: 'Order Management',
                orders,
                filters: {
                    startDate: defaultStartDate,
                    endDate: defaultEndDate,
                    status: status || 'all'
                },
                stats: {
                    totalOrders: orders.length,
                    totalRevenue
                }
            });
        } catch (error) {
            console.error('Error rendering orders page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the orders page'
            });
        }
    }
    
    viewOrderDetails = async (req: Request, res: Response) => {
        try {
            const orderId = req.params.id;
            const purchaseRepository = AppDataSource.getRepository(Purchase);
            
            const order = await purchaseRepository.findOne({
                where: { purchase_id: orderId },
                relations: ['buyer', 'product']
            });
            
            if (!order) {
                return res.status(404).render('error', {
                    title: 'Order Not Found',
                    message: 'The requested order could not be found'
                });
            }
            
            res.render('admin/order-details', {
                title: `Order #${order.purchase_id.substring(0, 8)}`,
                order
            });
        } catch (error) {
            console.error('Error rendering order details page:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the order details'
            });
        }
    }
    
}