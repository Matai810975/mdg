import {
  DtoGeneratorConfig,
  LegacyGeneratorOptions,
} from "../types/config.types";

// Import the shared configuration merger functions
import {
  mergeConfigWithCliOptions as sharedMergeConfigWithCliOptions,
  mergeConfigWithInteractiveAnswers as sharedMergeConfigWithInteractiveAnswers,
  loadAndMergeConfig as sharedLoadAndMergeConfig
} from "../shared-config/config-merger";

/**
 * Merge configuration file with command line options
 * Command line options take priority over configuration file values
 */
export function mergeConfigWithCliOptions(
  baseConfig: DtoGeneratorConfig,
  cliOptions: Partial<LegacyGeneratorOptions>
): DtoGeneratorConfig {
  return sharedMergeConfigWithCliOptions(baseConfig, cliOptions);
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
  return sharedMergeConfigWithInteractiveAnswers(baseConfig, answers);
}

/**
 * Load and merge configuration with CLI options
 * Returns null if no configuration file is found
 */
export async function loadAndMergeConfig(
  cliOptions: Partial<LegacyGeneratorOptions> = {}
): Promise<DtoGeneratorConfig | null> {
  return sharedLoadAndMergeConfig(cliOptions);
}
