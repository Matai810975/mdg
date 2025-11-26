import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { Product } from '../../entities/Product';
import { ProductDto } from '../../generated/mikro-nest-forge/generated/product/product.dto';
import { ProductCreateDto } from '../../generated/mikro-nest-forge/generated/product/product.create.dto';
import { ProductUpdateDto } from '../../generated/mikro-nest-forge/generated/product/product.update.dto';
import { ProductToDto } from '../../generated/mikro-nest-forge/generated/product/product.mapping';
import { createProductFromDto } from '../../generated/mikro-nest-forge/generated/product/product.create.mapping';
import { updateProductFromDto } from '../../generated/mikro-nest-forge/generated/product/product.update.mapping';
import { ProductFindManyDtoToFilter } from '../../generated/mikro-nest-forge/generated/product/product.find-many.mapping';
import { ProductFindManyDto } from '../../generated/mikro-nest-forge/generated/product/product.find-many.dto';
import { ProductFindManyResponseDto } from '../../generated/mikro-nest-forge/generated/product/product.find-many.response.dto';

@Injectable()
export class ProductService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Product)
    private readonly productRepository: EntityRepository<Product>,
  ) {}

  async findOne(id: number): Promise<ProductDto | null> {
    const entity = await this.productRepository.findOne({ id: id });
    if (!entity) {
      return null;
    }
    return ProductToDto(entity);
  }

  async findMany(dto:ProductFindManyDto): Promise<ProductFindManyResponseDto>{
    const [data,count] = await this.productRepository.findAndCount(ProductFindManyDtoToFilter(dto))
    return { data:data.map(ProductToDto), count }
  }

  async create(createProductDto: ProductCreateDto): Promise<ProductDto> {
    const product = createProductFromDto(createProductDto, this.em);
    await this.em.persistAndFlush(product);
    return ProductToDto(product);
  }

  async update(updateProductDto: ProductUpdateDto): Promise<ProductDto> {
    // Use the update mapping function
    const product = await updateProductFromDto(updateProductDto, this.em);
    await this.em.flush();
    return ProductToDto(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.productRepository.findOne({ id: id });
    if (!product) {
      throw new Error('Product not found');
    }

    await this.em.removeAndFlush(product);
  }
}