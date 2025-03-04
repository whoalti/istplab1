import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "./Product";


@Entity('price_history')
export class PriceHistory {
    @PrimaryGeneratedColumn('uuid')
    price_history_id: string;

    @Column('decimal', { 
        precision: 10, 
        scale: 2,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => parseFloat(value)
        }
    })
    price: number; 

    @CreateDateColumn()
    updated_at: Date;

    @ManyToOne(() => Product, product => product.priceHistory)
    product: Product;
}