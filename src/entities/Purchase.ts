import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Buyer } from "./Buyer";
import { Product } from "./Product";

@Entity('purchase')
export class Purchase {
    @PrimaryGeneratedColumn('uuid')
    purchase_id: string;

    @Column('decimal', {precision: 10, scale: 2})
    amount: number;


    @CreateDateColumn()
    purchase_date: Date;


    @ManyToOne(() => Buyer, buyer => buyer.purchases)
    buyer: Buyer;

    @ManyToOne(() => Product, product => product.purchases)
    product: Product
}
