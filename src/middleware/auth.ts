import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomError } from '../utils/errors';

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = 
            req.headers.authorization?.split(' ')[1] || 
            req.query.token as string || 
            req.cookies?.token;

        if (!token) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return next(new CustomError('Authentication required', 401));
            }
            return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
        
        req.user = decoded;
        
        next();
    } catch (error) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return next(new CustomError('Invalid or expired token', 401));
        }
        return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    try {
        isAuthenticated(req, res, () => {
            if (req.user?.role !== 'admin') {
                if (req.xhr || req.headers.accept?.includes('application/json')) {
                    return next(new CustomError('Admin access required', 403));
                }
                return res.redirect('/admin/login');
            }
            
            next();
        });
    } catch (error) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return next(new CustomError('Authentication failed', 401));
        }
        return res.redirect('/admin/login');
    }
};