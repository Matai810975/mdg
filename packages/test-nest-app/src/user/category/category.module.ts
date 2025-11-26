import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Category } from '../../entities/Category';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Category])],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
