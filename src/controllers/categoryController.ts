import { NextFunction, Response, Request } from "express";
import { AppDataSource } from "../config/database";
import { ProductCategory } from "../entities/ProductCategory";
import { CustomError } from "../utils/errors";



export class CategoryController {
    private categoryRepository = AppDataSource.getRepository(ProductCategory);

    getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const categories = await this.categoryRepository.find({
                relations: ['products']
            });
            res.json(categories);
        } catch (error) {
            next(new CustomError('Failed to fetch categories', 500))
        }
    }

    getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const category = await this.categoryRepository.findOne({
                where: {category_id: req.params.id},
                relations: ['products']
            });
            if (!category) {
                next(new CustomError('Category not found', 404))
            }
            res.json(category);
        } catch (error) {
            next(new CustomError('Failed to fetch category', 500))
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
}