import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "./Product";


@Entity('product_category')
export class ProductCategory {
    @PrimaryGeneratedColumn('uuid')
    category_id: string;

    @Column({length:255, unique: true})
    name : string;

    @Column('text', {nullable: true})
    description: string;

    @ManyToMany(() => Product, product => product.categories)
    products: Product[]

}