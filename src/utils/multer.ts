import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Use a relative path that will be consistent in both development and production
const uploadDir = path.join(process.cwd(), 'src', 'public', 'uploads', 'products_images');

// Ensure the directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created directory: ${uploadDir}`);
}

export const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// The URL path prefix that will be used to access files
const urlPrefix = '/public/uploads/products_images/';

export const upload = multer({
    storage: storage, 
    limits: { fileSize: 10 * 1024 * 1024},
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Helper function to convert file path to URL
export const filePathToUrl = (filePath: string): string => {
    if (!filePath) return '';
    
    const filename = path.basename(filePath);
    return `${urlPrefix}${filename}`;
};