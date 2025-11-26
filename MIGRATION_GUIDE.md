# MikroNestForge v2.0 Migration Guide

## Overview

Version 2.0 introduces a new, clearer configuration structure that better reflects the tool's dual purposes: **mapping generation** (DTOs and their conversion functions) and **scaffold generation** (NestJS resource boilerplate).

## What's Changed?

### Configuration Structure Redesign

The configuration has been reorganized into two distinct sections:

1. **`mappingGeneratorOptions`** - Settings for DTO and mapping function generation (used by `generate-dto` and `update-mappings` commands)
2. **`scaffoldGeneratorOptions`** - Settings for resource scaffolding (used by `generate-scaffold` command)

### Property Renames

Several properties have been renamed for clarity:

| Old Property | New Property | Reason |
|-------------|--------------|--------|
| `input` | `mappingGeneratorOptions.entitiesGlob` | More descriptive - clearly indicates it's a glob pattern for entity files |
| `output` | `mappingGeneratorOptions.outputDir` | More descriptive - clearly indicates it's the output directory |
| `parallel` | `mappingGeneratorOptions.performance.enabled` | Better organization - groups performance settings |
| `concurrency` | `mappingGeneratorOptions.performance.workerCount` | More descriptive - indicates it controls worker count |
| `resources` | `scaffoldGeneratorOptions` | Aligns with the `generate-scaffold` command name |

## Migration Steps

### Step 1: Update Your Config File

Replace your existing configuration class with the new structure.

#### Before (v1.x - Legacy Format)

```typescript
import { DtoGeneratorConfig } from "@mikro-nest-forge/mikro-nest-forge";

const config = new DtoGeneratorConfig({
  input: "src/entities/**/*.ts",
  output: "src/generated/mikro-nest-forge",
  generators: [
    "dto",
    "create-dto",
    "update-dto",
    "find-many-dto",
    "find-many-response-dto",
    "find-many-to-filter",
    "entity-to-dto",
    "create-dto-to-entity",
    "update-dto-to-entity"
  ],
  parallel: true,
  concurrency: 4,
  resources: {
    basePath: "src",
    templates: {
      entity: "entities/{dir}/{entity}.ts",
      controller: "user/{dir}/{entity}/{entity}.controller.ts",
      service: "user/{dir}/{entity}/{entity}.service.ts",
      module: "user/{dir}/{entity}/{entity}.module.ts"
    }
  }
});

export default config;
```

#### After (v2.0 - New Format)

```typescript
import { MikroNestForgeConfig } from "@mikro-nest-forge/mikro-nest-forge";

const config = new MikroNestForgeConfig({
  mappingGeneratorOptions: {
    entitiesGlob: "src/entities/**/*.ts",
    outputDir: "src/generated/mikro-nest-forge",
    generators: [
      "dto",
      "create-dto",
      "update-dto",
      "find-many-dto",
      "find-many-response-dto",
      "find-many-to-filter",
      "entity-to-dto",
      "create-dto-to-entity",
      "update-dto-to-entity"
    ],
    performance: {
      enabled: true,
      workerCount: 4
    }
  },
  scaffoldGeneratorOptions: {
    basePath: "src",
    templates: {
      entity: "entities/{dir}/{entity}.ts",
      controller: "user/{dir}/{entity}/{entity}.controller.ts",
      service: "user/{dir}/{entity}/{entity}.service.ts",
      module: "user/{dir}/{entity}/{entity}.module.ts"
    }
  }
});

export default config;
```

### Step 2: Update Imports (If Applicable)

If you're programmatically using the configuration classes in your code:

```typescript
// Before
import { DtoGeneratorConfig } from "@mikro-nest-forge/mikro-nest-forge";

// After
import { MikroNestForgeConfig } from "@mikro-nest-forge/mikro-nest-forge";
```

### Step 3: Update Validation Calls (If Applicable)

If you're validating configurations programmatically:

```typescript
// Before
import { validateConfig } from "@mikro-nest-forge/mikro-nest-forge";
validateConfig(config);

// After
import { validateNewConfig } from "@mikro-nest-forge/mikro-nest-forge";
validateNewConfig(config);
```

## Benefits of the New Structure

### 1. **Clearer Separation of Concerns**
- Mapping-related settings are grouped under `mappingGeneratorOptions`
- Scaffold-related settings are grouped under `scaffoldGeneratorOptions`
- Performance settings are nested under `performance`

