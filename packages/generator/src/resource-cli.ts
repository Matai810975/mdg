import { generateResource } from './resource-generators/resource-generator';
import { analyzeEntity } from './resource-utils/entity-analyzer';
import { findAndLoadConfig } from './shared-config/config-loader';
import { parsePath, resolveOutputPath } from './resource-utils/path-resolver';
import { MikroNestForgeConfig } from './types/config.types';

type CliOptions = {
  entity: string;
  dir?: string;
  generateModule: boolean;
  generateService: boolean;
  generateController: boolean;
  force: boolean;
};


/**
 * Main function to generate Nestjs resource for a single entity
 */
async function generateSingleEntityResource(
  config: MikroNestForgeConfig,
  options: CliOptions,
): Promise<void> {
  try {
    const { entity: entityPath, dir: dirPath } = options;
    const entityTemplate = config.scaffoldGeneratorOptions.templates.entity;

    if (!entityTemplate) {
      throw new Error('Entity template is not defined in configuration');
    }

    // 1. Analyze the entity to get its metadata
    const entityInfo = await analyzeEntity(entityPath);

    // 2. Parse paths to get dir and entityName for template substitution
    const { dir, entityName } = parsePath(entityPath, dirPath, entityTemplate);

    // Ensure entity name from path matches entity class name for consistency
    if (entityName !== entityInfo.name) {
        // console.warn(`⚠️  Warning: Entity file name '${entityName}' does not match class name '${entityInfo.name}'. Using class name '${entityInfo.name}'.`);
    }

    // Use kebab-case for file naming to match NestJS convention
    const finalEntityName = entityInfo.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();


    // 3. Resolve output paths for each file to be generated
    const basePath = config.scaffoldGeneratorOptions.basePath;
    const controllerTemplate = config.scaffoldGeneratorOptions.templates.controller;
    const serviceTemplate = config.scaffoldGeneratorOptions.templates.service;
    const moduleTemplate = config.scaffoldGeneratorOptions.templates.module;

    if (!controllerTemplate || !serviceTemplate || !moduleTemplate) {
        throw new Error('Resource templates are not fully defined in configuration');
    }
    
    // Resolve paths with correct entity name replacement
    const controllerPath = resolveOutputPath(basePath, controllerTemplate, dir, finalEntityName);
    const servicePath = resolveOutputPath(basePath, serviceTemplate, dir, finalEntityName);
    const modulePath = resolveOutputPath(basePath, moduleTemplate, dir, finalEntityName);

    const outputPaths = {
        controller: controllerPath,
        service: servicePath,
        module: modulePath,
    };


    // 4. Generate the resource
    await generateResource(entityInfo, outputPaths, options);

    console.log(`✅ Resource generated successfully for entity: ${entityInfo.name}`);

  } catch (error) {
    console.error(`❌ Error generating resource for ${options.entity}:`, error);
    process.exit(1);
  }
}

/**
 * Entry point for resource generation (called from main CLI)
 */
async function runCli(entityPath: string, options: any): Promise<void> {
  // Use provided options or defaults
  const runOptions: CliOptions = {
    entity: entityPath,
    dir: options?.dir,
    generateModule: options?.generateModule ?? true,
    generateService: options?.generateService ?? true,
    generateController: options?.generateController ?? true,
    force: options?.force ?? false,
  };

  // Load configuration
  const config = await findAndLoadConfig();

  if (!config) {
    console.error("❌ No configuration file found.");
    console.error("Please create a mikro-nest-forge.config.ts file.");
    process.exit(1);
  }


  console.log('🔍 Analyzing entity:', runOptions.entity);
  console.log('⚙️  Options:', {
    dir: runOptions.dir,
    generateModule: runOptions.generateModule,
    generateService: runOptions.generateService,
    generateController: runOptions.generateController,
    force: runOptions.force
  });

  // Create output directory if it doesn't exist
  await generateSingleEntityResource(config, runOptions);
}

export { runCli, generateSingleEntityResource };
