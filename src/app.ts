import dotenv from 'dotenv';
dotenv.config(); 

import 'reflect-metadata';
import express from 'express';
import { AppDataSource } from './config/database';
import { productRouter } from './routes/products';
import { categoryRouter } from './routes/categories';
import path from 'path';
import expressEjsLayouts from 'express-ejs-layouts';
import { ProductController } from './controllers/productController';
import { CategoryController } from './controllers/categoryController';
import { Like, Between } from 'typeorm';
import { CustomError } from './utils/errors';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressEjsLayouts);
app.set('layout', 'layouts/main');

const projectRoot = path.resolve(__dirname, '..');
const publicFolder = path.join(projectRoot, 'src', 'public');
console.log(`Serving static files from: ${publicFolder}`);
app.use('/public', express.static(publicFolder));

app.use('/api/products', productRouter);
app.use('/api/categories', categoryRouter);

app.get('/health', (req, res) => {
    res.json({status: 'ok'});
});

app.get('/', async (req, res) => {
    try {
        const productController = new ProductController();
        const products = await productController.getAllProductsForView();
        const featured = await productController.getFeaturedProductsForView();
        
        res.render('products/index', {
            title: 'Welcome to MyShop',
            products,
            featured
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred'
        });
    }
});

app.get('/categories', async (req, res) => {
    try {
        const categoryController = new CategoryController();
        const categories = await categoryController.getAllCategoriesForView(req, res);
        
        res.render('categories/index', {
            title: 'Product Categories',
            categories
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while fetching categories'
        });
    }
});

app.get('/categories/:id', async (req, res) => {
    try {
        const categoryController = new CategoryController();
        const category = await categoryController.getCategoryForView(req, res);
        
        if (!category) {
            return res.status(404).render('error', {
                title: 'Category Not Found',
                message: 'The requested category could not be found'
            });
        }
        
        res.render('categories/show', {
            title: category.name,
            category,
            products: category.products || []
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while fetching the category'
        });
    }
});


app.get('/products', async (req, res) => {
    try {
        const productController = new ProductController();
        const products = await productController.getAllProductsForView();
        const featured = await productController.getFeaturedProductsForView();
        
        res.render('products/index', {
            title: 'All Products',
            products,
            featured
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while fetching products'
        });
    }
});

app.get('/products/new', async (req, res) => {
    try {
        const categoryController = new CategoryController();
        const categories = await categoryController.getAllCategoriesForView(req, res);
        
        res.render('products/form', {
            title: 'Add New Product',
            product: null,
            categories
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred'
        });
    }
});

app.get('/products/:id/edit', async (req, res) => {
    try {
        const productController = new ProductController();
        const categoryController = new CategoryController();
        
        const product = await productController.getProductByIdForView(req.params.id);
        
        if (!product) {
            return res.status(404).render('error', {
                title: 'Product Not Found',
                message: 'The requested product could not be found'
            });
        }
        
        const categories = await categoryController.getAllCategoriesForView(req, res);
        
        res.render('products/form', {
            title: `Edit ${product.name}`,
            product,
            categories
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred'
        });
    }
});

app.get('/products/:id', async (req, res) => {
    try {
        const productController = new ProductController();
        const product = await productController.getProductByIdForView(req.params.id);
        
        if (!product) {
            return res.status(404).render('error', {
                title: 'Product Not Found',
                message: 'The requested product could not be found'
            });
        }
        
        const priceHistory = await productController.getProductPriceHistoryForView(req.params.id);
        
        res.render('products/show', {
            title: product.name,
            product,
            priceHistory
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while fetching the product'
        });
    }
});

app.get('/search', async (req, res) => {
    try {
        const productController = new ProductController();
        const categoryController = new CategoryController();
        
        const query = req.query.query as string || '';
        const category = req.query.category as string || '';
        const minPrice = req.query.minPrice as string || '';
        const maxPrice = req.query.maxPrice as string || '';
        
        const products = await productController.searchProductsForView(
            query, 
            category, 
            minPrice, 
            maxPrice
        );
        
        const categories = await categoryController.getAllCategoriesForView(req, res);
        
        res.render('search/results', {
            title: 'Search Results',
            products,
            categories,
            query,
            selectedCategory: category,
            minPrice,
            maxPrice
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while searching products'
        });
    }
});

app.get('/featured', async (req, res) => {
    try {
        const productController = new ProductController();
        const featuredProducts = await productController.getFeaturedProductsForView();
        
        res.render('products/featured', {
            title: 'Featured Products',
            products: featuredProducts
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while fetching featured products'
        });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const productController = new ProductController();
        await productController.createProduct(req, res);
        // The controller handles the response
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while creating the product'
        });
    }
});


app.post('/products/:id', async (req, res) => {
    try {
        const productController = new ProductController();
        await productController.updateProduct(req, res);
        res.redirect(`/products/${req.params.id}`);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An error occurred while updating the product'
        });
    }
});

app.get('/test-categories', async (req, res) => {
    try {
        const categories = await AppDataSource.query('SELECT * FROM product_category');
        

        for (const category of categories) {
            const products = await AppDataSource.query(
                'SELECT COUNT(*) as count FROM product_category_relation WHERE category_id = $1',
                [category.category_id]
            );
            category.product_count = products[0]?.count || 0;
        }
        
        res.json({
            message: 'Categories test route',
            count: categories.length,
            categories: categories
        });
    } catch (error : unknown) {
        console.error('Error in test-categories route:', error);
        res.status(500).json({
            message: 'Error fetching categories',
            error: error instanceof CustomError ? error.message : error
        });
    }
});


app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist'
    });
});


app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred';
    
    res.status(statusCode).render('error', {
        title: 'Error',
        message
    });
});

const startServer = async () => {
    try {
        console.log('Connecting with user:', process.env.DB_USER);
        await AppDataSource.initialize();
        console.log('Database connection has been established successfully.');

        app.listen(port, () => {
            console.log(`Server is on port ${port}`);
        });
    } catch (error) {
        console.error('Error during app startup:', error);
        process.exit(1);
    }
};

startServer()