import {
  DtoGeneratorConfig,
  LegacyGeneratorOptions,
  GeneratorType,
} from '../types/config.types';
import { validateAndApplyDefaults } from './config-validator';

/**
 * Merge configuration file with command line options
 * Command line options take priority over configuration file values
 */
export function mergeConfigWithCliOptions(
  baseConfig: DtoGeneratorConfig,
  cliOptions: Partial<LegacyGeneratorOptions>
): DtoGeneratorConfig {
  const result: DtoGeneratorConfig = { ...baseConfig };

  // Override input and output if provided in CLI
  if (cliOptions.input) {
    result.input = cliOptions.input;
  }

  if (cliOptions.output) {
    result.output = cliOptions.output;
  }

  // Handle generator overrides from CLI
  if (hasCliGeneratorFlags(cliOptions)) {
    // CLI has specific generator flags, override the generators array
    const generators: GeneratorType[] = [];

    if (cliOptions.generateDto) generators.push('dto');
    if (cliOptions.generateCreateDto) generators.push('create-dto');
    if (cliOptions.generateUpdateDto) generators.push('update-dto');
    if (cliOptions.generateFindManyDto) generators.push('find-many-dto');
    if (cliOptions.generateFindManyResponseDto)
      generators.push('find-many-response-dto');
    if (cliOptions.generateFindManyToFilter)
      generators.push('find-many-to-filter');
    if (cliOptions.generateMapping) generators.push('entity-to-dto');
    if (cliOptions.generateCreateDtoToEntity)
      generators.push('create-dto-to-entity');
    if (cliOptions.generateUpdateDtoToEntity)
      generators.push('update-dto-to-entity');

    result.generators = generators.length === 0 ? result.generators : generators;
  }

  // Override parallel and concurrency if provided
  if (cliOptions.parallel !== undefined) {
    result.parallel = cliOptions.parallel;
  }

  if (cliOptions.concurrency !== undefined) {
    result.concurrency = cliOptions.concurrency;
  }

  // Validate the merged configuration
  return validateAndApplyDefaults(result);
}

/**
 * Check if CLI options contain any generator flags
 */
function hasCliGeneratorFlags(
  options: Partial<LegacyGeneratorOptions>
): boolean {
  return !!(
    options.generateDto !== undefined ||
    options.generateCreateDto ||
    options.generateUpdateDto ||
    options.generateFindManyDto ||
    options.generateFindManyResponseDto ||
    options.generateFindManyToFilter ||
    options.generateMapping ||
    options.generateCreateDtoToEntity ||
    options.generateUpdateDtoToEntity
  );
}

/**
 * Merge configuration file with interactive CLI answers
 * Interactive answers take priority over configuration file values
 */
export function mergeConfigWithInteractiveAnswers(
  baseConfig: DtoGeneratorConfig,
  answers: {
    inputPattern: string;
    outputPath: string;
    dtoTypes: string[];
    mappingTypes: string[];
    parallel: boolean;
    concurrency: number;
  }
): DtoGeneratorConfig {
  const result: DtoGeneratorConfig = { ...baseConfig };

  // Override input and output
  result.input = answers.inputPattern;
  result.output = answers.outputPath;

  // Convert interactive answers to generators array
  const generators: GeneratorType[] = [];

  if (answers.dtoTypes.includes('dto')) generators.push('dto');
  if (answers.dtoTypes.includes('create')) generators.push('create-dto');
  if (answers.dtoTypes.includes('update')) generators.push('update-dto');
  if (answers.dtoTypes.includes('findMany')) generators.push('find-many-dto');
  if (answers.dtoTypes.includes('findManyResponse'))
    generators.push('find-many-response-dto');

  if (answers.mappingTypes.includes('entityToDto'))
    generators.push('entity-to-dto');
  if (answers.mappingTypes.includes('createDtoToEntity'))
    generators.push('create-dto-to-entity');
  if (answers.mappingTypes.includes('updateDtoToEntity'))
    generators.push('update-dto-to-entity');
  if (answers.mappingTypes.includes('findManyToFilter'))
    generators.push('find-many-to-filter');

  result.generators = generators;
  result.parallel = answers.parallel;
  result.concurrency = answers.concurrency;

  // Validate the merged configuration
  return validateAndApplyDefaults(result);
}

/**
 * Load and merge configuration with CLI options
 * Returns null if no configuration file is found
 */
export async function loadAndMergeConfig(
  cliOptions: Partial<LegacyGeneratorOptions> = {}
): Promise<DtoGeneratorConfig | null> {
  const { findAndLoadConfig } = await import('./config-loader');

  const baseConfig = await findAndLoadConfig();

  if (!baseConfig) {
    return null;
  }

  return mergeConfigWithCliOptions(baseConfig, cliOptions);
}