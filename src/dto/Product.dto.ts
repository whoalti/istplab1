import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Max, Min, MinLength, ValidateNested } from "class-validator";


export class BaseProductDto {
    @IsString()
    @Min(3)
    @Max(255)
    name: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsNumber()
    @Min(0)
    stock_quantity: number;

    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateProductDto extends BaseProductDto {
    @IsOptional()
    @IsArray()
    @IsUUID("4", { each: true })
    @ArrayMinSize(1)
    categoryIds?: string[];

    @IsOptional()
    @IsUrl()
    image_path?: string;
}

export class UpdateProductDto {
    @IsOptional()
    @IsString()
    @Min(3)
    @Max(255)
    name?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    stock_quantity?: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @IsUUID("4", { each: true })
    categoryIds?: string[];
}

export class ProductFilterDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    maxPrice?: number;

    @IsOptional()
    @IsUUID("4")
    categoryId?: string;

    @IsOptional()
    @IsBoolean()
    inStock?: boolean;
}

export class PaginationDto {
    @IsNumber()
    @Min(1)
    page: number = 1;

    @IsNumber()
    @Min(1)
    @Max(100)
    limit: number = 10;
}

export class ProductResponseDto extends BaseProductDto {
    @IsUUID("4")
    product_id: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CategoryDto)
    categories: CategoryDto[];

    @IsNumber()
    averageRating: number;

    created_at: Date;
    updated_at: Date;
}

export class CategoryDto {
    @IsUUID("4")
    category_id: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;
}

// DTO for price history
export class PriceHistoryDto {
    @IsUUID("4")
    price_history_id: string;

    @IsNumber()
    @Min(0)
    price: number;

    updated_at: Date;
}

export class ProductStatisticsDto {
    @IsNumber()
    @Min(0)
    total_sales: number;

    @IsNumber()
    @Min(0)
    total_revenue: number;

    @IsNumber()
    @Min(0)
    @Max(5)
    average_rating: number;

    last_updated: Date;
}
export class BulkUpdatePriceDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductPriceUpdate)
    updates: ProductPriceUpdate[];
}

class ProductPriceUpdate {
    @IsUUID("4")
    productId: string;

    @IsNumber()
    @Min(0)
    newPrice: number;
}