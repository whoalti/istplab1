import { Repository } from "typeorm";
import { Product } from "../entities/Product";
import { CreateProductDto } from "../dto/Product.dto";



export class ProductService {
    constructor(
        private readonly productRepository: Repository<Product>,
        private readonly priceHistoryRepository: Repository<Product>,
        private readonly categoryRepository: Repository<Product>,
    ) {}


}