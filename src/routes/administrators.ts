import express, { Router } from 'express';
import { AdministratorController } from '../controllers/administratorController';
import { isAdmin } from '../middleware/auth';

export const adminRouter: Router = express.Router();
const adminController = new AdministratorController();

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