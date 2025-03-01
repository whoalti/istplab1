import dotenv from 'dotenv';
dotenv.config(); 


import 'reflect-metadata';
import express from 'express';
import { AppDataSource } from './config/database';
import { productRouter } from './routes/products';
import path from 'path';
import expressEjsLayouts from 'express-ejs-layouts';
import { viewsRouter } from './routes/views';


const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressEjsLayouts)
app.set('layout', 'layouts/main');

// app.use(express.static(path.join(__dirname, 'public'))); 
app.use(express.static(path.join(__dirname)));
// app.use(express.static(path.join(__dirname, 'public'))); 


app.get('/health', (req, res) => {
    res.json({status: 'ok'});
});

// app.get('/', async (req, res) => {
//     try {
//         res.render('products/index', {
//             title: 'Welcome to MyShop',
//             products: [],
//             featured: []
//         });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).render('error', {
//             title: 'Error',
//             message: 'An error occurred'
//         });
//     }
// });
app.use('/', viewsRouter);
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