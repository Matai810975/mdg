import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Product } from './Product';
import { BaseEntity } from './base-entity';
import { DtoOptions } from 'src/generated/decorators/dto-options.decorator';

@Entity()
export class Category extends BaseEntity {
  @Property()
  name!: string;

  @Property({ comment: 'description field' })
  @DtoOptions({ exclude: ['data'] })
  description!: string;

  @OneToMany(() => Product, (product) => product.category, {
    comment: 'products relation',
  })
  products = new Collection<Product>(this);
}
