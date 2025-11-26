import {
  DtoGeneratorConfig,
  ResourceGeneratorConfig,
  MikroNestForgeConfig,
  MappingGeneratorOptions,
  ScaffoldGeneratorOptions,
  PerformanceConfig
} from '../types/config.types';

/**
 * Enhanced configuration validation with detailed error reporting
 */
export class ConfigValidator {
  /**
   * Validate new MikroNestForgeConfig format
   */
  static validateNewFormat(config: MikroNestForgeConfig): void {
    this.validateMappingGeneratorOptions(config.mappingGeneratorOptions);
    this.validateScaffoldGeneratorOptions(config.scaffoldGeneratorOptions);
  }

  /**
   * Validate MappingGeneratorOptions
   */
  private static validateMappingGeneratorOptions(options: MappingGeneratorOptions): void {
    // Required fields
    if (!options.entitiesGlob) {
      throw new Error('Configuration field "mappingGeneratorOptions.entitiesGlob" is required and cannot be empty');
    }

    if (!options.outputDir) {
      throw new Error('Configuration field "mappingGeneratorOptions.outputDir" is required and cannot be empty');
    }

    // Type checks
    if (typeof options.entitiesGlob !== 'string') {
      throw new Error('Configuration field "mappingGeneratorOptions.entitiesGlob" must be a string');
    }

    if (typeof options.outputDir !== 'string') {
      throw new Error('Configuration field "mappingGeneratorOptions.outputDir" must be a string');
    }

    // Path validation
    if (options.entitiesGlob.trim() === '') {
      throw new Error('Configuration field "mappingGeneratorOptions.entitiesGlob" cannot be empty or whitespace');
    }

    if (options.outputDir.trim() === '') {
      throw new Error('Configuration field "mappingGeneratorOptions.outputDir" cannot be empty or whitespace');
    }

    // Generators validation
    if (!Array.isArray(options.generators)) {
      throw new Error('Configuration field "mappingGeneratorOptions.generators" must be an array of generator types');
    }

    if (options.generators.length === 0) {
      throw new Error('Configuration field "mappingGeneratorOptions.generators" cannot be empty - at least one generator must be specified');
    }

    const validGenerators = [
      'dto', 'create-dto', 'update-dto', 'find-many-dto',
      'find-many-response-dto', 'find-many-to-filter', 'entity-to-dto',
      'create-dto-to-entity', 'update-dto-to-entity'
    ];

    const invalidGenerators = options.generators.filter(
      gen => !validGenerators.includes(gen)
    );

    if (invalidGenerators.length > 0) {
      throw new Error(
        `Invalid generator type(s): "${invalidGenerators.join('", "')}". ` +
        `Valid types are: ${validGenerators.join(', ')}`
      );
    }

    // Performance validation
    this.validatePerformanceConfig(options.performance);
  }

  /**
   * Validate PerformanceConfig
   */
  private static validatePerformanceConfig(performance: PerformanceConfig): void {
    if (performance.enabled !== undefined && typeof performance.enabled !== 'boolean') {
      throw new Error('Configuration field "performance.enabled" must be a boolean (true/false)');
    }

    if (performance.workerCount !== undefined) {
      let workerCount = performance.workerCount;

      // Convert string values to numbers if possible
      if (typeof workerCount === 'string') {
        const parsed = parseInt(workerCount, 10);
        if (isNaN(parsed)) {
          throw new Error('Configuration field "performance.workerCount" must be a number');
        }
        workerCount = parsed;
      }

      if (typeof workerCount !== 'number') {
        throw new Error('Configuration field "performance.workerCount" must be a number');
      }
      if (workerCount < 1) {
        throw new Error('Configuration field "performance.workerCount" must be a positive number (minimum 1)');
      }
      if (!Number.isInteger(workerCount)) {
        throw new Error('Configuration field "performance.workerCount" must be an integer');
      }
    }
  }

  /**
   * Validate ScaffoldGeneratorOptions
   */
  private static validateScaffoldGeneratorOptions(options: ScaffoldGeneratorOptions): void {
    if (options.basePath && typeof options.basePath !== 'string') {
      throw new Error('Configuration field "scaffoldGeneratorOptions.basePath" must be a string');
    }

    if (options.templates) {
      const templates = options.templates;
      for (const key of ['entity', 'controller', 'service', 'module']) {
        const template = templates[key as keyof typeof templates];
        if (template && typeof template !== 'string') {
          throw new Error(`Configuration field "scaffoldGeneratorOptions.templates.${key}" must be a string`);
        }
      }
    }
  }

  /**
   * Validate legacy DtoGeneratorConfig format (deprecated)
   */
  static validate(config: DtoGeneratorConfig): void {
    this.validateRequiredFields(config);
    this.validateGenerators(config);
    this.validateParallelProcessing(config);
    this.validatePaths(config);
    this.validateResources(config);
  }

