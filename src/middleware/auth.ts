import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomError } from '../utils/errors';

// Extend the Request interface to include the user object
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get token from header, query, or cookie
        const token = 
            req.headers.authorization?.split(' ')[1] || 
            req.query.token as string || 
            req.cookies?.token;

        // If no token is provided
        if (!token) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return next(new CustomError('Authentication required', 401));
            }
            return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
        
        // Add user to request
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
        // Get token from header, query, or cookie
        const token = 
            req.headers.authorization?.split(' ')[1] || 
            req.query.token as string || 
            req.cookies?.token;

        // If no token is provided
        if (!token) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return next(new CustomError('Admin authentication required', 401));
            }
            return res.redirect('/admin/login?redirect=' + encodeURIComponent(req.originalUrl));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key') as any;
        
        // Check if user has admin role
        if (decoded.role !== 'admin') {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return next(new CustomError('Admin access required', 403));
            }
            return res.redirect('/admin/login');
        }
        
        // Add user to request
        req.user = decoded;
        
        next();
    } catch (error) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return next(new CustomError('Invalid or expired admin token', 401));
        }
        return res.redirect('/admin/login');
    }
};

// This middleware prevents admins from accessing buyer-only routes
export const isBuyer = (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get token from header, query, or cookie
        const token = 
            req.headers.authorization?.split(' ')[1] || 
            req.query.token as string || 
            req.cookies?.token;

        // If no token is provided
        if (!token) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return next(new CustomError('Authentication required', 401));
            }
            return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key') as any;
        
        // Check if user is NOT an admin
        if (decoded.role === 'admin') {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return next(new CustomError('This feature is only available for buyers', 403));
            }
            return res.redirect('/admin/dashboard');
        }
        
        // Add user to request
        req.user = decoded;
        
        next();
    } catch (error) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return next(new CustomError('Invalid or expired token', 401));
        }
        return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
};