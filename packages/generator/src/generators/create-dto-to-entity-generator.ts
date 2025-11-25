import { Project, SourceFile, ClassDeclaration, PropertyDeclaration } from 'ts-morph';
import path from 'path';
import { shouldExcludePropertyForOperation } from "../utils/extract-dto-options";
import { extractPrimaryKeyType } from "../utils/extract-primary-key-type";
import { resolveRelationEntityType, resolveRelationEntityTypeOptimized } from "../utils/resolve-relation-entity-type";
import { createEntityRegistry, EntityRegistry } from "../utils/entity-registry";
import { getAllPropertiesIncludingInherited } from "../utils/get-all-properties-including-inherited";
import { extractEnumTypeFromDecorator } from "../utils/extract-enum-type";
import { isEntityClass } from "../utils/is-entity-class";
import { FileSystemError } from "../errors/FileSystemError";
import { createErrorContext } from "../errors/error-utils";
import { extractEntityNameFromPath } from "../utils/extract-entity-name";

// Configuration interface
interface CreateDtoToEntityGeneratorConfig {
  project: Project;
  sourceFiles: SourceFile[];
  outputPath: string;
}

/**
 * Generate create DTO to entity mapping files for all entities in the source files
 * @param config Generator configuration
 */
export function generateCreateDtoToEntityMappingFiles(config: CreateDtoToEntityGeneratorConfig): void {
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
          generateCreateDtoToEntityMappingFunction(classDeclaration, className, config.outputPath, sourceFile, config.project, entityRegistry);
        } catch (error) {
          // Log the error but continue processing other entities
          console.error(`[ERROR] Failed to generate create DTO to entity mapping for entity '${className}' in file '${sourceFile.getFilePath()}':`, error);
          // Continue with the next entity instead of stopping the entire process
          continue;
        }
      }
    }
  }
}







/**
 * Generate a mapping function from create DTO to entity
 */
