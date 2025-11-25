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

/**
 * Configuration for resource generators
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
 * Configuration class for the mikro-dto-generator
 * This class defines the structure of the TypeScript configuration file with default values
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
