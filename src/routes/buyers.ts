import express, { Router } from 'express';
import { BuyerController } from '../controllers/buyerController';
import { isAuthenticated } from '../middleware/auth';


export const buyerRouter: Router = express.Router();
const buyerController = new BuyerController();

buyerRouter.get('/api/buyers', buyerController.getAllBuyers);
buyerRouter.get('/api/buyers/:id', buyerController.getBuyerById);

// buyerRouter.post('/api/buyers/register', (req, res, next) => {buyerController.registerBuyer(req,res, next)});
buyerRouter.post('/api/buyers/login', buyerController.loginBuyer);
buyerRouter.put('/api/buyers/:id', isAuthenticated, buyerController.updateBuyer);
buyerRouter.delete('/api/buyers/:id', isAuthenticated, buyerController.deleteBuyer);
buyerRouter.get('/api/buyers/:id/purchases', isAuthenticated, buyerController.getBuyerPurchases);

buyerRouter.get('/register', buyerController.registerStep1View);
buyerRouter.get('/register/verify', buyerController.registerStep2View);
buyerRouter.post('/api/register/initiate', (req, res, next) => {buyerController.initiateRegistration(req,res, next)});
buyerRouter.post('/api/register/complete', (req, res, next) => {buyerController.completeRegistration(req,res, next)});
buyerRouter.post('/api/register/resend', buyerController.resendVerification);
buyerRouter.get('/login', buyerController.loginView);
