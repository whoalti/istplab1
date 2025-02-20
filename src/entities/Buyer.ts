import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Purchase } from "./Purchase";


@Entity("buyer")
export class Buyer {
    @PrimaryGeneratedColumn('uuid')
    buyer_id: string;

    @Column({length: 255, unique: true})
    username: string;

    @Column({length: 255})
    password_hash: string;

    @OneToMany(() => Purchase, purchase => purchase.buyer)
    purchases: Purchase[];
}