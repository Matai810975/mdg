import path from 'path';
import fs from 'fs';
import {
  DtoGeneratorConfig,
  MikroNestForgeConfig,
  legacyToNewConfig,
  defaultConfig
} from '../types/config.types';
import { validateAndApplyDefaults } from './config-validator';

/**
 * Default configuration file names to look for (in priority order)
 */
const DEFAULT_CONFIG_FILES = [
  'mikro-nest-forge.config.ts',     // Primary default
  'mikro-nest-forge.config.js',     // Primary default (JS version)
  'mikro-dto-generator.config.ts',  // Legacy support
  'mikro-dto-generator.config.js',  // Legacy support (JS version)
  'dto-generator.config.ts',        // Legacy support
  'dto-generator.config.js',        // Legacy support (JS version)
  'mikro-dto.config.ts',            // Alternative naming
  'mikro-dto.config.js',            // Alternative naming (JS version)
  '.mikro-nest-forge.config.ts',    // Hidden file support
  '.mikro-nest-forge.config.js',    // Hidden file support (JS version)
  '.dto-generatorrc.ts',            // Hidden file support
  '.dto-generatorrc.js'             // Hidden file support (JS version)
];

/**
 * Detect if config is using the new MikroNestForgeConfig format
 */
function isNewConfigFormat(config: any): config is MikroNestForgeConfig {
  return config instanceof MikroNestForgeConfig ||
    (config && 'mappingGeneratorOptions' in config && 'scaffoldGeneratorOptions' in config);
}

/**
 * Show deprecation warning for legacy config format
 */
function showDeprecationWarning(): void {
  console.warn('⚠️  DEPRECATION WARNING:');
  console.warn('   You are using the legacy DtoGeneratorConfig format.');
  console.warn('   Please migrate to the new MikroNestForgeConfig format.');
  console.warn('   The legacy format will be removed in v3.0.0.');
  console.warn('   See migration guide for details.');
  console.warn('');
}

/**
 * Load configuration from a TypeScript or JavaScript file
 * Supports both new (MikroNestForgeConfig) and legacy (DtoGeneratorConfig) formats
 * @param configPath Path to the configuration file
 * @param returnLegacyFormat If true, always return DtoGeneratorConfig (default: true for backward compatibility)
 * @returns Loaded configuration
 */
export async function loadConfigFile(
  configPath: string,
  returnLegacyFormat: boolean = true
): Promise<DtoGeneratorConfig | MikroNestForgeConfig> {
  const resolvedPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Configuration file not found: ${resolvedPath}`);
  }

  const isTypeScript = configPath.endsWith('.ts');
  const isJavaScript = configPath.endsWith('.js');

  if (!isTypeScript && !isJavaScript) {
    throw new Error(`Configuration file must be a .ts or .js file: ${configPath}`);
  }

  try {
    let config;

    if (isTypeScript) {
      // Check if we're running under ts-node (development mode)
      const isRunningUnderTsNode = (process as any)[Symbol.for('ts-node.register.instance')];

      if (isRunningUnderTsNode) {
        // We're in development mode with ts-node, can require TypeScript directly
        delete require.cache[resolvedPath];
        const configModule = require(resolvedPath);
        config = configModule.default || configModule;
      } else {
        // We're in production mode, use ts-node programmatically
        try {
          const tsNode = require('ts-node');

          // Register ts-node globally
          tsNode.register({
            compilerOptions: {
              module: 'commonjs',
              target: 'es2017',
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
              skipLibCheck: true,
            }
          });

          // Now require the TypeScript file
          delete require.cache[resolvedPath];
          const configModule = require(resolvedPath);
          config = configModule.default || configModule;
        } catch (tsNodeError) {
          throw new Error(
            `Failed to load TypeScript config file using ts-node.\n` +
            `Please check that your config file is valid TypeScript.\n` +
            `Original error: ${tsNodeError instanceof Error ? tsNodeError.message : String(tsNodeError)}`
          );
        }
      }
    } else {
      // For JavaScript files, use require directly
      delete require.cache[resolvedPath];
      const configModule = require(resolvedPath);
      config = configModule.default || configModule;
    }

    // Detect config format and handle appropriately
    const isNewFormat = isNewConfigFormat(config);

    if (isNewFormat) {
      // Using new format
      console.log('✓ Loaded DTO configuration (new format)');

      if (returnLegacyFormat) {
        // Validate new format first, then convert to legacy format for backward compatibility
        const { validateNewConfig } = require('./config-validator');
        const { newToLegacyConfig } = require('../types/config.types');
        validateNewConfig(config as MikroNestForgeConfig);
        return validateAndApplyDefaults(newToLegacyConfig(config) as Partial<DtoGeneratorConfig>);
      } else {
        // Validate and return new format
        const { validateNewConfig } = require('./config-validator');
        validateNewConfig(config as MikroNestForgeConfig);
        return config as MikroNestForgeConfig;
      }
    } else {
      // Using legacy format
      showDeprecationWarning();
      console.log('✓ Loaded DTO configuration (legacy format)');

      // Validate and apply defaults using enhanced validation
      const finalConfig = validateAndApplyDefaults(config as Partial<DtoGeneratorConfig>);

      return finalConfig;
    }
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('not found') ||
      error.message.includes('Cannot load TypeScript config')
    )) {
      throw error;
    }
    throw new Error(`Failed to load configuration from ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find and load configuration file from default locations
 * @param returnLegacyFormat If true, always return DtoGeneratorConfig (default: true for backward compatibility)
 * @returns Loaded configuration or null if no config file found
 */
export async function findAndLoadConfig(
  returnLegacyFormat: boolean = true
): Promise<DtoGeneratorConfig | MikroNestForgeConfig | null> {
  for (const configFile of DEFAULT_CONFIG_FILES) {
    const configPath = path.resolve(process.cwd(), configFile);
    if (fs.existsSync(configPath)) {
      return await loadConfigFile(configFile, returnLegacyFormat);
    }
  }
  return null;
}

/**
 * Load configuration file, always returning legacy DtoGeneratorConfig format
 * This is a type-safe helper for code that expects DtoGeneratorConfig
 * @param configPath Path to the configuration file
 * @returns Loaded configuration in legacy format
 */
export async function loadLegacyConfigFile(configPath: string): Promise<DtoGeneratorConfig> {
  const config = await loadConfigFile(configPath, true);
  return config as DtoGeneratorConfig;
}

/**
 * Find and load configuration file, always returning legacy DtoGeneratorConfig format
 * This is a type-safe helper for code that expects DtoGeneratorConfig
 * @returns Loaded configuration in legacy format or null if no config file found
 */
export async function findAndLoadLegacyConfig(): Promise<DtoGeneratorConfig | null> {
  const config = await findAndLoadConfig(true);
  return config as DtoGeneratorConfig | null;
}