import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Statistics } from "./Statistics";
import { Purchase } from "./Purchase";
import { ProductCategory } from "./ProductCategory";
import { PriceHistory } from "./PriceHistory";

@Entity("product")
export class Product {
    @PrimaryGeneratedColumn('uuid')
    product_id: string


    @Column({length: 255})
    name: string;

    @Column()
    stock_quantity: number
    
    @Column("decimal", { 
        precision: 10, 
        scale: 2,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => parseFloat(value)
        }
    })
    price: number;

    @Column('text', {nullable: true})
    image_path: string;

    @Column('text', {nullable: true})
    description: string

    @CreateDateColumn()
    created_at: Date;       // Exact match with database column name

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToMany(() => ProductCategory)
    @JoinTable({
        name: "PRODUCT_CATEGORY_RELATION",
        joinColumn: {
            name: "product_id",
            referencedColumnName: "product_id"
        },
        inverseJoinColumn: {
            name: "category_id",
            referencedColumnName: "category_id"
        }
    })
    categories: ProductCategory[];

    @OneToMany(() => PriceHistory, priceHistory => priceHistory.product)
    priceHistory: PriceHistory[]

    @OneToMany(() => Purchase, purchase => purchase.product)
    purchases: Purchase[];

    @OneToMany(() => Statistics, statistics => statistics.product)
    statistics: Statistics;
    

}
