import { Entity, PrimaryKey, Property, ManyToOne, Ref } from '@mikro-orm/core';
import { Category } from './Category';
import { User } from './User';
import { DtoOptions } from 'src/generated/decorators/dto-options.decorator';
import { BaseEntity } from './base-entity';

@Entity()
export class Product extends BaseEntity {
  @Property({ comment: '234' })
  name!: string;

  @DtoOptions({ exclude: ['data'] })
  @Property()
  price!: number | null;

  @DtoOptions({ exclude: ['update'] })
  @Property()
  description!: string | null;

  @Property()
  createdAt: Date = new Date();

  @ManyToOne({ comment: '123' })
  category!: Category | null;

  @ManyToOne()
  user!: Ref<User> | null;
}
