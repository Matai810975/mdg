# MikroNestForge v3.0 Migration Guide

## Overview

Version 3.0 is a **major breaking release** that completely removes support for the legacy configuration format. All deprecated APIs, types, and backward compatibility layers have been removed.

**Key Changes:**
- ✅ Simplified codebase with only `MikroNestForgeConfig` support
- ❌ Removed `DtoGeneratorConfig` and all legacy types
- ❌ Removed interactive CLI mode
- ❌ Removed command-line-only configuration (config file is now required)
- ⚡ Improved performance with optimized entity resolution
- 🔒 Stronger type safety

If you're currently using v1.x (legacy `DtoGeneratorConfig`), you must migrate to the v2.0+ format before upgrading to v3.0.

---

# v3.1 Changes (Current)

## Command Consolidation

### Breaking Change: Commands Merged

The `generate-dto` and `update-mappings` commands have been **removed** and consolidated into a single `update-dto-mapping` command.

**Reason**: Both commands were functionally identical - they both called the same generation logic with the config file as the source of truth. The separation created unnecessary complexity.

#### Migration

**Before (v3.0)**:
```bash
# Generate all DTOs and mappings
pnpm mn-forge generate-dto

# Update only mapping functions
pnpm mn-forge update-mappings
```

**After (v3.1)**:
```bash
# Generate/update DTOs and mappings (controlled by config file)
pnpm mn-forge update-dto-mapping
```

#### What Changed?

1. **Single Command**: Use `update-dto-mapping` for all DTO and mapping generation
2. **Config is Source of Truth**: The `generators` array in your config file determines what gets generated
3. **Simplified Flags**: Removed all unused generator selection flags (`--generate-dto`, `--generate-mapping`, etc.)
4. **Performance Overrides Only**: CLI flags now only override performance settings (`--parallel`, `--concurrency`)

#### Controlling What Gets Generated

Edit your `mikro-nest-forge.config.ts` to control which generators run:

```typescript
const config = new MikroNestForgeConfig({
  mappingGeneratorOptions: {
    entitiesGlob: "src/entities/**/*.ts",
    outputDir: "src/generated/mikro-nest-forge",
    // Control what gets generated here:
    generators: [
      // DTOs
      "dto",
      "create-dto",
      "update-dto",
      "find-many-dto",
      "find-many-response-dto",
      // Mappings
      "entity-to-dto",
      "create-dto-to-entity",
      "update-dto-to-entity",
      "find-many-to-filter"
    ],
    performance: {
      enabled: true,
      workerCount: 4
    }
  }
});
```

**Examples:**
- **To generate everything**: Include all 9 generator types (default)
- **To generate only DTOs**: Remove the 4 mapping generators from the array
- **To generate only mappings**: Remove the 5 DTO generators from the array

#### Available CLI Flags

```bash
# Specify config file location
mn-forge update-dto-mapping -c path/to/config.ts

# Override performance settings
mn-forge update-dto-mapping --parallel --concurrency 8

# Validate config without running
mn-forge update-dto-mapping --validate
```

---

# v3.0 Changes

## What's Changed?

### Configuration Structure Redesign

The configuration has been reorganized into two distinct sections:

1. **`mappingGeneratorOptions`** - Settings for DTO and mapping function generation (used by `update-dto-mapping` command)
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
- `mappingGeneratorOptions` → used by `update-dto-mapping`
- `scaffoldGeneratorOptions` → used by `generate-scaffold`

### 4. **Easier to Extend**
The new structure makes it easier to add new options in the future without cluttering the root configuration object.

## Removed Features in v3.0

### Legacy Configuration Support

The legacy `DtoGeneratorConfig` format is **completely removed** in v3.0. Your configuration **must** use the new `MikroNestForgeConfig` format.

**Removed Types:**
- `DtoGeneratorConfig` - Use `MikroNestForgeConfig` instead
- `ResourceGeneratorConfig` - Use `ScaffoldGeneratorOptions` instead
- `IDtoGeneratorConfig` - No longer needed
- `validateConfig()` - Use `validateNewConfig()` instead

### Interactive CLI Mode

The interactive mode (`--interactive` flag) has been removed. You must create a configuration file.

### CLI-Only Usage

v3.0 **requires** a configuration file (`mikro-nest-forge.config.ts`). Running commands without a config file is no longer supported.

### Deprecated Utility Functions

Internal deprecated functions have been removed for better performance:
- Old relation resolution functions replaced with optimized versions
- Removed backward compatibility conversion functions

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

### Error: Module has no exported member 'DtoGeneratorConfig'

This is expected in v3.0. The legacy types have been removed. Update your configuration to use `MikroNestForgeConfig`:

```typescript
// ❌ This no longer works
import { DtoGeneratorConfig } from "@mikro-nest-forge/mikro-nest-forge";

// ✅ Use this instead
import { MikroNestForgeConfig } from "@mikro-nest-forge/mikro-nest-forge";
```

### Error: "No configuration file found"

v3.0 requires a configuration file. Create a `mikro-nest-forge.config.ts` file in your project root with the new format.

### TypeScript Errors in Existing Code

If you have code that imports or uses the legacy types:

1. Replace all `DtoGeneratorConfig` with `MikroNestForgeConfig`
2. Update property accesses:
   - `config.input` → `config.mappingGeneratorOptions.entitiesGlob`
   - `config.output` → `config.mappingGeneratorOptions.outputDir`
   - `config.parallel` → `config.mappingGeneratorOptions.performance.enabled`
   - `config.concurrency` → `config.mappingGeneratorOptions.performance.workerCount`

### Build Errors After Upgrading

1. Delete `node_modules` and reinstall dependencies
2. Clear TypeScript cache: `rm -rf dist`
3. Rebuild: `pnpm build`

## Need Help?

If you encounter issues during migration:

1. Check the [examples](./packages/test-nest-app/mikro-nest-forge.config.ts) in the repository
2. Review the [CLAUDE.md](./CLAUDE.md) for project-specific guidance
3. Open an issue on GitHub with your config file and error message

## Summary

The v3.0 release represents a major cleanup:
- **Simplified**: Only one configuration format to learn and maintain
- **Faster**: Removed legacy conversion overhead and optimized entity resolution
- **Type-Safe**: Stronger TypeScript guarantees without legacy compatibility
- **Clearer**: Obvious separation between mapping and scaffold settings
- **Future-Proof**: Clean foundation for future enhancements

**Migration is mandatory** for v3.0. If you haven't migrated from the legacy format yet, you must do so before upgrading.
