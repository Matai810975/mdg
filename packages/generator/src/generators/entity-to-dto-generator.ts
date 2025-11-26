import { Project, SourceFile, ClassDeclaration, PropertyDeclaration } from 'ts-morph';
import path from 'path';
import { shouldExcludePropertyForOperation } from "../utils/extract-dto-options";
import { extractPrimaryKeyType } from "../utils/extract-primary-key-type";
import { resolveRelationEntityTypeOptimized } from "../utils/resolve-relation-entity-type";
import { createEntityRegistry, EntityRegistry } from "../utils/entity-registry";
import { getAllPropertiesIncludingInherited } from "../utils/get-all-properties-including-inherited";
import { extractEnumTypeFromDecorator } from "../utils/extract-enum-type";
import { isEntityClass } from "../utils/is-entity-class";
import { FileSystemError } from "../errors/FileSystemError";
import { createErrorContext } from "../errors/error-utils";
import { extractEntityNameFromPath } from "../utils/extract-entity-name";

// Configuration interface
interface MappingGeneratorConfig {
  project: Project;
  sourceFiles: SourceFile[];
  outputPath: string;
}

/**
 * Generate mapping files for all entities in the source files
 * @param config Generator configuration
 */
export function generateMappingFiles(config: MappingGeneratorConfig): void {
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
          generateMappingFunction(classDeclaration, className, config.outputPath, sourceFile, config.project, entityRegistry);
        } catch (error) {
          // Log the error but continue processing other entities
          console.error(`[ERROR] Failed to generate mapping for entity '${className}' in file '${sourceFile.getFilePath()}':`, error);
          // Continue with the next entity instead of stopping the entire process
          continue;
        }
      }
    }
  }
}

/**
 * Generate a mapping function for a single entity
 */
