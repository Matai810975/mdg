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
interface UpdateDtoToEntityGeneratorConfig {
  project: Project;
  sourceFiles: SourceFile[];
  outputPath: string;
}

/**
 * Generate update DTO to entity mapping files for all entities in the source files
 * @param config Generator configuration
 */
export function generateUpdateDtoToEntityMappingFiles(config: UpdateDtoToEntityGeneratorConfig): void {
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
          generateUpdateDtoToEntityMappingFunction(classDeclaration, className, config.outputPath, sourceFile, config.project, entityRegistry);
        } catch (error) {
          // Log the error but continue processing other entities
          console.error(`[ERROR] Failed to generate update DTO to entity mapping for entity '${className}' in file '${sourceFile.getFilePath()}':`, error);
          // Continue with the next entity instead of stopping the entire process
          continue;
        }
      }
    }
  }
}



/**
 * Generate a mapping function from update DTO to entity
 */
function generateUpdateDtoToEntityMappingFunction(
  entityClass: ClassDeclaration,
  className: string,
  outputPath: string,
  sourceFile: SourceFile,
  project: Project,
  entityRegistry?: EntityRegistry
): void {
  const generatedDir = path.join(outputPath, "generated");
  const entityDir = path.join(generatedDir, className.toLowerCase());
  const mappingFileName = `${className.toLowerCase()}.update.mapping.ts`;
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
    const context = createErrorContext(entityClass, null, 'update-mapping-generation', 'updateMapping');
    context.filePath = generatedDir;
    context.operation = 'create-directory';
    throw new FileSystemError(
      `Failed to create directory '${generatedDir}' for update DTO to entity mapping generation. The path may be invalid or access may be denied.`,
      context
    );
  }

  let mappingFile;
  try {
    mappingFile = project.createSourceFile(mappingFilePath, '', { overwrite: true });
  } catch (error) {
    const context = createErrorContext(entityClass, null, 'update-mapping-generation', 'updateMapping');
    context.filePath = mappingFilePath;
    context.operation = 'create-source-file';
    throw new FileSystemError(
      `Failed to create source file '${mappingFilePath}' for update DTO to entity mapping generation. The path may be invalid or access may be denied.`,
      context
    );
  }

  // Import the entity and DTO
  const entityFilePath = sourceFile.getFilePath();
  const cleanEntityFileName = extractEntityNameFromPath(entityFilePath);
  const dtoFileName = `${className.toLowerCase()}.update.dto`;

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
    namedImports: [`${className}UpdateDto`],
  });

  // Generate the mapping function
  mappingFile.addImportDeclaration({
    moduleSpecifier: "@mikro-orm/core",
    namedImports: ["EntityManager"],
  });

  const mappingFunction = mappingFile.addFunction({
    name: `update${className}FromDto`,
    parameters: [
      {
        name: 'dto',
        type: `${className}UpdateDto`,
      },
      {
        name: 'em',
        type: 'EntityManager',
      }
    ],
    returnType: `${className}`,
    isExported: true,
  });

  // Add function body
  const properties = getAllPropertiesIncludingInherited(entityClass);

  // Add opening of function body
  mappingFunction.setBodyText(writer => {
    writer.writeLine(`const entity = em.getReference(${className}, dto.id);`);
    writer.writeLine('');

    // Create the assignment object
    writer.writeLine('const updateData = {');

    const updateProperties: string[] = [];

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

      // Check if the property should be excluded based on DtoOptions decorator for Update mapping
      const isExcluded = shouldExcludePropertyForOperation(property, 'update');

      // Skip primary key as it's used for reference
      if (isPrimaryKey || isExcluded) {
        continue;
      }

      // Check if the property is a collection relation (OneToMany or ManyToMany)
      const typeSymbol = propertyType.getSymbol();
      const typeName = typeSymbol?.getName() || '';
      const typeArgs = propertyType.getTypeArguments();
      const isCollection = isRelation && (
        decorators.some((d: any) => d.getName() === 'OneToMany') ||
        decorators.some((d: any) => d.getName() === 'ManyToMany') ||
        typeName === 'Collection' ||
        propertyType.getText().includes('Collection<') ||
        propertyType.getText().startsWith('Collection') ||
        (typeArgs.length > 0 && typeName === 'Collection')
      );

      // Only process scalar properties and single relations (not collections)
      if (isEntityProperty) {
        // For update DTOs, handle nullable vs non-nullable properties properly
        if (propertyTypeText.includes('null') || property.hasQuestionToken()) {
          // For nullable properties, allow undefined (not provided), null (set to null), or actual value
          updateProperties.push(`  ${propertyName}: dto.${propertyName} !== undefined ? dto.${propertyName} : undefined`);
        } else {
          // For non-nullable properties, assign directly but avoid undefined (use existing value)
          updateProperties.push(`  ${propertyName}: dto.${propertyName}`);
        }
      } else if (isRelation && !isCollection) {
        // Handle single relations (ManyToOne, OneToOne)
        // Resolve target entity for the relation
        const relationDecorator = decorators.find((d: any) =>
          d.getName() === 'ManyToOne' ||
          d.getName() === 'OneToOne'
        );

        let targetEntityName: string | null = null;
        if (relationDecorator) {
          let targetEntity: any = null;

          // Use the optimized relation resolution with entity registry if available
          if (entityRegistry) {
            targetEntity = resolveRelationEntityTypeOptimized(relationDecorator, property, entityRegistry);
          } else {
            // Fallback to the original method if registry is not available
            const sourceFiles = project.getSourceFiles();
            targetEntity = resolveRelationEntityType(relationDecorator, property, sourceFiles);
          }
          if (targetEntity) {
            const name = targetEntity.getName();
            if (name) {
              targetEntityName = name;

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
            }
          } else {
            // If target entity could not be resolved from decorator, try to resolve from property type
            const propertyType = property.getType();
            const typeSymbol = propertyType.getSymbol();
            if (typeSymbol) {
              const typeName = typeSymbol.getName();
              // Remove ' | null' or ' | undefined' from type name if present
              const cleanTypeName = typeName.replace(/ \| (null|undefined)$/, '').replace(/\| (null|undefined)$/, '');

              // Look for entity with matching name
              const sourceFiles = project.getSourceFiles();
              for (const file of sourceFiles) {
                const classes = file.getClasses();
                for (const cls of classes) {
                  const clsName = cls.getName();
                  if (clsName && (clsName === cleanTypeName || clsName.includes(cleanTypeName))) {
                    targetEntityName = clsName;

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
                      const targetEntityPath = cls.getSourceFile().getFilePath();
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
                    break;
                  }
                }
                if (targetEntityName) break;
              }
            }
          }
        }

        // For Update DTOs, relations are typically represented by IDs
        // Check if the original property in the entity is nullable
        const propertyDeclarationText = property.getText();
        const isPropertyNullable = propertyDeclarationText.includes(' | null');
        if (isPropertyNullable && targetEntityName) {
          // For nullable relations, handle undefined (not provided), null (set to null), or actual ID value
          updateProperties.push(`  ${propertyName}: dto.${propertyName} !== undefined ? (dto.${propertyName} !== null ? em.getReference(${targetEntityName}, dto.${propertyName}) : null) : undefined`);
        } else if (targetEntityName) {
          // For non-nullable relations, handle undefined (not provided) or actual ID value
          updateProperties.push(`  ${propertyName}: dto.${propertyName} !== undefined ? em.getReference(${targetEntityName}, dto.${propertyName}) : undefined`);
        } else {
          // Fallback if target entity name could not be resolved
          // For nullable relations, handle undefined (not provided), null (set to null), or actual ID value
          if (isPropertyNullable) {
            updateProperties.push(`  ${propertyName}: dto.${propertyName} !== undefined ? dto.${propertyName} : undefined`);
          } else {
            updateProperties.push(`  ${propertyName}: dto.${propertyName}`);
          }
        }
      }
      // Skip collection relations (OneToMany, ManyToMany)
      // as these should be handled separately, typically via other methods
    }

    // Join all property assignments
    writer.writeLine(updateProperties.join(',\n'));
    writer.writeLine('};');
    writer.writeLine('');
    writer.writeLine('// Remove undefined values from updateData');
    writer.writeLine('Object.keys(updateData).forEach(key => {');
    writer.writeLine('  if ((updateData as any)[key] === undefined) {');
    writer.writeLine('    delete (updateData as any)[key];');
    writer.writeLine('  }');
    writer.writeLine('});');
    writer.writeLine('');
    writer.writeLine('em.assign(entity, updateData);');
    writer.writeLine('');
    writer.writeLine('return entity;');
  });

  console.log(`Generated update DTO to entity mapping function in ${mappingFilePath}`);
}