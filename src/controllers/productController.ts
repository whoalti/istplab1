import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Product } from "../entities/Product";
import { PriceHistory } from "../entities/PriceHistory";
import { Between, Like } from "typeorm";
import { Statistics } from "../entities/Statistics";
import { ProductCategory } from "../entities/ProductCategory";

export class ProductController { 
    private productRepository = AppDataSource.getRepository(Product);
    private priceHistoryRepository = AppDataSource.getRepository(PriceHistory);
    private categoryRepository = AppDataSource.getRepository(ProductCategory);
    private statisticsRepository = AppDataSource.getRepository(Statistics);


    getAllProducts = async (req: Request, res: Response) => {
        try {
            const products = await this.productRepository.find({relations: ['categories']});
            res.json(products);
        } catch (error) {
            res.status(500).json({message: 'Error fetching products', error});
        }
    }

    getProductById = async (req: Request, res: Response) : Promise<any> => {
        try {
            const product = await this.productRepository.findOne({
                where: { product_id: req.params.id },
                relations: ['categories']
            });
    
            if (!product) {
                return res.status(404).json({ message: "Product not found" });
            }
    
            res.json(product);
        } catch (error) {
            res.status(500).json({ message: "Error fetching product", error });
        }
    };

    createProduct = async (req: Request, res: Response) : Promise<any> => {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { name, stock_quantity, description, price } = req.body;

            if (!price) {
                return res.status(400).json({ message: "Price is required" });
            }
            const image_path = req?.file?.path;

            const product = this.productRepository.create({
                name,
                stock_quantity,
                description,
                price,
                image_path
            });

            const savedProduct = await queryRunner.manager.save(product);

            const priceHistory = this.priceHistoryRepository.create({
                price,
                product: savedProduct
            });

            await queryRunner.manager.save(priceHistory);

            await queryRunner.commitTransaction();

            res.status(201).json(savedProduct);

        } catch (error) {
            await queryRunner.rollbackTransaction();
            res.status(500).json({ message: "Error creating product", error });
        } finally {
            await queryRunner.release();
        }
    };

    updateProduct = async (req: Request, res: Response) : Promise<any>=> {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const product = await this.productRepository.findOne({
                where: { product_id: req.params.id }
            });

            if (!product) {
                return res.status(404).json({ message: "Product not found" });
            }

            const oldPrice = product.price;
            
            this.productRepository.merge(product, req.body);
            const updatedProduct = await queryRunner.manager.save(product);

            if (req.body.price && req.body.price !== oldPrice) {
                const priceHistory = this.priceHistoryRepository.create({
                    price: req.body.price,
                    product: updatedProduct
                });
                await queryRunner.manager.save(priceHistory);
            }

            await queryRunner.commitTransaction();
            res.json(updatedProduct);

        } catch (error) {
            await queryRunner.rollbackTransaction();
            res.status(500).json({ message: "Error updating product", error });
        } finally {
            await queryRunner.release();
        }
    };


    searchProducts = async (req: Request, res: Response): Promise<any> => {
        try {
            const { query, category, minPrice, maxPrice } = req.query;
            
            const whereClause: any = {};
            
            if (query) {
                whereClause.name = Like(`%${query}%`);
            }
            
            if (minPrice || maxPrice) {
                whereClause.price = Between(
                    parseFloat(minPrice as string) || 0,
                    parseFloat(maxPrice as string) || 999999
                );
            }

            const products = await this.productRepository.find({
                where: whereClause,
                relations: ['categories'],
                ...(category && {
                    join: {
                        alias: "product",
                        innerJoin: {
                            categories: "product.categories"
                        }
                    },
                    where: (qb: any) => {
                        qb.where(whereClause)
                          .andWhere("categories.category_id = :categoryId", { categoryId: category });
                    }
                })
            });

            res.json(products);
        } catch (error) {
            res.status(500).json({ message: "Error searching products", error });
        }
    };

    addProductToCategory = async (req: Request, res: Response): Promise<any> => {
        try {
            const { productId, categoryId } = req.params;
            
            const product = await this.productRepository.findOne({
                where: { product_id: productId },
                relations: ['categories']
            });
            
            const category = await this.categoryRepository.findOne({
                where: { category_id: categoryId }
            });

            if (!product || !category) {
                return res.status(404).json({ message: "Product or category not found" });
            }

            product.categories = [...product.categories, category];
            await this.productRepository.save(product);

            res.json(product);
        } catch (error) {
            res.status(500).json({ message: "Error adding product to category", error });
        }
    };

    updateProductImage = async (req: Request, res: Response): Promise<any> => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: "No image file provided" });
            }

            const product = await this.productRepository.findOne({
                where: { product_id: req.params.id }
            });

            if (!product) {
                return res.status(404).json({ message: "Product not found" });
            }

            product.image_path = req.file.path;
            const updatedProduct = await this.productRepository.save(product);

            res.json(updatedProduct);
        } catch (error) {
            res.status(500).json({ message: "Error updating product image", error });
        }
    };

    getProductStatistics = async (req: Request, res: Response): Promise<any> => {
        try {
            const stats = await this.statisticsRepository.findOne({
                where: { product: { product_id: req.params.id } },
                relations: ['product']
            });

            if (!stats) {
                return res.status(404).json({ message: "Statistics not found for this product" });
            }

            res.json(stats);
        } catch (error) {
            res.status(500).json({ message: "Error fetching product statistics", error });
        }
    };

    getFeaturedProducts = async (req: Request, res: Response): Promise<any> => {
        try {
            const featuredProducts = await this.productRepository
                .createQueryBuilder("product")
                .leftJoinAndSelect("product.statistics", "stats")
                .orderBy("stats.total_sales", "DESC")
                .take(5)
                .getMany();

            res.json(featuredProducts);
        } catch (error) {
            res.status(500).json({ message: "Error fetching featured products", error });
        }
    };

    getProductPriceHistory = async (req: Request, res: Response) : Promise<any> => {
        try {
            const product = await this.productRepository.findOne({
                where: { product_id: req.params.id },
                relations: ['priceHistory']
            });

            if (!product) {
                return res.status(404).json({ message: "Product not found" });
            }

            const sortedPriceHistory = product.priceHistory.sort((a, b) => 
                b.updated_at.getTime() - a.updated_at.getTime()
            );

            res.json({
                product_id: product.product_id,
                name: product.name,
                currentPrice: product.price,
                priceHistory: sortedPriceHistory
            });
        } catch (error) {
            res.status(500).json({ message: "Error fetching price history", error });
        }
    };

    deleteProduct = async (req: Request, res: Response): Promise<any> => {
        try {
            const result = await this.productRepository.delete(req.params.id);
            
            if (result.affected === 0) {
                return res.status(404).json({ message: "Product not found" });
            }

            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: "Error deleting product", error });
        }
    };
    getProductsData = async () => {
        try {
            return await this.productRepository.find({relations: ['categories']});
        } catch (error) {
            throw error;
        }
    }

    getAllProductsForView = async (): Promise<Product[]> => {
        try {
            return await this.productRepository.find({
                relations: ['categories']
            });
        } catch (error) {
            console.error('Error fetching products for view:', error);
            return [];
        }
    }
    
    getProductByIdForView = async (id: string): Promise<Product | null> => {
        try {
            return await this.productRepository.findOne({
                where: { product_id: id },
                relations: ['categories']
            });
        } catch (error) {
            console.error('Error fetching product for view:', error);
            return null;
        }
    }
    
    getFeaturedProductsForView = async (): Promise<Product[]> => {
        try {
            return await this.productRepository
                .createQueryBuilder("product")
                .leftJoinAndSelect("product.categories", "categories")
                .leftJoinAndSelect("product.statistics", "stats")
                .orderBy("stats.total_sales", "DESC")
                .take(5)
                .getMany();
        } catch (error) {
            console.error('Error fetching featured products for view:', error);
            return [];
        }
    }
    
    getProductPriceHistoryForView = async (id: string): Promise<PriceHistory[]> => {
        try {
            const product = await this.productRepository.findOne({
                where: { product_id: id },
                relations: ['priceHistory']
            });
    
            if (!product) {
                return [];
            }
    
            const priceHistory = product.priceHistory.map(item => {
                if (typeof item.price === 'string') {
                    item.price = parseFloat(item.price);
                }
                return item;
            });
    
            return priceHistory.sort((a, b) => 
                b.updated_at.getTime() - a.updated_at.getTime()
            );
        } catch (error) {
            console.error('Error fetching price history for view:', error);
            return [];
        }
    }
    
    searchProductsForView = async (
        query?: string, 
        categoryId?: string, 
        minPrice?: string, 
        maxPrice?: string
    ): Promise<Product[]> => {
        try {
            const whereClause: any = {};
            
            if (query) {
                whereClause.name = Like(`%${query}%`);
            }
            
            if (minPrice || maxPrice) {
                whereClause.price = Between(
                    parseFloat(minPrice || '0'),
                    parseFloat(maxPrice || '999999')
                );
            }
    
            return await this.productRepository.find({
                where: whereClause,
                relations: ['categories'],
                ...(categoryId && {
                    join: {
                        alias: "product",
                        innerJoin: {
                            categories: "product.categories"
                        }
                    },
                    where: (qb: any) => {
                        qb.where(whereClause)
                          .andWhere("categories.category_id = :categoryId", { categoryId });
                    }
                })
            });
        } catch (error) {
            console.error('Error searching products for view:', error);
            return [];
        }
    }
}