function generateMappingFunction(
  entityClass: ClassDeclaration,
  className: string,
  outputPath: string,
  sourceFile: SourceFile,
  project: Project,
  entityRegistry?: EntityRegistry
): void {
  const generatedDir = path.join(outputPath, "generated");
  const entityDir = path.join(generatedDir, className.toLowerCase());
  const mappingFileName = `${className.toLowerCase()}.mapping.ts`;
  const mappingFilePath = path.join(entityDir, mappingFileName);

  try {
    // Create directories if they don't exist
    if (!project.getDirectory(generatedDir)) {
      project.createDirectory(generatedDir);
    }
    if (!project.getDirectory(entityDir)) {
      project.createDirectory(entityDir);
    }
  } catch (error) {
    const context = createErrorContext(entityClass, null, 'mapping-generation', 'mapping');
    context.filePath = generatedDir;
    context.operation = 'create-directory';
    throw new FileSystemError(
      `Failed to create directory '${generatedDir}' for entity mapping generation. The path may be invalid or access may be denied.`,
      context
    );
  }

  let mappingFile;
  try {
    mappingFile = project.createSourceFile(mappingFilePath, '', { overwrite: true });
  } catch (error) {
    const context = createErrorContext(entityClass, null, 'mapping-generation', 'mapping');
    context.filePath = mappingFilePath;
    context.operation = 'create-source-file';
    throw new FileSystemError(
      `Failed to create source file '${mappingFilePath}' for entity mapping generation. The path may be invalid or access may be denied.`,
      context
    );
  }

  // Import the entity and DTO
  const entityFilePath = sourceFile.getFilePath();
  const cleanEntityFileName = extractEntityNameFromPath(entityFilePath);
  const dtoFileName = `${className.toLowerCase()}.dto`;

  // Calculate relative path from mapping file directory to entity file
  // The mapping file is in outputPath/generated/className/, so we need to go up two levels to get to the output root
  const mappingDir = path.dirname(mappingFilePath);
  const relativePath = path.relative(mappingDir, entityFilePath).replace(/\\/g, '/');
  const relativePathWithoutExt = relativePath.replace(/\.ts$/, '');

  mappingFile.addImportDeclaration({
    moduleSpecifier: relativePathWithoutExt,
    namedImports: [className],
  });

  mappingFile.addImportDeclaration({
    moduleSpecifier: `./${dtoFileName}`,
    namedImports: [`${className}Dto`],
  });

  // Generate the mapping function
  const mappingFunction = mappingFile.addFunction({
    name: `${className}ToDto`,
    parameters: [
      {
        name: 'entity',
        type: className,
      }
    ],
    returnType: `${className}Dto`,
    isExported: true,
  });

  // Add function body
  const properties = getAllPropertiesIncludingInherited(entityClass);

  // Add opening of function body
  mappingFunction.setBodyText(writer => {
    writer.writeLine('return {');

    const dtoProperties: string[] = [];

    for (const property of properties) {
      const propertyName = property.getName();
      const propertyType = property.getType();
      const propertyTypeText = propertyType.getText();

      const decorators = property.getDecorators();
      const isPrimaryKey = decorators.some((d: any) => d.getName() === 'PrimaryKey');
      const isEntityProperty = decorators.some((d: any) => d.getName() === 'Property' || d.getName() === 'Enum');
      const isRelation = decorators.some((d: any) =>
        d.getName() === 'OneToMany' ||
        d.getName() === 'ManyToOne' ||
        d.getName() === 'ManyToMany' ||
        d.getName() === 'OneToOne'
      );

      // Check if the property should be excluded based on DtoOptions decorator for Data mapping
      const isExcluded = shouldExcludePropertyForOperation(property, 'data');

      // Skip excluded properties
      if (isExcluded) {
        continue;
      }

      if (isPrimaryKey || isEntityProperty) {
        // Direct mapping for scalar types
        dtoProperties.push(`    ${propertyName}: entity.${propertyName}`);
      } else if (isRelation) {
        // Handle relationship mapping
        const relationDecorator = decorators.find((d: any) =>
          d.getName() === 'OneToMany' ||
          d.getName() === 'ManyToOne' ||
          d.getName() === 'ManyToMany' ||
          d.getName() === 'OneToOne'
        );

        if (relationDecorator) {
          const relationDecoratorName = relationDecorator.getName();
          let targetEntity: any = null;

          targetEntity = resolveRelationEntityTypeOptimized(relationDecorator, property, entityRegistry!);

          if (targetEntity) {
            const primaryKeyType = extractPrimaryKeyType(targetEntity);
            const typeText = primaryKeyType || 'number';

            const isOneToMany = relationDecoratorName === 'OneToMany';
            const isManyToMany = relationDecoratorName === 'ManyToMany';

            const typeSymbol = propertyType.getSymbol();
            const typeName = typeSymbol?.getName() || '';
            const typeArgs = propertyType.getTypeArguments();

            const isCollection = isOneToMany ||
                                 isManyToMany ||
                                 typeName === 'Collection' ||
                                 propertyType.getText().includes('Collection<') ||
                                 propertyType.getText().startsWith('Collection') ||
                                 (typeArgs.length > 0 && typeName === 'Collection');

            if (isCollection) {
              // For collections, map to an array of primary keys
              dtoProperties.push(`    ${propertyName}: entity.${propertyName}?.map(item => item.id) || []`);
            } else {
              // For single relations, map to the primary key
              // Handle undefined to null conversion for nullable relations
              dtoProperties.push(`    ${propertyName}: entity.${propertyName}?.id ?? null`);
            }
          } else {
            // If target entity is not found, default to id or null
            const isOneToMany = relationDecoratorName === 'OneToMany';
            const isManyToMany = relationDecoratorName === 'ManyToMany';
            const isCollection = isOneToMany || isManyToMany;

            if (isCollection) {
              dtoProperties.push(`    ${propertyName}: entity.${propertyName}?.map(item => item.id) || []`);
            } else {
              // Handle undefined to null conversion for nullable relations
              dtoProperties.push(`    ${propertyName}: entity.${propertyName}?.id ?? null`);
            }
          }
        }
      }
    }

    // Join all property mappings
    writer.writeLine(dtoProperties.join(',\n'));
    writer.writeLine('  };');
  });

  console.log(`Generated mapping function in ${mappingFilePath}`);
}


