#!/usr/bin/env node
import { program } from "commander";
import { Project } from "ts-morph";
import fs from "fs";
import path from "path";
import { generateDtoFiles } from "./generators/data-dto-generator";
import { generateMappingFiles } from "./generators/entity-to-dto-generator";
import { generateCreateDtoFiles } from "./generators/create-dto-generator";
import { generateUpdateDtoFiles } from "./generators/update-dto-generator";
import { generateFindManyDtoFiles } from "./generators/find-many-dto-generator";
import { generateFindManyResponseDtoFiles } from "./generators/find-many-response-dto-generator";
import { generateFindManyToFilterMappingFiles } from "./generators/find-many-to-filter-generator";
import { generateCreateDtoToEntityMappingFiles } from "./generators/create-dto-to-entity-generator";
import { generateUpdateDtoToEntityMappingFiles } from "./generators/update-dto-to-entity-generator";
import { generateDtosInParallel } from "./parallel-dto-generator";
import { DtoGeneratorError } from "./errors/DtoGeneratorError";
import { logError } from "./errors/error-utils";
import {
  MikroNestForgeConfig,
} from "./types/config.types";
import { loadConfigFile, findAndLoadConfig } from "./shared-config/config-loader";
import { validateNewConfig } from "./shared-config/config-validator";
import { runCli as runResourceCli } from "./resource-cli"; // Import the resource CLI

/**
 * Load configuration with support for specific config file path
 */
async function loadConfiguration(options: any): Promise<MikroNestForgeConfig> {
  let config: MikroNestForgeConfig | null = null;

  if (options.config) {
    // Load specific configuration file
    config = await loadConfigFile(options.config);
    console.log(`✓ Loaded configuration from: ${options.config}`);
  } else {
    // Auto-detect configuration file
    config = await findAndLoadConfig();
    if (config) {
      console.log("✓ Using configuration file");
    }
  }

  if (!config) {
    console.log("⚠️  No configuration file found");
    console.log(
      "💡 Create a mikro-nest-forge.config.ts file with your settings"
    );
    console.error("Error: Configuration file is required.");
    console.error(
      "Please create a mikro-nest-forge.config.ts file in your project root."
    );
    process.exit(1);
  }

  return config;
}

/**
 * Validate configuration file
 */
