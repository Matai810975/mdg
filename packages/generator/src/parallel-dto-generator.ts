import { SourceFile, ClassDeclaration } from "ts-morph";
import { isEntityClass } from "./utils/is-entity-class";
import { createEntityRegistry } from "./utils/entity-registry";
import { DtoGeneratorConfig } from "./generators/data-dto-generator";
import { generateDtoForEntity } from "./generators/data-dto-generator";

// Default concurrency limit (4 workers as suggested in the analysis)
const DEFAULT_CONCURRENCY_LIMIT = 4;

/**
 * Process entities in parallel with limited concurrency
 * @param config Generator configuration
 * @param concurrencyLimit Maximum number of concurrent operations
 * @param entityTypes Which DTO types to generate in parallel for each entity
 */
export async function generateDtosInParallel(
  config: DtoGeneratorConfig,
  options: {
    generateDto?: boolean;
    generateCreateDto?: boolean;
    generateUpdateDto?: boolean;
    generateFindManyDto?: boolean;
    concurrencyLimit?: number;
  } = {}
): Promise<void> {
  const {
    generateDto = true,
    generateCreateDto = true,
    generateUpdateDto = true,
    generateFindManyDto = true,
    concurrencyLimit = DEFAULT_CONCURRENCY_LIMIT,
  } = options;

  const entityRegistry = createEntityRegistry(config.sourceFiles);

  // Collect all entities to process
  const entities: {
    classDeclaration: ClassDeclaration;
    className: string;
    sourceFile: SourceFile;
  }[] = [];

  for (const sourceFile of config.sourceFiles) {
    const classes = sourceFile.getClasses();
    for (const classDeclaration of classes) {
      if (isEntityClass(classDeclaration)) {
        const className = classDeclaration.getName();
        if (className) {
          entities.push({ classDeclaration, className, sourceFile });
        }
      }
    }
  }

  // Process entities with limited concurrency
  const results = [];

  for (let i = 0; i < entities.length; i += concurrencyLimit) {
    const batch = entities.slice(i, i + concurrencyLimit);
    const batchPromises = batch.map(async (entity) => {
      try {
        const { classDeclaration, className, sourceFile } = entity;

        // Generate all requested DTO types for this entity concurrently
        const dtoPromises = [];

        if (generateDto) {
          dtoPromises.push(
            generateDtoForEntity(
              classDeclaration,
              className,
              config.outputPath,
              sourceFile,
              config.project,
              entityRegistry
            )
          );
        }

        if (generateCreateDto) {
          const { generateCreateDtoForEntity: genCreateDto } = await import(
            "./generators/create-dto-generator"
          );
          dtoPromises.push(
            genCreateDto(
              classDeclaration,
              className,
              config.outputPath,
              sourceFile,
              config.project,
              entityRegistry
            )
          );
        }

        if (generateUpdateDto) {
          const { generateUpdateDtoForEntity: genUpdateDto } = await import(
            "./generators/update-dto-generator"
          );
          dtoPromises.push(
            genUpdateDto(
              classDeclaration,
              className,
              config.outputPath,
              sourceFile,
              config.project,
              entityRegistry
            )
          );
        }

        if (generateFindManyDto) {
          const { generateFindManyDtoForEntity: genFindManyDto } = await import(
            "./generators/find-many-dto-generator"
          );
          dtoPromises.push(
            genFindManyDto(
              classDeclaration,
              className,
              config.outputPath,
              sourceFile,
              config.project,
              entityRegistry
            )
          );
        }

        // Wait for all DTO types for this entity to complete
        await Promise.all(dtoPromises);

        return { success: true, entity: className };
      } catch (error) {
        console.error(
          `[ERROR] Failed to generate DTOs for entity '${entity.className}':`,
          error
        );
        return {
          success: false,
          entity: entity.className,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  // Check for any failures
  const failedResults = results.filter((result) => !result.success);
  if (failedResults.length > 0) {
    console.error(
      `[ERROR] Failed to process ${failedResults.length} entities:`
    );
    failedResults.forEach((result) => {
      console.error(`  - ${result.entity}: ${result.error}`);
    });
    throw new Error(`Failed to process ${failedResults.length} entities`);
  }

  // Save the project after all processing
  await config.project.save();
}
