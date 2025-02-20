import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first

import 'reflect-metadata';
import express from 'express';
import { AppDataSource } from './config/database';
import { productRouter } from './routes/products';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({status: 'ok'});
});

app.use('/api/products', productRouter);

const startServer = async () => {
    try {
        console.log('Connecting with user:', process.env.DB_USER);
        await AppDataSource.initialize();
        console.log('Database connection has been established successfully.');

        app.listen(port, () => {
            console.log(`Server is on port ${port}`);
        });
    } catch (error) {
        console.error('Error during app startup:', error);
        process.exit(1);
    }
};

startServer();