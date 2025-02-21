import express, { Router, Request, Response } from 'express';
import { ProductController } from '../controllers/productController';
import { CategoryController } from '../controllers/categoryController';

export const viewsRouter: Router = express.Router();
const productController = new ProductController();
const categoryController = new CategoryController();

viewsRouter.get('/', async (req: Request, res: Response) => {
    try {
        const products = await productController.getProductsData();

        console.log(products)
        res.render('products/index', {
            title: 'Welcome to MyShop',
            products: products,
            featured: [],
            categories: []
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while loading the page'
        });
    }
});