### 2. **More Descriptive Property Names**
- `entitiesGlob` clearly indicates it's a glob pattern
- `outputDir` clearly indicates it's a directory path
- `workerCount` is more descriptive than `concurrency`

### 3. **Better Alignment with Commands**
- `mappingGeneratorOptions` → used by `generate-dto` and `update-mappings`
- `scaffoldGeneratorOptions` → used by `generate-scaffold`

### 4. **Easier to Extend**
The new structure makes it easier to add new options in the future without cluttering the root configuration object.

## Backward Compatibility

### Automatic Detection and Conversion

MikroNestForge v2.0 automatically detects which config format you're using:

- **New Format**: Loads without warnings, uses new validation
- **Legacy Format**: Loads with a deprecation warning, automatically converts to new format internally

### Deprecation Timeline

| Version | Legacy Format Support |
|---------|----------------------|
| v2.0.x  | ✅ Fully supported with deprecation warnings |
| v3.0.0  | ❌ Removed - must use new format |

You have until v3.0.0 to migrate to the new format.

## Configuration Reference

### MikroNestForgeConfig

The root configuration class.

```typescript
class MikroNestForgeConfig {
  mappingGeneratorOptions: MappingGeneratorOptions;
  scaffoldGeneratorOptions: ScaffoldGeneratorOptions;
}
```

### MappingGeneratorOptions

Settings for DTO and mapping function generation.

```typescript
class MappingGeneratorOptions {
  entitiesGlob: string;           // Glob pattern for entity files (e.g., "src/entities/**/*.ts")
  outputDir: string;              // Output directory for generated files
  generators: GeneratorType[];    // Array of generator types to run
  performance: PerformanceConfig; // Performance settings
}
```

**Generator Types:**
- `dto` - Basic DTO
- `create-dto` - Create DTO
- `update-dto` - Update DTO
- `find-many-dto` - Find many query DTO
- `find-many-response-dto` - Find many response DTO
- `find-many-to-filter` - Find many to filter mapping
- `entity-to-dto` - Entity to DTO mapping
- `create-dto-to-entity` - Create DTO to entity mapping
- `update-dto-to-entity` - Update DTO to entity mapping

### PerformanceConfig

Performance and parallelization settings.

```typescript
class PerformanceConfig {
  enabled: boolean = false;    // Enable parallel processing
  workerCount: number = 4;     // Number of concurrent workers
}
```

### ScaffoldGeneratorOptions

Settings for NestJS resource scaffolding.

```typescript
class ScaffoldGeneratorOptions {
  basePath: string = process.cwd();          // Base path for output files
  templates: ScaffoldTemplatesConfig;        // Template path patterns
}
```

### ScaffoldTemplatesConfig

Template path patterns for generated files.

```typescript
class ScaffoldTemplatesConfig {
  entity?: string;       // Entity file path pattern
  controller?: string;   // Controller file path pattern
  service?: string;      // Service file path pattern
  module?: string;       // Module file path pattern
}
```

**Pattern Variables:**
- `{entity}` - Entity name (e.g., "product")
- `{dir}` - Directory path (e.g., "catalog/product")

## Troubleshooting

### Error: "Configuration field 'input' is required"

You're likely using the legacy `DtoGeneratorConfig` class. Update to `MikroNestForgeConfig` and use `mappingGeneratorOptions.entitiesGlob` instead of `input`.

### Warning: "You are using the legacy DtoGeneratorConfig format"

Your config file is using the old format. While it still works in v2.0, you should migrate to the new format before v3.0.0. See the migration steps above.

### TypeScript Errors After Migration

Make sure you've updated your imports:

```typescript
// Update this
import { DtoGeneratorConfig } from "@mikro-nest-forge/mikro-nest-forge";

// To this
import { MikroNestForgeConfig } from "@mikro-nest-forge/mikro-nest-forge";
```

## Need Help?

If you encounter issues during migration:

1. Check the [examples](./packages/test-nest-app/mikro-nest-forge.config.ts) in the repository
2. Review the [CLAUDE.md](./CLAUDE.md) for project-specific guidance
3. Open an issue on GitHub with your config file and error message

## Summary

The v2.0 configuration structure is designed to be:
- **Clearer**: Obvious separation between mapping and scaffold settings
- **More Maintainable**: Easier to add new features without breaking changes
- **Self-Documenting**: Property names clearly indicate their purpose

While the legacy format continues to work in v2.0, we recommend migrating soon to take advantage of better validation and to prepare for v3.0.
