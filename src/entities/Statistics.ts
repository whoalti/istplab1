import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "./Product";

@Entity('statistics')
export class Statistics {
    @PrimaryGeneratedColumn('uuid')
    stat_id: string;

    @Column({ default: 0 })
    total_sales: number;

    @Column('decimal', {
        precision: 10, 
        scale: 2, 
        default: 0,
        transformer: {
            to: (value: number) => value,
            from: (value: any) => {
                if (typeof value === 'number') return value;
                if (typeof value === 'string') return parseFloat(value);
                return 0;
            }
        }
    })
    total_revenue: number;

    @CreateDateColumn()
    last_updated: Date;

    @OneToOne(() => Product)
    @JoinColumn({ name: 'product_id' })
    product: Product;
}