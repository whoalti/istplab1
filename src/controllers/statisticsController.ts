import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Statistics } from '../entities/Statistics';
import { Purchase } from '../entities/Purchase';
import { Product } from '../entities/Product';
import { Buyer } from '../entities/Buyer';
import { CustomError } from '../utils/errors';
import { ProductCategory } from '../entities/ProductCategory';
import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

export class StatisticsController {
    private statisticsRepository = AppDataSource.getRepository(Statistics);
    private purchaseRepository = AppDataSource.getRepository(Purchase);
    private productRepository = AppDataSource.getRepository(Product);
    private buyerRepository = AppDataSource.getRepository(Buyer);
    private categoryRepository = AppDataSource.getRepository(ProductCategory);

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

    // New method for statistics page
    // New method for statistics page
    statisticsView = async (req: Request, res: Response) => {
        try {
            // Get sales data for the last 7 days
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 6); // Last 7 days
            
            const salesData = await this.purchaseRepository
                .createQueryBuilder('purchase')
                .select('DATE(purchase.purchase_date)', 'date')
                .addSelect('SUM(purchase.amount)', 'revenue')
                .where('purchase.purchase_date BETWEEN :startDate AND :endDate', {
                    startDate,
                    endDate
                })
                .groupBy('DATE(purchase.purchase_date)')
                .orderBy('date', 'ASC')
                .getRawMany();
            
            // Format sales data for chart
            const formattedSalesData = {
                labels: salesData.map(item => new Date(item.date).toLocaleDateString()),
                values: salesData.map(item => parseFloat(item.revenue))
            };
            
            // Fill in missing days with zero values
            const daysDiff = 7;
            if (formattedSalesData.labels.length < daysDiff) {
                const currentLabels = new Set(formattedSalesData.labels);
                const allDates = [];
                const allValues = [];
                
                for (let i = 0; i < daysDiff; i++) {
                    const date = new Date(startDate);
                    date.setDate(date.getDate() + i);
                    const dateString = date.toLocaleDateString();
                    allDates.push(dateString);
                    
                    if (currentLabels.has(dateString)) {
                        const index = formattedSalesData.labels.indexOf(dateString);
                        allValues.push(formattedSalesData.values[index]);
                    } else {
                        allValues.push(0);
                    }
                }
                
                formattedSalesData.labels = allDates;
                formattedSalesData.values = allValues;
            }
            
            // Get all categories
            const categories = await this.categoryRepository.find();
            
            // Get category distribution data - direct SQL approach to be safer
            const categorySummary = [];
            
            for (const category of categories) {
                // For each category, get product count using raw SQL query
                const productCountResult = await AppDataSource.query(
                    'SELECT COUNT(*) as count FROM "PRODUCT_CATEGORY_RELATION" WHERE "category_id" = $1',
                    [category.category_id]
                );
                const productCount = parseInt(productCountResult[0]?.count || '0');
                
                // Get products for this category using a raw SQL query
                const products = await AppDataSource.query(
                    'SELECT p.* FROM "product" p ' +
                    'JOIN "PRODUCT_CATEGORY_RELATION" pcr ON p.product_id = pcr.product_id ' +
                    'WHERE pcr.category_id = $1',
                    [category.category_id]
                );
                
                const totalStock = products.reduce((sum:number, product : Product)  => sum + product.stock_quantity, 0);
                const totalPrice = products.reduce((sum: number, product : Product) => {
                    const price = typeof product.price === 'number' ? 
                        product.price : parseFloat(product.price);
                    return sum + price;
                }, 0);
                const averagePrice = productCount > 0 ? totalPrice / productCount : 0;
                
                categorySummary.push({
                    name: category.name,
                    productCount,
                    totalStock,
                    averagePrice
                });
            }
            
            // Format category data for chart - using raw SQL for safety
            const categoryProductCounts = await Promise.all(categories.map(async category => {
                const result = await AppDataSource.query(
                    'SELECT COUNT(*) as count FROM "PRODUCT_CATEGORY_RELATION" WHERE "category_id" = $1',
                    [category.category_id]
                );
                return parseInt(result[0]?.count || '0');
            }));
            
            const formattedCategoryData = {
                labels: categories.map(category => category.name),
                values: categoryProductCounts
            };
            
            res.render('admin/statistics', {
                title: 'Store Statistics',
                salesData: formattedSalesData,
                categoryData: formattedCategoryData,
                categorySummary
            });
        } catch (error) {
            console.error('Error rendering statistics:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while loading the statistics'
            });
        }
    }

    // New method for exporting products to CSV
    exportProductsToCSV = async (req: Request, res: Response) => {
        try {
            const products = await this.productRepository.find({
                relations: ['categories']
            });
            
            // Create a directory for exports if it doesn't exist
            const exportDir = path.join(process.cwd(), 'exports');
            if (!fs.existsSync(exportDir)) {
                fs.mkdirSync(exportDir, { recursive: true });
            }
            
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const filePath = path.join(exportDir, `products_${timestamp}.csv`);
            
            const csvWriter = createObjectCsvWriter({
                path: filePath,
                header: [
                    { id: 'product_id', title: 'ID' },
                    { id: 'name', title: 'Name' },
                    { id: 'description', title: 'Description' },
                    { id: 'price', title: 'Price' },
                    { id: 'stock_quantity', title: 'Stock' },
                    { id: 'categories', title: 'Categories' },
                    { id: 'created_at', title: 'Created At' },
                    { id: 'updated_at', title: 'Updated At' }
                ]
            });
            
            const records = products.map(product => ({
                product_id: product.product_id,
                name: product.name,
                description: product.description || '',
                price: product.price,
                stock_quantity: product.stock_quantity,
                categories: product.categories ? product.categories.map(c => c.name).join(', ') : '',
                created_at: product.created_at.toISOString(),
                updated_at: product.updated_at.toISOString()
            }));
            
            await csvWriter.writeRecords(records);
            
            // Set headers for file download
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=products_${timestamp}.csv`);
            
            // Send the file
            res.download(filePath, `products_${timestamp}.csv`, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                } else {
                    // Optionally clean up the file after sending
                    fs.unlinkSync(filePath);
                }
            });
        } catch (error) {
            console.error('Error exporting products to CSV:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while exporting products to CSV'
            });
        }
    }
}