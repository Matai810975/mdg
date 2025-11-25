import path from 'path';
import fs from 'fs';
import {
  DtoGeneratorConfig,
  defaultConfig
} from '../types/config.types';
import { validateAndApplyDefaults } from './config-validator';

/**
 * Default configuration file names to look for (in priority order)
 */
const DEFAULT_CONFIG_FILES = [
  'mikro-dto-generator.config.ts',  // Primary default
  'mikro-dto-generator.config.js',  // Primary default (JS version)
  'dto-generator.config.ts',        // Legacy support
  'dto-generator.config.js',        // Legacy support (JS version)
  'mikro-dto.config.ts',            // Alternative naming
  'mikro-dto.config.js',            // Alternative naming (JS version)
  '.dto-generatorrc.ts',            // Hidden file support
  '.dto-generatorrc.js'             // Hidden file support (JS version)
];

/**
 * Load configuration from a TypeScript or JavaScript file
 * @param configPath Path to the configuration file
 * @returns Loaded configuration
 */
export async function loadConfigFile(configPath: string): Promise<DtoGeneratorConfig> {
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

    // Validate and apply defaults using enhanced validation
    const finalConfig = validateAndApplyDefaults(config as Partial<DtoGeneratorConfig>);

    return finalConfig;
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
 * @returns Loaded configuration or null if no config file found
 */
export async function findAndLoadConfig(): Promise<DtoGeneratorConfig | null> {
  for (const configFile of DEFAULT_CONFIG_FILES) {
    const configPath = path.resolve(process.cwd(), configFile);
    if (fs.existsSync(configPath)) {
      return await loadConfigFile(configFile);
    }
  }
  return null;
}