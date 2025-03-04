import express, { Router } from 'express';
import { CategoryController } from '../controllers/categoryController';
import { AppDataSource } from '../config/database';
import { ProductCategory } from '../entities/ProductCategory';

export const categoryRouter: Router = express.Router();
const categoryController = new CategoryController();

categoryRouter.get('/api/categories', categoryController.getAllCategories);
categoryRouter.get('/api/categories/:id', categoryController.getCategoryById);
categoryRouter.post('/api/categories', categoryController.createCategory);
categoryRouter.put('/api/categories/:id', categoryController.updateCategory);
categoryRouter.delete('/api/categories/:id', categoryController.deleteCategory);

categoryRouter.get('/categories', async (req, res) => {
    try {
        const categories = await AppDataSource.getRepository(ProductCategory).find();
        
        console.log(`Retrieved ${categories.length} categories from database`);
        
        res.render('categories/index', {
            title: 'Product Categories',
            categories
        });
    } catch (error) {
        console.error('Error in categories route:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while fetching categories'
        });
    }
});

categoryRouter.get('/categories/:id', async (req, res) => {
    try {
        const category = await AppDataSource.getRepository(ProductCategory).findOne({
            where: { category_id: req.params.id }
        });
        
        if (!category) {
            return res.status(404).render('error', {
                title: 'Category Not Found',
                message: 'The requested category could not be found'
            });
        }
        
        const productsQuery = `
            SELECT product.* 
            FROM product
            INNER JOIN product_category_relation ON product.product_id = product_category_relation.product_id
            WHERE product_category_relation.category_id = $1
        `;
        
        const products = await AppDataSource.query(productsQuery, [category.category_id]);
        
        res.render('categories/show', {
            title: category.name,
            category,
            products
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while fetching the category'
        });
    }
});