import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CategoryDto } from '../../generated/mikro-nest-forge/generated/category/category.dto';
import { CategoryCreateDto } from '../../generated/mikro-nest-forge/generated/category/category.create.dto';
import { CategoryUpdateDto } from '../../generated/mikro-nest-forge/generated/category/category.update.dto';
import { CategoryFindManyDto } from '../../generated/mikro-nest-forge/generated/category/category.find-many.dto';
import { CategoryFindManyResponseDto } from '../../generated/mikro-nest-forge/generated/category/category.find-many.response.dto';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get(':id')
  @ApiOkResponse({ type: CategoryDto })
  @ApiNotFoundResponse({ description: 'Entity not found' })
  async findOne(@Param('id') id: string): Promise<CategoryDto> {
    const result = await this.categoryService.findOne(+id);
    if (!result) {
      throw new NotFoundException('Entity not found');
    }
    return result;
  }

  @Post('findMany')
  @ApiOkResponse({ type: CategoryFindManyResponseDto })
  async findMany(@Body() dto: CategoryFindManyDto) {
    return await this.categoryService.findMany(dto);
  }

  @Post('create')
  @ApiCreatedResponse({ type: CategoryDto })
  async create(@Body() createCategoryDto: CategoryCreateDto) {
    return await this.categoryService.create(createCategoryDto);
  }

  @Post('update')
  @ApiOkResponse({ type: CategoryDto })
  @ApiNotFoundResponse({ description: 'Entity not found' })
  async update(@Body() updateCategoryDto: CategoryUpdateDto) {
    return await this.categoryService.update(updateCategoryDto);
  }

  @Post('delete/:id')
  @ApiOkResponse({ description: 'Entity deleted successfully' })
  @ApiNotFoundResponse({ description: 'Entity not found' })
  async remove(@Param('id') id: string) {
    return this.categoryService.remove(+id);
  }
}