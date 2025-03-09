import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Statistics } from '../entities/Statistics';
import { Purchase } from '../entities/Purchase';
import { Product } from '../entities/Product';
import { Buyer } from '../entities/Buyer';
import { CustomError } from '../utils/errors';

export class StatisticsController {
    private statisticsRepository = AppDataSource.getRepository(Statistics);
    private purchaseRepository = AppDataSource.getRepository(Purchase);
    private productRepository = AppDataSource.getRepository(Product);
    private buyerRepository = AppDataSource.getRepository(Buyer);

    getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const totalProducts = await this.productRepository.count();
            
            const totalBuyers = await this.buyerRepository.count();
            
            const totalRevenueResult = await this.purchaseRepository
                .createQueryBuilder('purchase')
                .select('SUM(purchase.amount)', 'total')
                .getRawOne();
            
            const totalRevenue = totalRevenueResult ? parseFloat(totalRevenueResult.total) || 0 : 0;
            
            const totalPurchases = await this.purchaseRepository.count();
            
            const topSellingProducts = await this.statisticsRepository.find({
                relations: ['product'],
                order: { total_sales: 'DESC' },
                take: 5
            });
            
            const recentPurchases = await this.purchaseRepository.find({
                relations: ['buyer', 'product'],
                order: { purchase_date: 'DESC' },
                take: 10
            });
            
            const lowStockProducts = await this.productRepository.find({
                where: { stock_quantity: 5 }, 
                order: { stock_quantity: 'ASC' },
                take: 10
            });
            
            res.json({
                totalProducts,
                totalBuyers,
                totalRevenue,
                totalPurchases,
                topSellingProducts,
                recentPurchases,
                lowStockProducts
            });
        } catch (error) {
            next(new CustomError('Failed to fetch dashboard statistics', 500));
        }
    }

    getSalesByDate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return next(new CustomError('Start date and end date are required', 400));
            }
            
            const sales = await this.purchaseRepository
                .createQueryBuilder('purchase')
                .select('DATE(purchase.purchase_date)', 'date')
                .addSelect('SUM(purchase.amount)', 'revenue')
                .addSelect('COUNT(purchase.purchase_id)', 'count')
                .where('purchase.purchase_date BETWEEN :startDate AND :endDate', {
                    startDate: new Date(startDate as string),
                    endDate: new Date(endDate as string)
                })
                .groupBy('DATE(purchase.purchase_date)')
                .orderBy('date', 'ASC')
                .getRawMany();
            
            res.json(sales);
        } catch (error) {
            next(error);
        }
    }

    getProductStatistics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            
            const stats = await this.statisticsRepository.findOne({
                where: { product: { product_id: id } },
                relations: ['product']
            });
            
            if (!stats) {
                return next(new CustomError('Statistics not found for this product', 404));
            }
            
            const purchaseHistory = await this.purchaseRepository.find({
                where: { product: { product_id: id } },
                relations: ['buyer'],
                order: { purchase_date: 'DESC' }
            });
            
            res.json({
                ...stats,
                purchaseHistory
            });
        } catch (error) {
            next(error);
        }
    }

    updateStatistics = async () => {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        
        try {
            const products = await this.productRepository.find();
            
            for (const product of products) {
                const purchasesResult = await this.purchaseRepository
                    .createQueryBuilder('purchase')
                    .select('SUM(purchase.amount)', 'totalRevenue')
                    .addSelect('COUNT(purchase.purchase_id)', 'totalSales')
                    .where('purchase.product.product_id = :productId', { productId: product.product_id })
                    .getRawOne();
                
                const totalSales = purchasesResult ? parseInt(purchasesResult.totalSales) || 0 : 0;
                const totalRevenue = purchasesResult ? parseFloat(purchasesResult.totalRevenue) || 0 : 0;
                
                let statistics = await this.statisticsRepository.findOne({
                    where: { product: { product_id: product.product_id } }
                });
                
                if (!statistics) {
                    statistics = this.statisticsRepository.create({
                        product: product,
                        total_sales: 0,
                        total_revenue: 0
                    });
                }
                
                statistics.total_sales = totalSales;
                statistics.total_revenue = totalRevenue;
                
                await queryRunner.manager.save(statistics);
            }
            
            await queryRunner.commitTransaction();
            return true;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error('Error updating statistics:', error);
            return false;
        } finally {
            await queryRunner.release();
        }
    }

    dashboardView = async (req: Request, res: Response) => {
        try {
            const totalProducts = await this.productRepository.count();
            
            const totalBuyers = await this.buyerRepository.count();
            

            const totalRevenueResult = await this.purchaseRepository
                .createQueryBuilder('purchase')
                .select('SUM(purchase.amount)', 'total')
                .getRawOne();
            
            const totalRevenue = totalRevenueResult && totalRevenueResult.total 
                ? parseFloat(totalRevenueResult.total) 
                : 0;
            
            const totalPurchases = await this.purchaseRepository.count();
            
            const topSellingProducts = await this.statisticsRepository.find({
                relations: ['product'],
                order: { total_sales: 'DESC' },
                take: 5
            });
    
            const topSellingProductsFormatted = topSellingProducts.map(stat => {
                if (!stat.total_revenue) {
                    return {
                        ...stat,
                        total_revenue: 0
                    };
                }
                
                let revenue: number;
                if (typeof stat.total_revenue === 'number') {
                    revenue = stat.total_revenue;
                } else {
                    try {
                        revenue = parseFloat(String(stat.total_revenue));
                        if (isNaN(revenue)) revenue = 0;
                    } catch (e) {
                        revenue = 0;
                    }
                }
                
                return {
                    ...stat,
                    total_revenue: revenue
                };
            });
            
            const recentPurchases = await this.purchaseRepository.find({
                relations: ['buyer', 'product'],
                order: { purchase_date: 'DESC' },
                take: 10
            });
            
            const lowStockProducts = await this.productRepository
                .createQueryBuilder('product')
                .where('product.stock_quantity <= :threshold', { threshold: 5 })
                .orderBy('product.stock_quantity', 'ASC')
                .take(10)
                .getMany();
            
            const stats = {
                totalProducts,
                totalBuyers,
                totalRevenue,
                totalPurchases,
                topSellingProducts: topSellingProductsFormatted,
                recentPurchases,
                lowStockProducts
            };
            
            console.log('Dashboard stats:', {
                totalProducts,
                totalBuyers,
                totalRevenue,
                totalPurchases,
                topSellingProductsCount: topSellingProducts.length,
                recentPurchasesCount: recentPurchases.length,
                lowStockProductsCount: lowStockProducts.length
            });
            
            res.render('admin/dashboard', {
                title: 'Admin Dashboard',
                stats  
            });
        } catch (error) {
            console.error('Error rendering dashboard:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the dashboard'
            });
        }
    }
}