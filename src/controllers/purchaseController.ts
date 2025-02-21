import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Purchase } from '../entities/Purchase';
import { Product } from '../entities/Product';
import { Statistics } from '../entities/Statistics';
import { CustomError } from '../utils/errors';

export class PurchaseController {
    private purchaseRepository = AppDataSource.getRepository(Purchase);
    private productRepository = AppDataSource.getRepository(Product);
    private statisticsRepository = AppDataSource.getRepository(Statistics);

    createPurchase = async (req: Request, res: Response, next: NextFunction) => {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { productId, amount } = req.body;
            const buyerId = req?.user?.buyer_id; 

            const product = await this.productRepository.findOne({
                where: { product_id: productId }
            });

            if (!product) {
                throw new CustomError('Product not found', 404);
            }

            if (product.stock_quantity < 1) {
                throw new CustomError('Product out of stock', 400);
            }


            const purchase = this.purchaseRepository.create({
                amount,
                buyer: { buyer_id: buyerId },
                product: { product_id: productId }
            });


            product.stock_quantity -= 1;

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

            statistics.total_sales += 1;
            statistics.total_revenue += amount;

            // Save all changes
            await queryRunner.manager.save(product);
            await queryRunner.manager.save(purchase);
            await queryRunner.manager.save(statistics);

            await queryRunner.commitTransaction();

            res.status(201).json(purchase);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            next(error);
        } finally {
            await queryRunner.release();
        }
    };

    getUserPurchases = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const buyerId = req.user.buyer_id;

            const purchases = await this.purchaseRepository.find({
                where: { buyer: { buyer_id: buyerId } },
                relations: ['product'],
                order: { purchase_date: 'DESC' }
            });

            res.json(purchases);
        } catch (error) {
            next(error);
        }
    };

    getPurchaseById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const purchase = await this.purchaseRepository.findOne({
                where: { 
                    purchase_id: req.params.id,
                    buyer: { buyer_id: req.user.buyer_id }
                },
                relations: ['product']
            });

            if (!purchase) {
                throw new CustomError('Purchase not found', 404);
            }

            res.json(purchase);
        } catch (error) {
            next(error);
        }
    };

    getPurchaseStatistics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const buyerId = req.user.buyer_id;

            const purchases = await this.purchaseRepository.find({
                where: { buyer: { buyer_id: buyerId } }
            });

            const totalSpent = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
            const purchaseCount = purchases.length;

            res.json({
                totalSpent,
                purchaseCount,
                averageSpent: purchaseCount > 0 ? totalSpent / purchaseCount : 0
            });
        } catch (error) {
            next(error);
        }
    };
}