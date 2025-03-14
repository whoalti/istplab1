import express, { Router } from 'express';
import { StatisticsController } from '../controllers/statisticsController';
import { isAdmin } from '../middleware/auth';

export const statisticsRouter: Router = express.Router();
const statisticsController = new StatisticsController();

statisticsRouter.get('/api/statistics/dashboard', isAdmin, statisticsController.getDashboardStats);
statisticsRouter.get('/api/statistics/sales', isAdmin, statisticsController.getSalesByDate);
statisticsRouter.get('/api/statistics/products/:id', isAdmin, statisticsController.getProductStatistics);
statisticsRouter.post('/api/statistics/update', isAdmin, statisticsController.updateStatistics);

statisticsRouter.get('/admin/statistics', isAdmin, statisticsController.statisticsView);
statisticsRouter.get('/admin/dashboard', isAdmin, statisticsController.dashboardView);
statisticsRouter.get('/admin/export-products', isAdmin, statisticsController.exportProductsToCSV);