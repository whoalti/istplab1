import express, { Router } from 'express';
import { AdministratorController } from '../controllers/administratorController';
import { isAdmin } from '../middleware/auth';
import { PurchaseController } from '../controllers/purchaseController';

export const adminRouter: Router = express.Router();
const adminController = new AdministratorController();
const purchaseController = new PurchaseController();


adminRouter.get('/api/admins', isAdmin, (req, res, next) => {
    adminController.getAllAdmins(req, res, next);
});
adminRouter.get('/api/admins/:id', isAdmin, (req, res, next) => {
    adminController.getAdminById(req, res, next);
});
adminRouter.post('/api/admins', isAdmin, (req, res, next) => {
    adminController.createAdmin(req, res, next);
});
adminRouter.post('/api/admins/login', (req, res, next) => {
    adminController.loginAdmin(req, res, next);
});
adminRouter.put('/api/admins/:id', isAdmin, (req, res, next) => {
    adminController.updateAdmin(req, res, next);
});
adminRouter.delete('/api/admins/:id', isAdmin, (req, res, next) => {
    adminController.deleteAdmin(req, res, next);
});

adminRouter.get('/admin/login', (req, res) => {
    adminController.loginView(req, res);
});
adminRouter.get('/admin/dashboard', isAdmin, (req, res) => {
    adminController.dashboardView(req, res);
});

adminRouter.get('/admin/customers', isAdmin, (req, res) => {
    adminController.viewAllCustomers(req, res);
});

adminRouter.get('/admin/customers/:id', isAdmin, (req, res) => {
    adminController.viewCustomerDetails(req, res);
});

adminRouter.get('/admin/orders', isAdmin, (req, res) => {
    purchaseController.adminOrdersView(req, res);
});

adminRouter.get('/admin/orders/:id', isAdmin, (req, res) => {
    purchaseController.viewOrderDetails(req, res);
});