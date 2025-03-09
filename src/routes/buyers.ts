import express, { Router } from 'express';
import { BuyerController } from '../controllers/buyerController';
import { isAuthenticated } from '../middleware/auth';


export const buyerRouter: Router = express.Router();
const buyerController = new BuyerController();

buyerRouter.get('/api/buyers', buyerController.getAllBuyers);
buyerRouter.get('/api/buyers/:id', buyerController.getBuyerById);
buyerRouter.post('/api/buyers/register', buyerController.registerBuyer);
buyerRouter.post('/api/buyers/login', buyerController.loginBuyer);
buyerRouter.put('/api/buyers/:id', isAuthenticated, buyerController.updateBuyer);
buyerRouter.delete('/api/buyers/:id', isAuthenticated, buyerController.deleteBuyer);
buyerRouter.get('/api/buyers/:id/purchases', isAuthenticated, buyerController.getBuyerPurchases);

buyerRouter.get('/register', buyerController.registerView);
buyerRouter.get('/login', buyerController.loginView);
buyerRouter.get('/profile', isAuthenticated, buyerController.profileView);