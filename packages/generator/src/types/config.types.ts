import process from "process";

/**
 * Available generator types
 */
export type GeneratorType =
  | "dto"
  | "create-dto"
  | "update-dto"
  | "find-many-dto"
  | "find-many-response-dto"
  | "find-many-to-filter"
  | "entity-to-dto"
  | "create-dto-to-entity"
  | "update-dto-to-entity";

// ============================================================================
// NEW CONFIGURATION STRUCTURE (v2.0+)
// ============================================================================

/**
 * Performance configuration for parallel processing
 */
export class PerformanceConfig {
  /** Enable parallel processing for faster generation */
  enabled: boolean = false;

  /** Number of concurrent workers (1-16) */
  workerCount: number = 4;

  constructor(partial?: Partial<PerformanceConfig>) {
    if (partial?.enabled !== undefined) this.enabled = partial.enabled;
    if (partial?.workerCount !== undefined) this.workerCount = partial.workerCount;
  }
}

/**
 * Configuration for mapping generation (DTOs + mapping functions)
 * Used by: generate-dto, update-mappings commands
 */
export class MappingGeneratorOptions {
  /** Glob pattern for entity files (e.g., 'src/entities/**\/*.ts') */
  entitiesGlob!: string;

  /** Output directory for generated DTOs and mappings */
  outputDir!: string;

  /** Array of generator types to run */
  generators: GeneratorType[] = [
    "dto",
    "create-dto",
    "update-dto",
    "find-many-dto",
    "find-many-response-dto",
    "find-many-to-filter",
    "entity-to-dto",
    "create-dto-to-entity",
    "update-dto-to-entity",
  ];

  /** Performance settings for DTO generation */
  performance: PerformanceConfig = new PerformanceConfig();

  constructor(partial?: Partial<MappingGeneratorOptions>) {
    if (partial?.entitiesGlob) this.entitiesGlob = partial.entitiesGlob;
    if (partial?.outputDir) this.outputDir = partial.outputDir;
    if (partial?.generators) this.generators = partial.generators;
    if (partial?.performance) {
      this.performance = new PerformanceConfig(partial.performance);
    }
  }
}

/**
 * Templates configuration for scaffold generation
 */
export class ScaffoldTemplatesConfig {
  /** Template for entity files. Use {dir} and {entity} placeholders. */
  entity: string = "src/entities/{dir}/{entity}.ts";

  /** Template for controller files. Use {dir} and {entity} placeholders. */
  controller: string = "src/{dir}/{entity}.controller.ts";

  /** Template for service files. Use {dir} and {entity} placeholders. */
  service: string = "src/{dir}/{entity}.service.ts";

  /** Template for module files. Use {dir} and {entity} placeholders. */
  module: string = "src/{dir}/{entity}.module.ts";

  constructor(partial?: Partial<ScaffoldTemplatesConfig>) {
    if (partial?.entity) this.entity = partial.entity;
    if (partial?.controller) this.controller = partial.controller;
    if (partial?.service) this.service = partial.service;
    if (partial?.module) this.module = partial.module;
  }
}

/**
 * Configuration for scaffold generation (controller, service, module)
 * Used by: generate-scaffold command
 */
export class ScaffoldGeneratorOptions {
  /** Base path for resolving resource file paths. Default: process.cwd() */
  basePath: string = process.cwd();

  /** Path templates for generating resources */
  templates: ScaffoldTemplatesConfig = new ScaffoldTemplatesConfig();

  constructor(partial?: Partial<ScaffoldGeneratorOptions>) {
    if (partial?.basePath) this.basePath = partial.basePath;
    if (partial?.templates) {
      this.templates = new ScaffoldTemplatesConfig(partial.templates);
    }
  }
}

/**
 * Main MikroNestForge configuration class (v2.0+)
 * This is the root configuration object exported from mikro-nest-forge.config.ts
 */
export class MikroNestForgeConfig {
  /** Configuration for DTO and mapping generation */
  mappingGeneratorOptions: MappingGeneratorOptions = new MappingGeneratorOptions();

  /** Configuration for resource scaffolding (controller, service, module) */
  scaffoldGeneratorOptions: ScaffoldGeneratorOptions = new ScaffoldGeneratorOptions();

