import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserDto } from '../../generated/mikro-nest-forge/generated/user/user.dto';
import { UserCreateDto } from '../../generated/mikro-nest-forge/generated/user/user.create.dto';
import { UserUpdateDto } from '../../generated/mikro-nest-forge/generated/user/user.update.dto';
import { UserFindManyDto } from '../../generated/mikro-nest-forge/generated/user/user.find-many.dto';
import { UserFindManyResponseDto } from '../../generated/mikro-nest-forge/generated/user/user.find-many.response.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOkResponse({ type: UserDto })
  @ApiNotFoundResponse({ description: 'Entity not found' })
  async findOne(@Param('id') id: string): Promise<UserDto> {
    const result = await this.userService.findOne(+id);
    if (!result) {
      throw new NotFoundException('Entity not found');
    }
    return result;
  }

  @Post('findMany')
  @ApiOkResponse({ type: UserFindManyResponseDto })
  async findMany(@Body() dto: UserFindManyDto) {
    return await this.userService.findMany(dto);
  }

  @Post('create')
  @ApiCreatedResponse({ type: UserDto })
  async create(@Body() createUserDto: UserCreateDto) {
    return await this.userService.create(createUserDto);
  }

  @Post('update')
  @ApiOkResponse({ type: UserDto })
  @ApiNotFoundResponse({ description: 'Entity not found' })
  async update(@Body() updateUserDto: UserUpdateDto) {
    return await this.userService.update(updateUserDto);
  }

  @Post('delete/:id')
  @ApiOkResponse({ description: 'Entity deleted successfully' })
  @ApiNotFoundResponse({ description: 'Entity not found' })
  async remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}