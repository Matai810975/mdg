import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { ProductDto } from '../../generated/mikro-nest-forge/generated/product/product.dto';
import { ProductCreateDto } from '../../generated/mikro-nest-forge/generated/product/product.create.dto';
import { ProductUpdateDto } from '../../generated/mikro-nest-forge/generated/product/product.update.dto';
import { ProductFindManyDto } from '../../generated/mikro-nest-forge/generated/product/product.find-many.dto';
import { ProductFindManyResponseDto } from '../../generated/mikro-nest-forge/generated/product/product.find-many.response.dto';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get(':id')
  @ApiOkResponse({ type: ProductDto })
  @ApiNotFoundResponse({ description: 'Entity not found' })
  async findOne(@Param('id') id: string): Promise<ProductDto> {
    const result = await this.productService.findOne(+id);
    if (!result) {
      throw new NotFoundException('Entity not found');
    }
    return result;
  }

  @Post('findMany')
  @ApiOkResponse({ type: ProductFindManyResponseDto })
  async findMany(@Body() dto: ProductFindManyDto) {
    return await this.productService.findMany(dto);
  }

  @Post('create')
  @ApiCreatedResponse({ type: ProductDto })
  async create(@Body() createProductDto: ProductCreateDto) {
    return await this.productService.create(createProductDto);
  }

  @Post('update')
  @ApiOkResponse({ type: ProductDto })
  @ApiNotFoundResponse({ description: 'Entity not found' })
  async update(@Body() updateProductDto: ProductUpdateDto) {
    return await this.productService.update(updateProductDto);
  }

  @Post('delete/:id')
  @ApiOkResponse({ description: 'Entity deleted successfully' })
  @ApiNotFoundResponse({ description: 'Entity not found' })
  async remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }
}