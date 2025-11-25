import {
  Project,
  SourceFile,
  ClassDeclaration,
  PropertyDeclaration,
} from "ts-morph";
import path from "path";
import { getPropertyJSDocComment } from "../utils/get-property-js-doc-comment";
import {
  extractPrimaryKeyType,
  extractPrimaryKeyTypeWithValidation,
} from "../utils/extract-primary-key-type";
import { getPropertyDecoratorComment } from "../utils/get-property-decorator-comment";
import { resolveRelationEntityType, resolveRelationEntityTypeOptimized } from "../utils/resolve-relation-entity-type";
import { createEntityRegistry, EntityRegistry } from "../utils/entity-registry";
import { checkPropertyNullable } from "../utils/check-property-nullable";
import { shouldExcludePropertyForOperation } from "../utils/extract-dto-options";
import { getAllPropertiesIncludingInherited } from "../utils/get-all-properties-including-inherited";
import { extractEnumTypeFromDecorator } from "../utils/extract-enum-type";
import { isEntityClass } from "../utils/is-entity-class";
import { EntityResolutionError } from "../errors/EntityResolutionError";
import { createErrorContext, formatError } from "../errors/error-utils";

// Configuration interface
export interface DtoGeneratorConfig {
  project: Project;
  sourceFiles: SourceFile[];
  outputPath: string;
}

/**
 * Generate DTO files for all entities in the source files
 * @param config Generator configuration
 */
