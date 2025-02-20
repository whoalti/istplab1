import express, { Router, Request, Response } from 'express';
import { ProductController } from '../controllers/productController';

export const productRouter: Router = express.Router();
const productController = new ProductController();


productRouter.get('/', productController.getAllProducts);

productRouter.get('/:id', productController.getProductById);

productRouter.post('/', productController.createProduct);

productRouter.put('/:id', productController.updateProduct);

productRouter.delete('/:id', productController.deleteProduct);

productRouter.get('/:id/price-history', productController.getProductPriceHistory);