  private static validateRequiredFields(config: DtoGeneratorConfig): void {
    if (!config.input) {
      throw new Error('Configuration field "input" is required and cannot be empty');
    }

    if (!config.output) {
      throw new Error('Configuration field "output" is required and cannot be empty');
    }

    // Check if fields are strings
    if (typeof config.input !== 'string') {
      throw new Error('Configuration field "input" must be a string');
    }

    if (typeof config.output !== 'string') {
      throw new Error('Configuration field "output" must be a string');
    }
  }

  private static validateGenerators(config: DtoGeneratorConfig): void {
    if (!Array.isArray(config.generators)) {
      throw new Error('Configuration field "generators" must be an array of generator types');
    }

    if (config.generators.length === 0) {
      throw new Error('Configuration field "generators" cannot be empty - at least one generator must be specified');
    }

    const validGenerators = [
      'dto', 'create-dto', 'update-dto', 'find-many-dto',
      'find-many-response-dto', 'find-many-to-filter', 'entity-to-dto',
      'create-dto-to-entity', 'update-dto-to-entity'
    ];

    const invalidGenerators = config.generators.filter(
      gen => !validGenerators.includes(gen)
    );

    if (invalidGenerators.length > 0) {
      throw new Error(
        `Invalid generator type(s): "${invalidGenerators.join('", "')}". ` +
        `Valid types are: ${validGenerators.join(', ')}`
      );
    }
  }

  private static validateParallelProcessing(config: DtoGeneratorConfig): void {
    if (config.parallel !== undefined && typeof config.parallel !== 'boolean') {
      throw new Error('Configuration field "parallel" must be a boolean (true/false)');
    }

    if (config.concurrency !== undefined) {
      // Convert string values to numbers if possible
      let concurrencyValue = config.concurrency;
      if (typeof concurrencyValue === 'string') {
        const parsed = parseInt(concurrencyValue, 10);
        if (isNaN(parsed)) {
          throw new Error('Configuration field "concurrency" must be a number');
        }
        concurrencyValue = parsed;
      }

      if (typeof concurrencyValue !== 'number') {
        throw new Error('Configuration field "concurrency" must be a number');
      }
      if (concurrencyValue < 1) {
        throw new Error('Configuration field "concurrency" must be a positive number (minimum 1)');
      }
      if (!Number.isInteger(concurrencyValue)) {
        throw new Error('Configuration field "concurrency" must be an integer');
      }
    }
  }

  private static validatePaths(config: DtoGeneratorConfig): void {
    // Input and output paths should be valid relative or absolute paths
    if (config.input.trim() === '') {
      throw new Error('Configuration field "input" cannot be empty or whitespace');
    }

    if (config.output.trim() === '') {
      throw new Error('Configuration field "output" cannot be empty or whitespace');
    }

    // Check for potentially dangerous path patterns (though these are likely intentional)
    // This is a basic check to avoid common path traversal issues
    if (config.input.includes('../..') && !config.input.startsWith('../')) {
      // This is likely intentional use, so we'll allow it but warn
      console.warn('⚠️  Warning: input path contains parent directory references - ensure this is intentional');
    }
  }

  private static validateResources(config: DtoGeneratorConfig): void {
    if (!config.resources) {
      return;
    }

    if (config.resources.basePath && typeof config.resources.basePath !== 'string') {
      throw new Error('Configuration field "resources.basePath" must be a string');
    }

    if (config.resources.templates) {
      const templates = config.resources.templates;
      for (const key of ['entity', 'controller', 'service', 'module']) {
        const template = templates[key as keyof typeof templates];
        if (template && typeof template !== 'string') {
          throw new Error(`Configuration field "resources.templates.${key}" must be a string`);
        }
      }
    }
  }

  /**
   * Validate and apply defaults to a configuration using the new class-based approach
   */
  static validateAndApplyDefaults(config: Partial<DtoGeneratorConfig>): DtoGeneratorConfig {
    // Create a new instance with the provided config, which automatically applies defaults
    const configInstance = new DtoGeneratorConfig(config);

    // Validate the created instance
    this.validate(configInstance);

    return configInstance;
  }
}

/**
 * Validate new MikroNestForgeConfig format
 * @param config Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateNewConfig(config: MikroNestForgeConfig): void {
  ConfigValidator.validateNewFormat(config);
}

/**
 * Validate legacy DtoGeneratorConfig format (deprecated)
 * @param config Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateConfig(config: DtoGeneratorConfig): void {
  ConfigValidator.validate(config);
}

/**
 * Validate and apply defaults to a configuration
 */
export function validateAndApplyDefaults(config: Partial<DtoGeneratorConfig>): DtoGeneratorConfig {
  return ConfigValidator.validateAndApplyDefaults(config);
}