export function generateDtoFiles(config: DtoGeneratorConfig): void {
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
          generateDtoForEntity(
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
            `[ERROR] Failed to generate DTO for entity '${className}' in file '${sourceFile.getFilePath()}':`,
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
 * Generate a DTO file for a single entity
 */
export function generateDtoForEntity(
  entityClass: ClassDeclaration,
  className: string,
  outputPath: string,
  sourceFile: SourceFile,
  project: Project,
  entityRegistry: EntityRegistry
): void {
  const generatedDir = path.join(outputPath, "generated");
  const entityDir = path.join(generatedDir, className.toLowerCase());
  const dtoFileName = `${className.toLowerCase()}.dto.ts`;
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

  dtoFile.addImportDeclaration({
    moduleSpecifier: "@nestjs/swagger",
    namedImports: ["ApiProperty"],
  });

  const dtoClass = dtoFile.addClass({
    name: `${className}Dto`,
    isExported: true,
  });

  const properties = getAllPropertiesIncludingInherited(entityClass);

  for (const property of properties) {
    processProperty(
      property,
      dtoClass,
      dtoFile,
      dtoFilePath,
      sourceFile,
      project,
      className,
      entityRegistry
    );
  }

  console.log(`Generated ${dtoFilePath}`);
}

/**
 * Check if a property should be excluded based on DtoOptions decorator for Data DTO
 */
function shouldExcludeProperty(property: PropertyDeclaration): boolean {
  return shouldExcludePropertyForOperation(property, "data");
}

/**
 * Process a property and add it to the DTO class
 */
export function processProperty(
  property: PropertyDeclaration,
  dtoClass: any,
  dtoFile: SourceFile,
  dtoFilePath: string,
  sourceFile: SourceFile,
  project: Project,
  entityClassName?: string,
  entityRegistry?: EntityRegistry
): void {
  const propertyName = property.getName();
  const propertyType = property.getType();
  const propertyTypeText = propertyType.getText();
  const isOptional = property.hasQuestionToken();
  const isNullable = checkPropertyNullable(property);

  // 检查是否有DtoOptions装饰器指定排除该字段
  const shouldExclude = shouldExcludeProperty(property);

  if (shouldExclude) {
    return; // 如果装饰器指定排除，则跳过该字段
  }

  const decorators = property.getDecorators();
  const isPrimaryKey = decorators.some(
    (d: any) => d.getName() === "PrimaryKey"
  );
  const isEntityProperty = decorators.some(
    (d: any) => d.getName() === "Property" || d.getName() === "Enum"
  );
  const isRelation = decorators.some(
    (d: any) =>
      d.getName() === "OneToMany" ||
      d.getName() === "ManyToOne" ||
      d.getName() === "ManyToMany" ||
      d.getName() === "OneToOne"
  );

  // 处理主键
  if (isPrimaryKey) {
    const apiPropertyArgs = [];

    // Only add required: false since required: true is the default
    if (isOptional) {
      apiPropertyArgs.push("required: false");
    }

    if (isNullable) {
      apiPropertyArgs.push("nullable: true");
    }

    // Add ApiProperty decorator for all primary key properties to make them part of API doc
    // Only specify arguments if there are non-default properties to override
    if (apiPropertyArgs.length > 0) {
      dtoClass
        .addProperty({
          name: propertyName,
          type: propertyTypeText,
          hasQuestionToken: isOptional,
        })
        .addDecorator({
          name: "ApiProperty",
          arguments: [`{ ${apiPropertyArgs.join(", ")} }`],
        });
    } else {
      // For simple required primary keys with no special attributes, still add ApiProperty
      // but without arguments to keep it clean
      dtoClass
        .addProperty({
          name: propertyName,
          type: propertyTypeText,
          hasQuestionToken: isOptional,
          hasExclamationToken: !isOptional, // Add ! for required fields
        })
        .addDecorator({
          name: "ApiProperty",
          arguments: [""],
        });
    }
  } else if (isEntityProperty) {
    processEntityProperty(
      property,
      propertyTypeText,
      isOptional,
      isNullable,
      dtoClass,
      dtoFile,
      dtoFilePath,
      sourceFile
    );
  } else if (isRelation) {
    processRelationProperty(
      property,
      isOptional,
      isNullable,
      dtoClass,
      dtoFile,
      dtoFilePath,
      project,
      entityClassName,
      entityRegistry
    );
  }
}

/**
 * Process an entity property and add it to the DTO class
 */
function processEntityProperty(
  property: PropertyDeclaration,
  propertyTypeText: string,
  isOptional: boolean,
  isNullable: boolean,
  dtoClass: any,
  dtoFile: SourceFile,
  dtoFilePath: string,
  sourceFile: SourceFile
): void {
  let typeText = propertyTypeText;
  const decorators = property.getDecorators();
  const enumDecorator = decorators.find((d: any) => d.getName() === "Enum");

  // Extract comment from decorator options first, then from JSDoc comments as fallback
  const decoratorComment = getPropertyDecoratorComment(property);
  const jsdocComment = getPropertyJSDocComment(property);
  const comments = decoratorComment || jsdocComment;

  // For nullable fields that are not optional, modify the type to include | null
  if (isNullable && !isOptional) {
    // Check if the type already includes null to avoid duplication
    if (!typeText.includes("null")) {
      typeText = `${typeText} | null`;
    }
  }

  if (enumDecorator) {
    const extractedEnumType = extractEnumTypeFromDecorator(property);
    if (extractedEnumType) {
      typeText = extractedEnumType;

      // Try to find the actual enum definition in the source file and its imports
      let enumPath: string | undefined;
      const sourceFileImports = sourceFile.getImportDeclarations();

      for (const imp of sourceFileImports) {
        const namedImports = imp.getNamedImports();
        for (const namedImport of namedImports) {
          if (namedImport.getName() === extractedEnumType) {
            const moduleSpecifier = imp.getModuleSpecifierValue();
            // If the module specifier is relative, resolve it relative to the source file
            if (moduleSpecifier.startsWith(".")) {
              const resolvedPath = path.resolve(
                path.dirname(sourceFile.getFilePath()),
                moduleSpecifier
              );
              const relativePathFromDto = path
                .relative(path.dirname(dtoFilePath), resolvedPath)
                .replace(/\\/g, "/");
              enumPath = relativePathFromDto.startsWith(".")
                ? relativePathFromDto
                : "./" + relativePathFromDto;
            } else {
              // If it's not a relative path, use the module specifier as-is
              enumPath = moduleSpecifier;
            }
            break;
          }
        }
        if (enumPath) break;
      }

      // If we couldn't find the enum import, fall back to the entity file path
      if (!enumPath) {
        const relativePath = path.relative(
          path.dirname(dtoFilePath),
          sourceFile.getFilePath()
        );
        const parsedPath = path.parse(relativePath);
        enumPath = path
          .join(parsedPath.dir, parsedPath.name)
          .replace(/\\/g, "/");
      }

      dtoFile.addImportDeclaration({
        moduleSpecifier: enumPath,
        namedImports: [extractedEnumType],
      });
    }
  }

  const apiPropertyArgs = [];

  // Only add required: false since required: true is the default
  if (isOptional) {
    apiPropertyArgs.push("required: false");
  }

  if (enumDecorator) {
    apiPropertyArgs.push(`enum: ${typeText}, enumName: '${typeText}'`);
  }

  if (comments) {
    // Use JSON.stringify to properly escape the string for inclusion in the decorator
    const escapedComments = JSON.stringify(comments);
    apiPropertyArgs.push(`description: ${escapedComments}`);
  }

  // Add nullable information if the field can be null
  if (isNullable) {
    apiPropertyArgs.push("nullable: true");
  }

  const propertyDef = dtoClass.addProperty({
    name: property.getName(),
    type: typeText,
    hasQuestionToken: isOptional,
    hasExclamationToken: !isOptional, // Add ! for required fields
  });

  // Add ApiProperty decorator for all entity properties to make them part of API doc
  // Only specify arguments if there are non-default properties to override
  if (apiPropertyArgs.length > 0) {
    propertyDef.addDecorator({
      name: "ApiProperty",
      arguments: [`{ ${apiPropertyArgs.join(", ")} }`],
    });
  } else {
    // For simple required properties with no special attributes, still add ApiProperty
    // but without arguments to keep it clean
    propertyDef.addDecorator({
      name: "ApiProperty",
      arguments: [""],
    });
  }
}

/**
 * Process a relation property and add it to the DTO class
 */
function processRelationProperty(
  property: PropertyDeclaration,
  isOptional: boolean,
  isNullable: boolean,
  dtoClass: any,
  dtoFile: SourceFile,
  dtoFilePath: string,
  project: Project,
  entityClassName?: string,
  entityRegistry?: EntityRegistry
): void {
  const decorators = property.getDecorators();
  const relationDecorator = decorators.find(
    (d: any) =>
      d.getName() === "OneToMany" ||
      d.getName() === "ManyToOne" ||
      d.getName() === "ManyToMany" ||
      d.getName() === "OneToOne"
  );

  if (relationDecorator) {
    const relationDecoratorName = relationDecorator.getName();
    let targetEntity: any = null;

    // Use the optimized relation resolution with entity registry if available
    if (entityRegistry) {
      targetEntity = resolveRelationEntityTypeOptimized(
        relationDecorator,
        property,
        entityRegistry
      );
    } else {
      // Fallback to the original method if registry is not available
      const sourceFiles = project.getSourceFiles(); // Get from project
      targetEntity = resolveRelationEntityType(
        relationDecorator,
        property,
        sourceFiles
      );
    }

    if (targetEntity) {
      let primaryKeyType: string | null = null;
      try {
        primaryKeyType = extractPrimaryKeyType(targetEntity);
      } catch (error) {
        if (error instanceof EntityResolutionError) {
          // Re-throw with additional context about the relation being processed
          const context = createErrorContext(
            null,
            property,
            "data-dto-generation",
            "dto"
          );
          context.entityName = entityClassName || "UnknownEntity";
          context.targetType = "relation-target-entity";
          context.operation = "process-relation-property";
          throw new EntityResolutionError(
            `Cannot process relation property '${property.getName()}' in entity '${
              entityClassName || "UnknownEntity"
            }' - target entity '${targetEntity.getName()}' does not have a primary key.`,
            context
          );
        }
        throw error;
      }

      // Extract comment from decorator options first, then from JSDoc comments as fallback
      const decoratorComment = getPropertyDecoratorComment(property);
      const jsdocComment = getPropertyJSDocComment(property);
      const comments = decoratorComment || jsdocComment;

      // 检查是否是 Collection 类型（集合关系）
      // OneToMany 和 ManyToMany 通常是 Collection 类型
      const isOneToMany = relationDecoratorName === "OneToMany";
      const isManyToMany = relationDecoratorName === "ManyToMany";

      const propertyType = property.getType();
      const typeSymbol = propertyType.getSymbol();
      const typeName = typeSymbol?.getName() || "";
      const typeArgs = propertyType.getTypeArguments();

      // 多种方式检测 Collection 类型
      const propertyTypeText = propertyType.getText();
      const isCollection =
        isOneToMany ||
        isManyToMany ||
        typeName === "Collection" ||
        propertyTypeText.includes("Collection<") ||
        propertyTypeText.includes("Collection") ||
        (typeArgs.length > 0 && typeName === "Collection");

      let typeText: string;
      if (isCollection) {
        // Collection 映射为主键数组
        if (primaryKeyType) {
          typeText = `${primaryKeyType}[]`;
        } else {
          const context = createErrorContext(
            null,
            property,
            "data-dto-generation",
            "dto"
          );
          context.entityName = entityClassName || "UnknownEntity";
          context.targetType = "relation-target-entity-primary-key";
          context.operation = "process-collection-relation";
          throw new EntityResolutionError(
            `Cannot process collection relation property '${property.getName()}' in entity '${
              entityClassName || "UnknownEntity"
            }'. Target entity '${
              targetEntity?.getName() || "Unknown"
            }' does not have a primary key. Collection relations require the target entity to have a defined @PrimaryKey.`,
            context
          );
        }
      } else if (primaryKeyType) {
        // 单个关系映射为主键类型
        typeText = primaryKeyType;
      } else {
        const context = createErrorContext(
          null,
          property,
          "data-dto-generation",
          "dto"
        );
        context.entityName = entityClassName || "UnknownEntity";
        context.targetType = "relation-target-entity-primary-key";
        context.operation = "process-single-relation";
        throw new EntityResolutionError(
          `Cannot process single relation property '${property.getName()}' in entity '${
            entityClassName || "UnknownEntity"
          }'. Target entity '${
            targetEntity?.getName() || "Unknown"
          }' does not have a primary key. Single relations require the target entity to have a defined @PrimaryKey.`,
          context
        );
      }

      const apiPropertyArgs = [`type: ${isCollection ? "Array" : "Number"}`];

      // Only add required: false since required: true is the default
      if (isOptional) {
        apiPropertyArgs.push("required: false");
      }

      // Add relation description with proper escaping
      const description = comments || relationDecoratorName + " relation";
      const escapedDescription = JSON.stringify(description);
      apiPropertyArgs.push(`description: ${escapedDescription}`);

      // Add nullable information if the field can be null
      if (isNullable) {
        apiPropertyArgs.push("nullable: true");
        // For nullable relations, include null in the type
        if (!typeText.includes("null")) {
          typeText = `${typeText} | null`;
        }
      }

      const propertyDef = dtoClass.addProperty({
        name: property.getName(),
        type: typeText,
        hasQuestionToken: isOptional,
        hasExclamationToken: !isOptional, // Add ! for required fields
      });

      // Add ApiProperty decorator for all relation properties to make them part of API doc
      // Only specify arguments if there are non-default properties to override
      if (apiPropertyArgs.length > 0) {
        propertyDef.addDecorator({
          name: "ApiProperty",
          arguments: [`{ ${apiPropertyArgs.join(", ")} }`],
        });
      } else {
        // For simple required relations with no special attributes, still add ApiProperty
        // but without arguments to keep it clean
        propertyDef.addDecorator({
          name: "ApiProperty",
          arguments: [""],
        });
      }
    }
  }
}