async function validateConfigMode(configPath?: string): Promise<void> {
  try {
    let config;

    if (configPath) {
      config = await loadConfigFile(configPath);
      console.log(`✓ Loaded configuration from: ${configPath}`);
    } else {
      const { findAndLoadConfig } = await import("./shared-config/config-loader");
      config = await findAndLoadConfig();
      if (!config) {
        console.error("❌ No configuration file found");
        process.exit(1);
      }
      console.log("✓ Found and loaded configuration file");
    }

    validateNewConfig(config);
    console.log("✅ Configuration is valid!");

    console.log("");
    console.log("📋 Configuration Summary:");
    console.log(`  Input: ${config.mappingGeneratorOptions.entitiesGlob}`);
    console.log(`  Output: ${config.mappingGeneratorOptions.outputDir}`);
    console.log(`  Generators: ${config.mappingGeneratorOptions.generators.join(", ")}`);
    if (config.mappingGeneratorOptions.performance.enabled) {
      console.log(
        `  Parallel: enabled (concurrency: ${config.mappingGeneratorOptions.performance.workerCount})`
      );
    } else {
      console.log(`  Parallel: disabled`);
    }
  } catch (error) {
    console.error("❌ Configuration validation failed:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Main function that can be imported as a module
 * @param options Generator options
 */
export async function generateDtos(options: MikroNestForgeConfig): Promise<void> {
  const input = options.mappingGeneratorOptions.entitiesGlob;
  const output = options.mappingGeneratorOptions.outputDir;

  if (!input || !output) {
    throw new Error(
      "Error: Please provide both input pattern and output paths."
    );
  }

  try {
    const project = new Project({
      tsConfigFilePath: "./tsconfig.json", // Load the tsconfig.json to properly resolve baseUrl
      skipAddingFilesFromTsConfig: true, // Skip automatically adding files from tsconfig include patterns
    });
    // Support different entity file selection patterns
    // If the input already contains a glob pattern, use it directly
    // Otherwise, default to the original behavior
    const entityPattern = input;

    project.addSourceFilesAtPaths(entityPattern);

    // Automatically resolve and add imported entity files
    // This ensures that when processing a single entity file, referenced entities are also loaded
    const initialSourceFiles = project.getSourceFiles();

    // For each loaded file, get its imports and add referenced entity files
    for (const sourceFile of initialSourceFiles) {
      const imports = sourceFile.getImportDeclarations();
      for (const imp of imports) {
        const moduleSpecifier = imp.getModuleSpecifierValue();
        // Check if this is a local import (relative or baseUrl-based)
        if (
          moduleSpecifier.startsWith("./") ||
          moduleSpecifier.startsWith("../") ||
          moduleSpecifier.startsWith("src/")
        ) {
          try {
            // Resolve the import relative to the original source file's directory
            const sourceFileDir = path.dirname(sourceFile.getFilePath());
            let resolvedPath: string;
            if (
              moduleSpecifier.startsWith("./") ||
              moduleSpecifier.startsWith("../")
            ) {
              // For relative paths, resolve relative to source file
              resolvedPath = path.resolve(sourceFileDir, moduleSpecifier);
              if (!resolvedPath.endsWith(".ts")) {
                resolvedPath += ".ts"; // Add .ts extension if not present
              }
            } else {
              // For baseUrl imports (like 'src/test/base-entity'), resolve relative to project root
              resolvedPath = path.join(process.cwd(), moduleSpecifier);
              if (!resolvedPath.endsWith(".ts")) {
                resolvedPath += ".ts"; // Add .ts extension if not present
              }
            }

            // Add the resolved file to the project
            if (fs.existsSync(resolvedPath)) {
              project.addSourceFileAtPath(resolvedPath);
            }
          } catch (e) {
            // Ignore errors for files that can't be resolved
          }
        }
      }
    }

    const sourceFiles = project.getSourceFiles();

    // Check if we should use parallel processing
    const shouldUseParallel =
      options.mappingGeneratorOptions.performance.enabled &&
      options.mappingGeneratorOptions.generators.some((gen) =>
        ["dto", "create-dto", "update-dto", "find-many-dto"].includes(gen)
      );

    if (shouldUseParallel) {
      const parallelOptions = {
        generateDto: options.mappingGeneratorOptions.generators.includes("dto"),
        generateCreateDto: options.mappingGeneratorOptions.generators.includes("create-dto"),
        generateUpdateDto: options.mappingGeneratorOptions.generators.includes("update-dto"),
        generateFindManyDto: options.mappingGeneratorOptions.generators.includes("find-many-dto"),
        concurrencyLimit: options.mappingGeneratorOptions.performance.workerCount,
      };

      await generateDtosInParallel(
        {
          project,
          sourceFiles,
          outputPath: output,
        },
        parallelOptions
      );
    }

    // Process each generator type
    for (const generator of options.mappingGeneratorOptions.generators) {
      try {
        switch (generator) {
          case "dto":
            if (!shouldUseParallel) {
              generateDtoFiles({
                project,
                sourceFiles,
                outputPath: output,
              });
            }
            break;

          case "create-dto":
            if (!shouldUseParallel) {
              generateCreateDtoFiles({
                project,
                sourceFiles,
                outputPath: output,
              });
            }
            break;

          case "update-dto":
            if (!shouldUseParallel) {
              generateUpdateDtoFiles({
                project,
                sourceFiles,
                outputPath: output,
              });
            }
            break;

          case "find-many-dto":
            if (!shouldUseParallel) {
              generateFindManyDtoFiles({
                project,
                sourceFiles,
                outputPath: output,
              });
            }
            break;

          case "find-many-response-dto":
            generateFindManyResponseDtoFiles({
              project,
              sourceFiles,
              outputPath: output,
            });
            break;

          case "find-many-to-filter":
            generateFindManyToFilterMappingFiles({
              project,
              sourceFiles,
              outputPath: output,
            });
            break;

          case "entity-to-dto":
            generateMappingFiles({
              project,
              sourceFiles,
              outputPath: output,
            });
            break;

          case "create-dto-to-entity":
            generateCreateDtoToEntityMappingFiles({
              project,
              sourceFiles,
              outputPath: output,
            });
            break;

          case "update-dto-to-entity":
            generateUpdateDtoToEntityMappingFiles({
              project,
              sourceFiles,
              outputPath: output,
            });
            break;

          default:
            throw new DtoGeneratorError(
              `Unknown generator type: ${generator}`,
              "UNKNOWN_GENERATOR",
              { generatorType: generator }
            );
        }
      } catch (error) {
        if (error instanceof DtoGeneratorError) {
          logError(error, {
            operation: `generate-${generator}`,
            filePath: output,
          });
          throw error;
        }
        throw error;
      }
    }

    // Copy the to-copy directory contents to the output directory only if any DTO generators are enabled
    const hasDtoGenerators = options.mappingGeneratorOptions.generators.some((gen) =>
      [
        "dto",
        "create-dto",
        "update-dto",
        "find-many-dto",
        "find-many-response-dto",
        "find-many-to-filter",
      ].includes(gen)
    );

    if (hasDtoGenerators) {
      try {
        copyToCopyDirectory(output);
      } catch (error) {
        if (error instanceof DtoGeneratorError) {
          logError(error, {
            operation: "copy-to-copy-directory",
            filePath: output,
          });
          throw error;
        }
        throw error;
      }
    }

    await project.save();
  } catch (error) {
    if (error instanceof DtoGeneratorError) {
      logError(error, { operation: "generate-dtos", filePath: output });
      throw error;
    } else if (error instanceof Error) {
      const wrappedError = new DtoGeneratorError(
        `Unexpected error during DTO generation: ${error.message}`,
        "UNEXPECTED_ERROR",
        { operation: "generate-dtos", filePath: output }
      );
      logError(wrappedError, {
        operation: "generate-dtos",
        filePath: output,
      });
      throw wrappedError;
    } else {
      const wrappedError = new DtoGeneratorError(
        `Unexpected error during DTO generation: ${String(error)}`,
        "UNEXPECTED_ERROR",
        { operation: "generate-dtos", filePath: output }
      );
      logError(wrappedError, {
        operation: "generate-dtos",
        filePath: output,
      });
      throw wrappedError;
    }
  }
}

/**
 * Copy the contents of the to-copy directory to the output directory
 * @param outputPath The output directory path
 */
function copyToCopyDirectory(outputPath: string): void {
  // Get the root directory of the package (two levels up from src/index.ts)
  const packageRoot = path.join(__dirname, "..");

  // For the built version, the to-copy directory is in dist/to-copy
  // For the dev version, we check both dist and src locations
  const toCopyDirBuilt = path.join(packageRoot, "dist", "to-copy");
  const toCopyDirSrc = path.join(packageRoot, "src", "to-copy");

  // Use the built version if it exists, otherwise fall back to src (for development)
  const toCopyDir = fs.existsSync(toCopyDirBuilt)
    ? toCopyDirBuilt
    : toCopyDirSrc;

  if (fs.existsSync(toCopyDir)) {
    copyDirectory(toCopyDir, outputPath);
  }
}

/**
 * Recursively copy a directory
 * @param src Source directory
 * @param dest Destination directory
 */
function copyDirectory(src: string, dest: string): void {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// CLI entry point with subcommands for MikroNestForge
if (require.main === module) {
  program
    .name("mn-forge")
    .description("MikroNestForge - CLI tool to generate NestJS DTOs, mappings, and resource scaffolding from MikroORM entities.")
    .version("0.0.1");

  // update-dto-mapping subcommand
  program
    .command("update-dto-mapping")
    .description("Generate and update DTOs and mapping functions from MikroORM entities")
    .option("-c, --config <path>", "Path to a specific configuration file")
    .option(
      "--parallel",
      "Override config: enable parallel processing for faster generation",
      false
    )
    .option(
      "--concurrency <number>",
      "Override config: set the number of concurrent workers for parallel processing"
    )
    .option(
      "--validate",
      "Only validate the configuration file without generating DTOs",
      false
    )
    .action((options) => {
      const start = new Date();

      // Handle validation mode
      if (options.validate) {
        validateConfigMode(options.config).catch((error) => {
          console.error("Configuration validation failed:", error);
          process.exit(1);
        });
      } else {
        // Load configuration file
        loadConfiguration(options)
          .then((config) => {
            // Apply CLI overrides if provided
            if (options.parallel !== undefined && options.parallel !== false) {
              config.mappingGeneratorOptions.performance.enabled = true;
            }
            if (options.concurrency) {
              const concurrency = parseInt(options.concurrency, 10);
              if (isNaN(concurrency) || concurrency < 1) {
                console.error("Error: --concurrency must be a positive number");
                process.exit(1);
              }
              config.mappingGeneratorOptions.performance.workerCount = concurrency;
            }

            return generateDtos(config);
          })
          .then(() => {
            const end = new Date();
            console.log(
              `start:${start},end:${end},total:${
                end.getTime() - start.getTime()
              }`
            );
          })
          .catch((error) => {
            if (error instanceof DtoGeneratorError) {
              console.error(`\n[ERROR] ${error.message}`);
              if (error.context && Object.keys(error.context).length > 0) {
                console.error(
                  `Context: ${JSON.stringify(error.context, null, 2)}`
                );
              }
            } else {
              console.error(`\n[ERROR] ${error.message || error}`);
            }
            process.exit(1);
          });
      }
    });

  // generate-scaffold subcommand (for resource generation)
  program
    .command("generate-scaffold")
    .description("Generate NestJS resource scaffold from MikroORM entity")
    .option("-e, --entity <path>", "Path to the entity file")
    .option("--dir <path>", "Relative directory for output files (used if -e does not match template)")
    .option("--generate-module", "Generate NestJS module", true)
    .option("--generate-service", "Generate NestJS service", true)
    .option("--generate-controller", "Generate NestJS controller", true)
    .option("--force", "Overwrite existing files", false)
    .action((options) => {
      // Run the resource CLI with the provided options
      runResourceCli(options.entity, options);
    });

  program.parse(process.argv);
}
