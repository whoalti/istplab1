import { DataSource } from "typeorm";
import { Administrator } from "../entities/Administrator";
import { Buyer } from "../entities/Buyer";
import { Product } from "../entities/Product";
import { ProductCategory } from "../entities/ProductCategory";
import { PriceHistory } from "../entities/PriceHistory";
import { Purchase } from "../entities/Purchase";
import { Statistics } from "../entities/Statistics";

console.log('Database Config:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    database: process.env.DB_NAME
});

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [
        Administrator,
        Buyer,
        Product,
        ProductCategory,
        PriceHistory,
        Purchase,
        Statistics
    ],
    synchronize: true,
    logging: true
});