  constructor(partial?: Partial<MikroNestForgeConfig>) {
    if (partial?.mappingGeneratorOptions) {
      this.mappingGeneratorOptions = new MappingGeneratorOptions(partial.mappingGeneratorOptions);
    }
    if (partial?.scaffoldGeneratorOptions) {
      this.scaffoldGeneratorOptions = new ScaffoldGeneratorOptions(partial.scaffoldGeneratorOptions);
    }
  }

  /**
   * Create a default configuration instance
   */
  static createDefault(): MikroNestForgeConfig {
    return new MikroNestForgeConfig();
  }
}

// ============================================================================
// LEGACY CONFIGURATION STRUCTURE (v1.x) - DEPRECATED
// ============================================================================

/**
 * Configuration for resource generators
 * @deprecated Use ScaffoldGeneratorOptions instead. This will be removed in v3.0.0
 */
export class ResourceGeneratorConfig {
  /** Base path for resolving resource file paths. Default: process.cwd() */
  basePath: string = process.cwd();

  /** Path templates for generating resources */
  templates: {
    /** Template for entity files. Use {dir} and {entity} placeholders. */
    entity: string;
    /** Template for controller files. Use {dir} and {entity} placeholders. */
    controller: string;
    /** Template for service files. Use {dir} and {entity} placeholders. */
    service: string;
    /** Template for module files. Use {dir} and {entity} placeholders. */
    module: string;
  } = {
    entity: "src/entities/{dir}/{entity}.ts",
    controller: "src/{dir}/{entity}.controller.ts",
    service: "src/{dir}/{entity}.service.ts",
    module: "src/{dir}/{entity}.module.ts",
  };

  constructor(partial?: Partial<ResourceGeneratorConfig>) {
    if (partial?.basePath) this.basePath = partial.basePath;
    if (partial?.templates) {
      this.templates = { ...this.templates, ...partial.templates };
    }
  }
}

/**
 * Configuration class for MikroNestForge
 * This class defines the structure of the TypeScript configuration file with default values
 * @deprecated Use MikroNestForgeConfig instead. This will be removed in v3.0.0
 */
export class DtoGeneratorConfig {
  /** Input pattern for entity files */
  input!: string;

  /** Output directory for generated DTOs */
  output!: string;

  /** Array of generator types to run */
  generators: GeneratorType[] = [
    "dto",
    "create-dto",
    "update-dto",
    "find-many-dto",
    "find-many-response-dto",
    "find-many-to-filter",
    "entity-to-dto",
    "create-dto-to-entity",
    "update-dto-to-entity",
  ];

  /** Enable parallel processing for faster generation */
  parallel: boolean = false;

  /** Set the number of concurrent workers for parallel processing */
  concurrency: number = 4;

  /** Configuration for resource generators (controller, service, module) */
  resources: ResourceGeneratorConfig = new ResourceGeneratorConfig();

  constructor(partial?: Partial<DtoGeneratorConfig>) {
    if (partial?.input) this.input = partial.input;
    if (partial?.output) this.output = partial.output;
    if (partial?.generators) this.generators = partial.generators;
    if (partial?.parallel !== undefined) this.parallel = partial.parallel;
    if (partial?.concurrency !== undefined) this.concurrency = partial.concurrency;
    if (partial?.resources) this.resources = new ResourceGeneratorConfig(partial.resources);
  }

  /**
   * Create a default configuration instance
   */
  static createDefault(): DtoGeneratorConfig {
    return new DtoGeneratorConfig();
  }
}

/**
 * Interface for backwards compatibility with existing code that expects an interface
 * @deprecated Use MikroNestForgeConfig instead. This will be removed in v3.0.0
 */
export interface IDtoGeneratorConfig {
  input: string;
  output: string;
  generators: GeneratorType[];
  parallel?: boolean;
  concurrency?: number;
  resources?: ResourceGeneratorConfig;
}

/**
 * Legacy options interface for backward compatibility
 * This maps the old boolean-based options to the new array-based system
 */
export interface LegacyGeneratorOptions {
  input: string;
  output: string;
  generateDto?: boolean;
  generateCreateDto?: boolean;
  generateUpdateDto?: boolean;
  generateFindManyDto?: boolean;
  generateFindManyResponseDto?: boolean;
  generateFindManyToFilter?: boolean;
  generateMapping?: boolean;
  generateCreateDtoToEntity?: boolean;
  generateUpdateDtoToEntity?: boolean;
  parallel?: boolean;
  concurrency?: number;
}

