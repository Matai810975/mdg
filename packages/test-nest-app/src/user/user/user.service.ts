import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { User } from '../../entities/User';
import { UserDto } from '../../generated/mikro-nest-forge/generated/user/user.dto';
import { UserCreateDto } from '../../generated/mikro-nest-forge/generated/user/user.create.dto';
import { UserUpdateDto } from '../../generated/mikro-nest-forge/generated/user/user.update.dto';
import { UserToDto } from '../../generated/mikro-nest-forge/generated/user/user.mapping';
import { createUserFromDto } from '../../generated/mikro-nest-forge/generated/user/user.create.mapping';
import { updateUserFromDto } from '../../generated/mikro-nest-forge/generated/user/user.update.mapping';
import { UserFindManyDtoToFilter } from '../../generated/mikro-nest-forge/generated/user/user.find-many.mapping';
import { UserFindManyDto } from '../../generated/mikro-nest-forge/generated/user/user.find-many.dto';
import { UserFindManyResponseDto } from '../../generated/mikro-nest-forge/generated/user/user.find-many.response.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  async findOne(id: number): Promise<UserDto | null> {
    const entity = await this.userRepository.findOne({ id: id });
    if (!entity) {
      return null;
    }
    return UserToDto(entity);
  }

  async findMany(dto:UserFindManyDto): Promise<UserFindManyResponseDto>{
    const [data,count] = await this.userRepository.findAndCount(UserFindManyDtoToFilter(dto))
    return { data:data.map(UserToDto), count }
  }

  async create(createUserDto: UserCreateDto): Promise<UserDto> {
    const user = createUserFromDto(createUserDto, this.em);
    await this.em.persistAndFlush(user);
    return UserToDto(user);
  }

  async update(updateUserDto: UserUpdateDto): Promise<UserDto> {
    // Use the update mapping function
    const user = await updateUserFromDto(updateUserDto, this.em);
    await this.em.flush();
    return UserToDto(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ id: id });
    if (!user) {
      throw new Error('User not found');
    }

    await this.em.removeAndFlush(user);
  }
}