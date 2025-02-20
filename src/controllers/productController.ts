import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Product } from "../entities/Product";
import { PriceHistory } from "../entities/PriceHistory";

export class ProductController { 
    private productRepository = AppDataSource.getRepository(Product);
    private priceHistoryRepository = AppDataSource.getRepository(PriceHistory);


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

            const product = this.productRepository.create({
                name,
                stock_quantity,
                description,
                price
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
    
}