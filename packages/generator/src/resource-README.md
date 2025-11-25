# Resource Generator

This is a separate CLI tool that generates NestJS modules, services, and controllers with basic resource operations based on MikroORM entities.

## Features

- Generates NestJS modules with proper MikroORM integration
- Generates services with standard resource operations (findAll, findOne, create, update, remove)
- Generates controllers with REST endpoints (GET, POST, PATCH, DELETE)
- Uses Handlebars templates for flexible code generation
- Processes entities individually (not in batch)
- Generated code provides basic templates that users can customize

## Usage

### CLI Commands

```bash
# Generate resource for a single entity
npm run start:resource -- --entity src/entities/User.ts --output src/generated-resource

# Generate resource with specific output directory
npm run start:resource -- --entity src/entities/Product.ts --output ./my-resource

# Generate resource and overwrite existing files
npm run start:resource -- --entity src/entities/User.ts --output src/generated-resource --force
```

### Options

- `--entity <path>` (required): Path to the entity file
- `--output <path>` (optional): Output directory for generated files (default: `./src/generated-resource`)
- `--force` (optional): Overwrite existing files
- `--generate-module` (optional): Generate NestJS module (default: true)
- `--generate-service` (optional): Generate NestJS service (default: true)
- `--generate-controller` (optional): Generate NestJS controller (default: true)

### Generated Files

For an entity named `User`, the following files will be generated:

```
src/generated-resource/user/
├── user.module.ts
├── user.service.ts
└── user.controller.ts
```

## Customization

The generated files are meant to be templates that users can modify and extend according to their needs. The templates include TODO comments to indicate where custom logic should be added.

## Templates

The templates are located in `src/templates/` and can be customized:
- `module.template.hbs`: NestJS module template
- `service.template.hbs`: NestJS service template
- `controller.template.hbs`: NestJS controller template

## Installation

The resource generator is included in the main package. After building the project, you can use:

```bash
# Build the project first
npm run build

# Use the CLI directly
npm run start:resource -- --entity src/test/entities/User.ts
```

## Example

Given a MikroORM entity like this:

```typescript
import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class User {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @Property({ nullable: true })
  email?: string;
}
```

The generator will create a complete resource setup with:

1. A module that imports the entity and provides the service
2. A service with full resource operations
3. A controller with REST endpoints

The generated code follows NestJS best practices and integrates properly with MikroORM.