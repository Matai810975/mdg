import path from 'path';
import fs from 'fs';
import { MikroNestForgeConfig } from '../types/config.types';
import { validateNewConfig } from './config-validator';

/**
 * Default configuration file names to look for (in priority order)
 */
const DEFAULT_CONFIG_FILES = [
  'mikro-nest-forge.config.ts',     // Primary default
  'mikro-nest-forge.config.js',     // Primary default (JS version)
  '.mikro-nest-forge.config.ts',    // Hidden file support
  '.mikro-nest-forge.config.js',    // Hidden file support (JS version)
];

/**
 * Load configuration from a TypeScript or JavaScript file
 * @param configPath Path to the configuration file
 * @returns Loaded configuration
 */
export async function loadConfigFile(configPath: string): Promise<MikroNestForgeConfig> {
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

    // Validate config format
    if (!(config instanceof MikroNestForgeConfig) &&
        !('mappingGeneratorOptions' in config && 'scaffoldGeneratorOptions' in config)) {
      throw new Error(
        `Invalid configuration format. Expected MikroNestForgeConfig.\n` +
        `Please ensure your config file exports a MikroNestForgeConfig instance.`
      );
    }

    // Validate and return new format
    validateNewConfig(config as MikroNestForgeConfig);
    console.log('✓ Loaded MikroNestForge configuration');

    return config as MikroNestForgeConfig;
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('not found') ||
      error.message.includes('Invalid configuration format')
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
export async function findAndLoadConfig(): Promise<MikroNestForgeConfig | null> {
  for (const configFile of DEFAULT_CONFIG_FILES) {
    const configPath = path.resolve(process.cwd(), configFile);
    if (fs.existsSync(configPath)) {
      return await loadConfigFile(configFile);
    }
  }
  return null;
}
