import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Product } from '../../entities/Product';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Product])],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