function generateCreateDtoToEntityMappingFunction(
  entityClass: ClassDeclaration,
  className: string,
  outputPath: string,
  sourceFile: SourceFile,
  project: Project,
  entityRegistry?: EntityRegistry
): void {
  const generatedDir = path.join(outputPath, "generated");
  const entityDir = path.join(generatedDir, className.toLowerCase());
  const mappingFileName = `${className.toLowerCase()}.create.mapping.ts`;
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
    const context = createErrorContext(entityClass, null, 'create-mapping-generation', 'createMapping');
    context.filePath = generatedDir;
    context.operation = 'create-directory';
    throw new FileSystemError(
      `Failed to create directory '${generatedDir}' for create DTO to entity mapping generation. The path may be invalid or access may be denied.`,
      context
    );
  }

  let mappingFile;
  try {
    mappingFile = project.createSourceFile(mappingFilePath, '', { overwrite: true });
  } catch (error) {
    const context = createErrorContext(entityClass, null, 'create-mapping-generation', 'createMapping');
    context.filePath = mappingFilePath;
    context.operation = 'create-source-file';
    throw new FileSystemError(
      `Failed to create source file '${mappingFilePath}' for create DTO to entity mapping generation. The path may be invalid or access may be denied.`,
      context
    );
  }

  // Import the entity and DTO
  const entityFilePath = sourceFile.getFilePath();
  const cleanEntityFileName = extractEntityNameFromPath(entityFilePath);
  const dtoFileName = `${className.toLowerCase()}.create.dto`;

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
    namedImports: [`${className}CreateDto`],
  });

  // Generate the mapping function
  mappingFile.addImportDeclaration({
    moduleSpecifier: "@mikro-orm/core",
    namedImports: ["EntityManager", "ref"],
  });

  const mappingFunction = mappingFile.addFunction({
    name: `create${className}FromDto`,
    parameters: [
      {
        name: 'dto',
        type: `${className}CreateDto`,
      },
      {
        name: 'em',
        type: 'EntityManager',
        hasQuestionToken: true, // Make it optional so it's not required for simple cases
      }
    ],
    returnType: className,
    isExported: true,
  });

  // Add function body
  const properties = getAllPropertiesIncludingInherited(entityClass);

  // Add opening of function body
  mappingFunction.setBodyText(writer => {
    writer.writeLine('const entity = new ' + className + '();');
    writer.writeLine('');

    const propertyAssignments: string[] = [];

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

      // Check if the property should be excluded based on DtoOptions decorator for Create mapping
      const isExcluded = shouldExcludePropertyForOperation(property, 'create');

      // Skip primary key as it's usually auto-generated
      // Skip excluded properties
      if (isPrimaryKey || isExcluded) {
        continue;
      }

      if (isEntityProperty) {
        // More thorough check for nullable properties - looking at the original text
        const propertyDeclarationText = property.getText();
        const isEntityPropertyNullable = propertyDeclarationText.includes(' | null');

        if (isEntityPropertyNullable) {
          // For nullable entity properties, use ?? null to convert undefined to null
          propertyAssignments.push(`  entity.${propertyName} = dto.${propertyName} ?? null;`);
        } else {
          // For non-nullable entity properties, assign directly
          propertyAssignments.push(`  entity.${propertyName} = dto.${propertyName};`);
        }
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

          // Use the optimized relation resolution with entity registry if available
          if (entityRegistry) {
            targetEntity = resolveRelationEntityTypeOptimized(relationDecorator, property, entityRegistry);
          } else {
            // Fallback to the original method if registry is not available
            const sourceFiles = project.getSourceFiles(); // Get from project
            targetEntity = resolveRelationEntityType(relationDecorator, property, sourceFiles);
          }

          if (targetEntity) {
            const primaryKeyType = extractPrimaryKeyType(targetEntity);
            const typeText = primaryKeyType || 'number';

            const isManyToOne = relationDecoratorName === 'ManyToOne';
            const isOneToOne = relationDecoratorName === 'OneToOne';
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
              // For collections during entity creation, often the related entities have to be handled separately or with a special approach
              propertyAssignments.push(`  // Collection relation ${propertyName} typically needs to be handled after entity creation`);
              propertyAssignments.push(`  // Or via separate relationship management after entity is persisted`);
            } else if (isManyToOne || isOneToOne) {
              // For single relations, we create a reference using the primary key from DTO
              // This is the most common approach for creating entity with relations in MikroORM
              const targetEntityName = targetEntity.getName();

              // Check if the property is Ref type (looking for Reference type)
              const propertyTypeText = property.getType().getText(property);
              const isRefType = propertyTypeText.includes('Ref<') || propertyTypeText.includes('Reference<');

              // Add import for the target entity if not already imported
              const existingImports = mappingFile.getImportDeclarations();
              let hasEntityImport = false;
              for (const imp of existingImports) {
                const namedImports = imp.getNamedImports();
                if (namedImports.some(ni => ni.getName() === targetEntityName)) {
                  hasEntityImport = true;
                  break;
                }
              }

              if (!hasEntityImport && targetEntityName) {
                // Calculate relative path to target entity
                const targetEntityPath = targetEntity.getSourceFile().getFilePath();
                let relativeEntityPath = path.relative(path.dirname(mappingFilePath), targetEntityPath).replace(/\\/g, '/');
                if (relativeEntityPath && !relativeEntityPath.startsWith('.')) {
                  // Make it relative
                  relativeEntityPath = './' + relativeEntityPath;
                } else if (!relativeEntityPath) {
                  // Fallback if path calculation fails
                  relativeEntityPath = './' + path.basename(targetEntityPath, '.ts');
                }
                const relativeEntityPathWithoutExt = relativeEntityPath.replace(/\.ts$/, '');

                mappingFile.addImportDeclaration({
                  moduleSpecifier: relativeEntityPathWithoutExt,
                  namedImports: [targetEntityName],
                });
              }

              // Handle null/undefined values properly
              propertyAssignments.push(`  // Set ${propertyName} relation using reference to avoid fetching the full entity`);
              propertyAssignments.push(`  if (em && dto.${propertyName} !== undefined && dto.${propertyName} !== null) {`);
              // For Ref types, we need to use ref() function to wrap the reference
              if (isRefType) {
                // For Ref types, wrap getReference result with ref() function for proper ref handling
                propertyAssignments.push(`    entity.${propertyName} = ref(em.getReference(${targetEntityName}, dto.${propertyName}));`);
              } else {
                propertyAssignments.push(`    entity.${propertyName} = em.getReference(${targetEntityName}, dto.${propertyName});`);
              }
              propertyAssignments.push(`  } else if (dto.${propertyName} === null) {`);
              propertyAssignments.push(`    entity.${propertyName} = null;`);
              propertyAssignments.push(`  }`);
            }
          } else {
            // If target entity is not found, handle based on relation type
            const isManyToOne = relationDecoratorName === 'ManyToOne';
            const isOneToOne = relationDecoratorName === 'OneToOne';
            const isOneToMany = relationDecoratorName === 'OneToMany';
            const isManyToMany = relationDecoratorName === 'ManyToMany';

            if (isOneToMany || isManyToMany) {
              propertyAssignments.push(`  // Collection relation ${propertyName} needs special handling after persistence`);
            } else if (isManyToOne || isOneToOne) {
              propertyAssignments.push(`  // Single relation ${propertyName} needs to be set via reference to entity ID`);
              propertyAssignments.push(`  if (em && dto.${propertyName} !== undefined && dto.${propertyName} !== null) {`);
              propertyAssignments.push(`    entity.${propertyName} = em.getReference('EntityName', dto.${propertyName}); // Replace 'EntityName' with actual entity class`);
              propertyAssignments.push(`  } else if (dto.${propertyName} === null) {`);
              propertyAssignments.push(`    entity.${propertyName} = null;`);
              propertyAssignments.push(`  }`);
            }
          }
        }
      }
    }

    // Join all property assignments
    writer.writeLine(propertyAssignments.join('\n'));
    writer.writeLine('');
    writer.writeLine('return entity;');
  });

  console.log(`Generated create DTO to entity mapping function in ${mappingFilePath}`);
}