import express, { Router, Request, Response } from 'express';
import { ProductController } from '../controllers/productController';
import { upload } from '../utils/multer';
import { validateProduct } from '../middleware/validateProduct';

export const productRouter: Router = express.Router();
const productController = new ProductController();


productRouter.get('/', productController.getAllProducts);
productRouter.get('/:id', productController.getProductById);
productRouter.post('/', upload.single('image'), productController.createProduct);

productRouter.put('/:id', productController.updateProduct);
productRouter.delete('/:id', productController.deleteProduct);
productRouter.get('/:id/price-history', productController.getProductPriceHistory);

productRouter.get('/search', productController.searchProducts);
productRouter.post('/:productId/categories/:categoryId', productController.addProductToCategory);
productRouter.patch('/:id/image', upload.single('image'), productController.updateProductImage);
productRouter.get('/featured/list', productController.getFeaturedProducts);