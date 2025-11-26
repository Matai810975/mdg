import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { Category } from '../../entities/Category';
import { CategoryDto } from '../../generated/mikro-nest-forge/generated/category/category.dto';
import { CategoryCreateDto } from '../../generated/mikro-nest-forge/generated/category/category.create.dto';
import { CategoryUpdateDto } from '../../generated/mikro-nest-forge/generated/category/category.update.dto';
import { CategoryToDto } from '../../generated/mikro-nest-forge/generated/category/category.mapping';
import { createCategoryFromDto } from '../../generated/mikro-nest-forge/generated/category/category.create.mapping';
import { updateCategoryFromDto } from '../../generated/mikro-nest-forge/generated/category/category.update.mapping';
import { CategoryFindManyDtoToFilter } from '../../generated/mikro-nest-forge/generated/category/category.find-many.mapping';
import { CategoryFindManyDto } from '../../generated/mikro-nest-forge/generated/category/category.find-many.dto';
import { CategoryFindManyResponseDto } from '../../generated/mikro-nest-forge/generated/category/category.find-many.response.dto';

@Injectable()
export class CategoryService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Category)
    private readonly categoryRepository: EntityRepository<Category>,
  ) {}

  async findOne(id: number): Promise<CategoryDto | null> {
    const entity = await this.categoryRepository.findOne({ id: id });
    if (!entity) {
      return null;
    }
    return CategoryToDto(entity);
  }

  async findMany(dto:CategoryFindManyDto): Promise<CategoryFindManyResponseDto>{
    const [data,count] = await this.categoryRepository.findAndCount(CategoryFindManyDtoToFilter(dto))
    return { data:data.map(CategoryToDto), count }
  }

  async create(createCategoryDto: CategoryCreateDto): Promise<CategoryDto> {
    const category = createCategoryFromDto(createCategoryDto, this.em);
    await this.em.persistAndFlush(category);
    return CategoryToDto(category);
  }

  async update(updateCategoryDto: CategoryUpdateDto): Promise<CategoryDto> {
    // Use the update mapping function
    const category = await updateCategoryFromDto(updateCategoryDto, this.em);
    await this.em.flush();
    return CategoryToDto(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.categoryRepository.findOne({ id: id });
    if (!category) {
      throw new Error('Category not found');
    }

    await this.em.removeAndFlush(category);
  }
}