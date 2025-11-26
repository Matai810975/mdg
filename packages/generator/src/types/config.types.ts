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
 * Used by: update-dto-mapping command
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
