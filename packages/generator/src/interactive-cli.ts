import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import { generateDtos } from "./cli";
import { GeneratorType, DtoGeneratorConfig } from "./types/config.types";
import { mergeConfigWithInteractiveAnswers } from "./shared-config/config-merger";
import { findAndLoadLegacyConfig } from "./shared-config/config-loader";

interface InteractiveAnswers {
  inputPattern: string;
  outputPath: string;
  dtoTypes: string[];
  mappingTypes: string[];
  parallel: boolean;
  concurrency: number;
}

/**
 * Interactive CLI interface for the DTO generator
 */
export async function runInteractiveMode(): Promise<void> {
  console.log("🚀 Welcome to MikroNestForge - Interactive Mode\n");

  try {
    // Try to load configuration file for defaults
    let defaultConfig: DtoGeneratorConfig | null = null;
    try {
      defaultConfig = await findAndLoadLegacyConfig();
      if (defaultConfig) {
        console.log("✓ Found configuration file, using as defaults");
      }
    } catch (error) {
      console.log("⚠️  Could not load configuration file, using built-in defaults");
    }

    // Ask questions step by step
    const inputPattern = await inquirer.prompt({
      type: "input",
      name: "inputPattern",
      message: "Enter the path or glob pattern to your MikroORM entities:",
      default: defaultConfig?.input || "src/entities/*.ts",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Please enter a valid path or pattern";
        }
        return true;
      }
    });

    const outputPath = await inquirer.prompt({
      type: "input",
      name: "outputPath",
      message: "Enter the output directory for generated DTOs:",
      default: defaultConfig?.output || "src/dtos",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Please enter a valid output path";
        }
        return true;
      }
    });

    // Determine default checked state based on config
    const getDefaultChecked = (generatorType: string) => {
      if (!defaultConfig) return true; // Default to checked if no config
      return defaultConfig.generators.includes(generatorType as GeneratorType);
    };

    const dtoTypes = await inquirer.prompt({
      type: "checkbox",
      name: "dtoTypes",
      message: "Select which DTO types to generate:",
      choices: [
        {
          name: "📄 Basic DTO files (*.dto.ts)",
          value: "dto",
          checked: getDefaultChecked("dto")
        },
        {
          name: "➕ Create DTO files (*.create.dto.ts)",
          value: "create",
          checked: getDefaultChecked("create-dto")
        },
        {
          name: "✏️ Update DTO files (*.update.dto.ts)",
          value: "update",
          checked: getDefaultChecked("update-dto")
        },
        {
          name: "🔍 FindMany DTO files (*.find-many.dto.ts)",
          value: "findMany",
          checked: getDefaultChecked("find-many-dto")
        },
        {
          name: "📊 FindMany Response DTO files (*.find-many.response.dto.ts)",
          value: "findManyResponse",
          checked: getDefaultChecked("find-many-response-dto")
        }
      ]
    });

    const mappingTypes = await inquirer.prompt({
      type: "checkbox",
      name: "mappingTypes",
      message: "Select which mapping functions to generate:",
      choices: [
        {
          name: "🔄 Entity to DTO mapping functions",
          value: "entityToDto",
          checked: getDefaultChecked("entity-to-dto")
        },
        {
          name: "➡️ Create DTO to Entity mapping functions",
          value: "createDtoToEntity",
          checked: getDefaultChecked("create-dto-to-entity")
        },
        {
          name: "✏️ Update DTO to Entity mapping functions",
          value: "updateDtoToEntity",
          checked: getDefaultChecked("update-dto-to-entity")
        },
        {
          name: "🔍 FindMany to Filter mapping functions",
          value: "findManyToFilter",
          checked: getDefaultChecked("find-many-to-filter")
        }
      ]
    });

    const parallel = await inquirer.prompt({
      type: "confirm",
      name: "parallel",
      message: "Enable parallel processing for faster generation?",
      default: defaultConfig?.parallel || false
    });

    let concurrency = { concurrency: defaultConfig?.concurrency || 4 };
    if (parallel.parallel) {
      concurrency = await inquirer.prompt({
        type: "number",
        name: "concurrency",
        message: "Set the number of concurrent workers:",
        default: defaultConfig?.concurrency || 4,
        validate: (input: number) => {
          if (input < 1 || input > 16) {
            return "Please enter a number between 1 and 16";
          }
          return true;
        }
      });
    }

    const answers: InteractiveAnswers = {
      inputPattern: inputPattern.inputPattern,
      outputPath: outputPath.outputPath,
      dtoTypes: dtoTypes.dtoTypes,
      mappingTypes: mappingTypes.mappingTypes,
      parallel: parallel.parallel,
      concurrency: concurrency.concurrency
    };

    // Show configuration summary
    console.log("\n📋 Configuration Summary:");
    console.log(`📁 Input Pattern: ${answers.inputPattern}`);
    console.log(`📂 Output Path: ${answers.outputPath}`);
    console.log(`📄 DTO Types: ${answers.dtoTypes.length > 0 ? answers.dtoTypes.join(", ") : "None"}`);
    console.log(`🔄 Mapping Types: ${answers.mappingTypes.length > 0 ? answers.mappingTypes.join(", ") : "None"}`);
    console.log(`⚡ Parallel Processing: ${answers.parallel ? `Enabled (${answers.concurrency} workers)` : "Disabled"}`);

    // Confirm before proceeding
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Do you want to proceed with these settings?",
        default: true
      }
    ]);

    if (!confirm) {
      console.log("❌ Operation cancelled by user.");
      return;
    }

    // Merge configuration with interactive answers
    let finalConfig: DtoGeneratorConfig;

    if (defaultConfig) {
      // Use configuration file as base and merge with interactive answers
      finalConfig = mergeConfigWithInteractiveAnswers(defaultConfig, answers);
      console.log("✓ Configuration merged with your interactive choices");
    } else {
      // No configuration file, use interactive answers only
      const generators: GeneratorType[] = [];

      if (answers.dtoTypes.includes("dto")) generators.push("dto");
      if (answers.dtoTypes.includes("create")) generators.push("create-dto");
      if (answers.dtoTypes.includes("update")) generators.push("update-dto");
      if (answers.dtoTypes.includes("findMany")) generators.push("find-many-dto");
      if (answers.dtoTypes.includes("findManyResponse")) generators.push("find-many-response-dto");

      if (answers.mappingTypes.includes("entityToDto")) generators.push("entity-to-dto");
      if (answers.mappingTypes.includes("createDtoToEntity")) generators.push("create-dto-to-entity");
      if (answers.mappingTypes.includes("updateDtoToEntity")) generators.push("update-dto-to-entity");
      if (answers.mappingTypes.includes("findManyToFilter")) generators.push("find-many-to-filter");

      finalConfig = new DtoGeneratorConfig({
        input: answers.inputPattern,
        output: answers.outputPath,
        generators,
        parallel: answers.parallel,
        concurrency: answers.concurrency
      });
    }

    console.log("\n🔨 Generating DTOs...");

    const startTime = new Date();
    await generateDtos(finalConfig);
    const endTime = new Date();

    console.log(`\n✅ DTO generation completed successfully!`);
    console.log(`⏱️  Time taken: ${endTime.getTime() - startTime.getTime()}ms`);

    // Show generated files summary
    try {
      const outputDir = path.resolve(answers.outputPath);
      if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir, { recursive: true }) as string[];
        const generatedFiles = files.filter((file: string) =>
          typeof file === 'string' && (
            file.endsWith('.dto.ts') ||
            file.endsWith('.mapping.ts')
          )
        );

        if (generatedFiles.length > 0) {
          console.log(`📁 Generated ${generatedFiles.length} files in ${outputDir}`);
          console.log("📄 Generated files:");
          generatedFiles.slice(0, 10).forEach((file: string) => {
            console.log(`   - ${file}`);
          });
          if (generatedFiles.length > 10) {
            console.log(`   ... and ${generatedFiles.length - 10} more files`);
          }
        }
      }
    } catch (error) {
      // Ignore file listing errors
    }

  } catch (error) {
    console.error("\n❌ An error occurred during DTO generation:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(`   ${String(error)}`);
    }
    process.exit(1);
  }
}

/**
 * Helper function to check if a path exists
 */
function pathExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}