import {
  Project,
  SourceFile,
  ClassDeclaration,
  PropertyDeclaration,
} from "ts-morph";
import path from "path";
import { isEntityClass } from "../utils/is-entity-class";
import { createEntityRegistry, EntityRegistry } from "../utils/entity-registry";

// Configuration interface
export interface FindManyResponseDtoGeneratorConfig {
  project: Project;
  sourceFiles: SourceFile[];
  outputPath: string;
}

/**
 * Generate FindManyResponse DTO files for all entities in the source files
 * @param config Generator configuration
 */
export function generateFindManyResponseDtoFiles(config: FindManyResponseDtoGeneratorConfig): void {
  // Create entity registry for O(1) relation resolution lookups
  const entityRegistry = createEntityRegistry(config.sourceFiles);

  for (const sourceFile of config.sourceFiles) {
    const classes = sourceFile.getClasses();
    for (const classDeclaration of classes) {
      // Only process classes that have the @Entity() decorator
      if (!isEntityClass(classDeclaration)) {
        continue; // Skip non-entity classes
      }

      const className = classDeclaration.getName();
      if (className) {
        try {
          generateFindManyResponseDtoForEntity(
            classDeclaration,
            className,
            config.outputPath,
            sourceFile,
            config.project,
            entityRegistry
          );
        } catch (error) {
          // Log the error but continue processing other entities
          console.error(
            `[ERROR] Failed to generate FindManyResponse DTO for entity '${className}' in file '${sourceFile.getFilePath()}':`,
            error
          );
          // Continue with the next entity instead of stopping the entire process
          continue;
        }
      }
    }
  }
}

/**
 * Generate a FindManyResponse DTO file for a single entity
 */
export function generateFindManyResponseDtoForEntity(
  entityClass: ClassDeclaration,
  className: string,
  outputPath: string,
  sourceFile: SourceFile,
  project: Project,
  entityRegistry: EntityRegistry
): void {
  const generatedDir = path.join(outputPath, "generated");
  const entityDir = path.join(generatedDir, className.toLowerCase());
  const dtoFileName = `${className.toLowerCase()}.find-many.response.dto.ts`;
  const dtoFilePath = path.join(entityDir, dtoFileName);

  // Create directories if they don't exist
  if (!project.getDirectory(generatedDir)) {
    project.createDirectory(generatedDir);
  }
  if (!project.getDirectory(entityDir)) {
    project.createDirectory(entityDir);
  }

  const dtoFile = project.createSourceFile(dtoFilePath, "", {
    overwrite: true,
  });

  // Add required imports
  dtoFile.addImportDeclaration({
    moduleSpecifier: "@nestjs/swagger",
    namedImports: ["ApiProperty"],
  });

  // Import the base Data DTO for the data array
  dtoFile.addImportDeclaration({
    moduleSpecifier: `./${className.toLowerCase()}.dto`,
    namedImports: [`${className}Dto`],
  });

  // Create the FindManyResponse DTO class
  const dtoClass = dtoFile.addClass({
    name: `${className}FindManyResponseDto`,
    isExported: true,
  });

  // Add data property - array of entity DTOs
  const dataProperty = dtoClass.addProperty({
    name: "data",
    type: `${className}Dto[]`,
    hasExclamationToken: true, // Required field
  });
  dataProperty.addDecorator({
    name: "ApiProperty",
    // arguments: [`{
    //   type: () => [${className}Dto],
    //   description: "Array of ${className} entities"
    // }`],
  });

  // Add count property - total number of records
  const countProperty = dtoClass.addProperty({
    name: "count",
    type: "number",
    hasExclamationToken: true, // Required field
  });
  countProperty.addDecorator({
    name: "ApiProperty",
    arguments: [`{
      type: Number,
      description: "Total number of records"
    }`],
  });

  console.log(`Generated ${dtoFilePath}`);
}