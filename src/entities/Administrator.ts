import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity("administrator")
export class Administrator {
    @PrimaryGeneratedColumn('uuid')
    admin_id: string;

    @Column({length: 255, unique: true})
    username: string;

    @Column({length: 255})
    password_hash: string;
}

