import dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from "../config/database";
import { ProductCategory } from "../entities/ProductCategory";
import { Product } from "../entities/Product";
import { Statistics } from "../entities/Statistics";


async function seedProductsAndCategories() {
    try {
        await AppDataSource.initialize();
        console.log("Database connection established");

        const categoryRepository = AppDataSource.getRepository(ProductCategory);
        const productRepository = AppDataSource.getRepository(Product);
        const statisticsRepository = AppDataSource.getRepository(Statistics);

        const categories = [
            { name: "Electronics", description: "Electronic devices and accessories" },
            { name: "Books", description: "Physical and digital books" },
            { name: "Clothing", description: "Men's and women's apparel" },
            { name: "Home & Garden", description: "Home decoration and garden tools" }
        ];

        const savedCategories: ProductCategory[] = [];
        
        for (const categoryData of categories) {
            const existingCategory = await categoryRepository.findOne({
                where: { name: categoryData.name }
            });

            if (!existingCategory) {
                const category = categoryRepository.create(categoryData);
                const savedCategory = await categoryRepository.save(category);
                savedCategories.push(savedCategory);
                console.log(`Category created: ${category.name}`);
            } else {
                savedCategories.push(existingCategory);
                console.log(`Category already exists: ${existingCategory.name}`);
            }
        }

        const products = [
            {
                name: "Laptop Pro X",
                description: "High-performance laptop for professionals",
                price: 1299.99,
                stock_quantity: 50,
                categoryIndex: 0 
            },
            {
                name: "Wireless Earbuds",
                description: "Premium wireless earbuds with noise cancellation",
                price: 199.99,
                stock_quantity: 100,
                categoryIndex: 0 
            },
            {
                name: "Programming Basics",
                description: "Learn programming fundamentals",
                price: 29.99,
                stock_quantity: 200,
                categoryIndex: 1
            },
            {
                name: "Winter Jacket",
                description: "Warm and stylish winter jacket",
                price: 89.99,
                stock_quantity: 75,
                categoryIndex: 2 
            },
            {
                name: "Garden Tool Set",
                description: "Complete set of essential garden tools",
                price: 49.99,
                stock_quantity: 30,
                categoryIndex: 3
            }
        ];

        for (const productData of products) {
            const existingProduct = await productRepository.findOne({
                where: { name: productData.name }
            });

            if (!existingProduct) {
                const product = productRepository.create({
                    name: productData.name,
                    description: productData.description,
                    price: productData.price,
                    stock_quantity: productData.stock_quantity,
                    categories: [savedCategories[productData.categoryIndex]]
                });

                const savedProduct = await productRepository.save(product);

                const statistics = statisticsRepository.create({
                    product: savedProduct,
                    total_sales: 0,
                    total_revenue: 0
                });

                await statisticsRepository.save(statistics);
                console.log(`Product created: ${product.name}`);
            } else {
                console.log(`Product already exists: ${existingProduct.name}`);
            }
        }

        console.log("Products and categories seed completed successfully");
    } catch (error) {
        console.error("Error during seeding products and categories:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

seedProductsAndCategories().then(() => {
    console.log("Products and categories seeding process finished");
    process.exit(0);
}).catch(error => {
    console.error("Fatal error during seeding:", error);
    process.exit(1);
});