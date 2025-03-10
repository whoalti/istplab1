import express, { Router, Request, Response } from 'express';
import { ProductController } from '../controllers/productController';
import { upload } from '../utils/multer';
import { isAdmin, isAuthenticated } from '../middleware/auth';

export const productRouter: Router = express.Router();
const productController = new ProductController();

productRouter.get('/', productController.getAllProducts);
productRouter.get('/search', productController.searchProducts);
productRouter.get('/featured/list', productController.getFeaturedProducts);
productRouter.get('/:id/price-history', productController.getProductPriceHistory);
productRouter.get('/:id', productController.getProductById);

productRouter.post('/', isAdmin, upload.single('image'), productController.createProduct);
productRouter.put('/:id', isAdmin, upload.single('image'), productController.updateProduct);
productRouter.delete('/:id', isAdmin, productController.deleteProduct);
productRouter.post('/:productId/categories/:categoryId', isAdmin, productController.addProductToCategory);
productRouter.patch('/:id/image', isAdmin, upload.single('image'), productController.updateProductImage);