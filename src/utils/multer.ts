import express from 'express';
import multer from 'multer';
import path from 'path';

export const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/products_images')
    },
    filename : function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
})

export const upload = multer({
    storage: storage, 
    limits: { fileSize: 10 * 1024 * 1024},
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|wbep/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only images files are allowed!'));
    }
})

