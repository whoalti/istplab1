import { Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Product } from '../entities/Product';



export const validateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const price = parseFloat(req.body.price);
    const quantity = parseInt(req.body.stock_quantity);

    console.log('Parsed values:', { price, quantity });

    if (isNaN(price) || price < 0) {
      res.status(400).json({ message: 'Price must be a non-negative number' });
      return;
    }
    
    if (isNaN(quantity) || quantity < 0) {
      res.status(400).json({ message: 'Stock quantity must be a non-negative integer' });
      return;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