/**
 * Convert legacy options to new config format
 */
export function legacyToConfig(
  legacy: LegacyGeneratorOptions
): DtoGeneratorConfig {
  const generators: GeneratorType[] = [];

  // Only add generators that are explicitly enabled (or defaults)
  // Check if any specific generator flags are set
  const hasSpecificFlags =
    legacy.generateCreateDto ||
    legacy.generateUpdateDto ||
    legacy.generateFindManyDto ||
    legacy.generateFindManyResponseDto ||
    legacy.generateFindManyToFilter ||
    legacy.generateMapping ||
    legacy.generateCreateDtoToEntity ||
    legacy.generateUpdateDtoToEntity;

  if (hasSpecificFlags) {
    // Only add generators that are explicitly enabled
    if (legacy.generateDto) generators.push("dto");
    if (legacy.generateCreateDto) generators.push("create-dto");
    if (legacy.generateUpdateDto) generators.push("update-dto");
    if (legacy.generateFindManyDto) generators.push("find-many-dto");
    if (legacy.generateFindManyResponseDto)
      generators.push("find-many-response-dto");
    if (legacy.generateFindManyToFilter) generators.push("find-many-to-filter");
    if (legacy.generateMapping) generators.push("entity-to-dto");
    if (legacy.generateCreateDtoToEntity)
      generators.push("create-dto-to-entity");
    if (legacy.generateUpdateDtoToEntity)
      generators.push("update-dto-to-entity");
  } else {
    // Default behavior: only generate basic DTOs when no flags specified
    generators.push("dto");
  }

  return new DtoGeneratorConfig({
    input: legacy.input,
    output: legacy.output,
    generators,
    parallel: legacy.parallel,
    concurrency: legacy.concurrency,
  });
}

/**
 * Get default configuration values (for backwards compatibility)
 */
export const defaultConfig: Omit<IDtoGeneratorConfig, "input" | "output"> = {
  generators: [
    "dto",
    "create-dto",
    "update-dto",
    "find-many-dto",
    "find-many-response-dto",
    "find-many-to-filter",
    "entity-to-dto",
    "create-dto-to-entity",
    "update-dto-to-entity",
  ],
  parallel: false,
  concurrency: 4,
  resources: new ResourceGeneratorConfig(),
};

// ============================================================================
// CONVERSION FUNCTIONS (for migration support)
// ============================================================================

/**
 * Convert legacy DtoGeneratorConfig to new MikroNestForgeConfig format
 */
export function legacyToNewConfig(legacy: DtoGeneratorConfig): MikroNestForgeConfig {
  return new MikroNestForgeConfig({
    mappingGeneratorOptions: new MappingGeneratorOptions({
      entitiesGlob: legacy.input,
      outputDir: legacy.output,
      generators: legacy.generators,
      performance: new PerformanceConfig({
        enabled: legacy.parallel,
        workerCount: legacy.concurrency,
      }),
    }),
    scaffoldGeneratorOptions: new ScaffoldGeneratorOptions({
      basePath: legacy.resources?.basePath || process.cwd(),
      templates: new ScaffoldTemplatesConfig(legacy.resources?.templates),
    }),
  });
}

/**
 * Convert new MikroNestForgeConfig to legacy DtoGeneratorConfig format
 * (for internal use during migration)
 */
export function newToLegacyConfig(newConfig: MikroNestForgeConfig): DtoGeneratorConfig {
  return new DtoGeneratorConfig({
    input: newConfig.mappingGeneratorOptions.entitiesGlob,
    output: newConfig.mappingGeneratorOptions.outputDir,
    generators: newConfig.mappingGeneratorOptions.generators,
    parallel: newConfig.mappingGeneratorOptions.performance.enabled,
    concurrency: newConfig.mappingGeneratorOptions.performance.workerCount,
    resources: new ResourceGeneratorConfig({
      basePath: newConfig.scaffoldGeneratorOptions.basePath,
      templates: {
        entity: newConfig.scaffoldGeneratorOptions.templates.entity,
        controller: newConfig.scaffoldGeneratorOptions.templates.controller,
        service: newConfig.scaffoldGeneratorOptions.templates.service,
        module: newConfig.scaffoldGeneratorOptions.templates.module,
      },
    }),
  });
}
