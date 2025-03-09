import express, { Router } from 'express';
import { PurchaseController } from '../controllers/purchaseController';
import { isAuthenticated, isAdmin } from '../middleware/auth';

export const purchaseRouter: Router = express.Router();
const purchaseController = new PurchaseController();

purchaseRouter.get('/api/purchases', isAdmin, purchaseController.getAllPurchases);
purchaseRouter.get('/api/purchases/filter', isAdmin, purchaseController.getFilteredPurchases);
purchaseRouter.get('/api/purchases/:id', isAuthenticated, purchaseController.getPurchaseById);
purchaseRouter.post('/api/purchases', isAuthenticated, purchaseController.createPurchase);
purchaseRouter.get('/api/user/purchases', isAuthenticated, purchaseController.getUserPurchases);
purchaseRouter.get('/api/user/purchases/statistics', isAuthenticated, purchaseController.getPurchaseStatistics);

purchaseRouter.get('/checkout/:productId', isAuthenticated, purchaseController.checkoutView);
purchaseRouter.get('/orders/confirmation/:purchaseId', isAuthenticated, purchaseController.confirmationView);