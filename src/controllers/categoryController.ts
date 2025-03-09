import { NextFunction, Response, Request } from "express";
import { AppDataSource } from "../config/database";
import { ProductCategory } from "../entities/ProductCategory";
import { CustomError } from "../utils/errors";
import { Product } from "../entities/Product";

export class CategoryController {
    private categoryRepository = AppDataSource.getRepository(ProductCategory);

    getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
        try {

            const categories = await this.categoryRepository.find();
            res.json(categories);
        } catch (error) {
            next(new CustomError('Failed to fetch categories', 500));
        }
    }

    getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const category = await this.categoryRepository.findOne({
                where: {category_id: req.params.id}
            });
            if (!category) {
                return next(new CustomError('Category not found', 404));
            }
            res.json(category);
        } catch (error) {
            next(new CustomError('Failed to fetch category', 500));
        }
    }

    createCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {name, description} = req.body;
            
            const existingCategory = await this.categoryRepository.findOne({where : {name}});
            if (existingCategory) {
                next(new CustomError('Category already exists', 400))
            }
            const category = this.categoryRepository.create({
                name, description
            })
            const savedCategory = await this.categoryRepository.save(category);
            res.status(201).json(savedCategory);
        } catch (error) {
            next(error);
        }
    }

    updateCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {name, description} = req.body;

            const category = await this.categoryRepository.findOne({where: {category_id: req.params.id}});
            if (!category) {
                throw new CustomError('Category not found', 404);
            }

            if (name && name !== category.name) {
                const existingCategory = await this.categoryRepository.findOne({where: {name}});
                if (existingCategory) {
                    throw new CustomError('Category with this name already exists', 400);
                }
            }

            category.name = name || category.name;
            category.description = description || category.description;
            const updatedCategory = await this.categoryRepository.save(category);
            res.json(updatedCategory);

        } catch (error) {
            next(error);
        }
    }

    deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const category = await this.categoryRepository.findOne({
                where: { category_id: req.params.id },
                relations: ['products']
            });

            if (!category) {
                throw new CustomError('Category not found', 404);
            }

            if (category.products && category.products.length > 0) {
                throw new CustomError('Cannot delete category with associated products', 400);
            }

            await this.categoryRepository.remove(category);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    getProductsByCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const category = await this.categoryRepository.findOne({
                where : {category_id: req.params.id},
                relations: ['products']
            });

            if (!category) {
                throw new CustomError('Category not found', 404);
            }

            res.json(category.products);
        } catch (error) {
            next(error);
        }
    }

    getAllCategoriesForView = async (req: Request, res: Response): Promise<ProductCategory[]> => {
        try {
            const categories = await this.categoryRepository.find();
            console.log('Found categories:', categories.length);
            return categories;
        } catch (error) {
            console.error('Error fetching categories for view:', error);
            return [];
        }
    }

    getCategoryForView = async (req: Request, res: Response): Promise<ProductCategory | null> => {
        try {
            const category = await this.categoryRepository.findOne({
                where: { category_id: req.params.id }
            });
            
            if (!category) {
                return null;
            }
            
            const productsQuery = AppDataSource.getRepository(Product)
                .createQueryBuilder('product')
                .innerJoin('product.categories', 'category')
                .where('category.category_id = :categoryId', { categoryId: req.params.id });
                
            const products = await productsQuery.getMany();
            
            category.products = products;
            
            return category;
        } catch (error) {
            console.error('Error fetching category for view:', error);
            return null;
        }
    }
}