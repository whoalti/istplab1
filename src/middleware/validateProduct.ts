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

// exp
// 
// 
// ort const validateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   try {
//     console.log('Middleware validation');
//     const productInstance = plainToClass(Product, req.body);
    

//     const errors = await validate(productInstance, {
//       skipMissingProperties: true,
//       whitelist: true,
//       forbidNonWhitelisted: false
//     });
    
//     if (errors.length > 0) {

//       const formattedErrors = errors.map(error => {
//         return {
//           property: error.property,
//           constraints: error.constraints
//         };
//       });
      
//       res.status(400).json({
//         message: 'Validation failed',
//         errors: formattedErrors
//       });
//       return; 
//     }
    

//     if (req.body.price < 0) {
//       res.status(400).json({ message: 'Price cannot be negative' });
//       return;
//     }
    
//     if (req.body.stock_quantity < 0) {
//       res.status(400).json({ message: 'Stock quantity cannot be negative' });
//       return;
//     }
    
//     next();
//   } catch (error) {
//     next(error);
//   }
// };