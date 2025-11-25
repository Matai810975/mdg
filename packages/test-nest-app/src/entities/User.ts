import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OneToMany,
  Collection,
} from "@mikro-orm/core";
import { Product } from "./Product";
import { UserRole } from "../enums/user-role";
import { BaseEntity } from "./base-entity";

@Entity()
export class User extends BaseEntity {
  @Property()
  name!: string;

  @Property({ nullable: true })
  email?: string;

  // @Enum(() => UserRole)
  @Enum({ items: () => UserRole, comment: "角色" })
  role: UserRole = UserRole.USER;

  @OneToMany(() => Product, (product) => product.user)
  products = new Collection<Product>(this);
}
