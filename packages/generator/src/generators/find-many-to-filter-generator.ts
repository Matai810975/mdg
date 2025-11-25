import { Project, SourceFile, ClassDeclaration, PropertyDeclaration } from 'ts-morph';
import path from 'path';
import { shouldExcludePropertyForOperation } from "../utils/extract-dto-options";
import { extractEnumTypeFromDecorator } from "../utils/extract-enum-type";
import { isEntityClass } from "../utils/is-entity-class";
import { extractEntityNameFromPath } from "../utils/extract-entity-name";

// Configuration interface
interface FindManyToFilterGeneratorConfig {
  project: Project;
  sourceFiles: SourceFile[];
  outputPath: string;
}

/**
 * Generate filter mapping files for all entities in the source files
 * @param config Generator configuration
 */
export function generateFindManyToFilterMappingFiles(config: FindManyToFilterGeneratorConfig): void {
  for (const sourceFile of config.sourceFiles) {
    const classes = sourceFile.getClasses();
    for (const classDeclaration of classes) {
      // Only process classes that have the @Entity() decorator
      if (!isEntityClass(classDeclaration)) {
        continue; // Skip non-entity classes
      }

      const className = classDeclaration.getName();
      if (className) {
        generateFindManyToFilterMappingFunction(classDeclaration, className, config.outputPath, sourceFile, config.project);
      }
    }
  }
}

/**
 * Generate a mapping function from findMany DTO to filter object
 */
function generateFindManyToFilterMappingFunction(
  entityClass: ClassDeclaration,
  className: string,
  outputPath: string,
  sourceFile: SourceFile,
  project: Project
): void {
  const generatedDir = path.join(outputPath, "generated");
  const entityDir = path.join(generatedDir, className.toLowerCase());
  const mappingFileName = `${className.toLowerCase()}.find-many.mapping.ts`;
  const mappingFilePath = path.join(entityDir, mappingFileName);

  // Create directories if they don't exist
  if (!project.getDirectory(generatedDir)) {
    project.createDirectory(generatedDir);
  }
  if (!project.getDirectory(entityDir)) {
    project.createDirectory(entityDir);
  }

  const mappingFile = project.createSourceFile(mappingFilePath, '', { overwrite: true });

  // Import the entity and findMany DTO
  const entityFilePath = sourceFile.getFilePath();
  const cleanEntityFileName = extractEntityNameFromPath(entityFilePath);
  const dtoFileName = `${className.toLowerCase()}.find-many.dto`;

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
    namedImports: [`${className}FindManyDto`],
  });

  // Import the FilterQuery type from MikroORM
  mappingFile.addImportDeclaration({
    moduleSpecifier: "@mikro-orm/core",
    namedImports: ["FilterQuery"],
  });

  // Generate the mapping function
  const mappingFunction = mappingFile.addFunction({
    name: `${className}FindManyDtoToFilter`,
    parameters: [
      {
        name: 'dto',
        type: `${className}FindManyDto`,
      }
    ],
    returnType: `FilterQuery<${className}>`,
    isExported: true,
  });

  // Add function body
  const properties = entityClass.getProperties();

  // Add opening of function body
  mappingFunction.setBodyText(writer => {
    writer.writeLine(`const filter: FilterQuery<${className}> = {};`);
    writer.writeLine('');

    for (const property of properties) {
      const propertyName = property.getName();
      const propertyType = property.getType();
      const propertyTypeText = propertyType.getText();
      const decorators = property.getDecorators();
      const isPrimaryKey = decorators.some(
        (d: any) => d.getName() === "PrimaryKey"
      );

      // Skip primary key in findMany filters for most cases (they're usually for querying, not filtering)
      if (isPrimaryKey) {
        continue;
      }

      // Check if the property should be excluded from findMany DTO
      const shouldExclude = shouldExcludePropertyForOperation(property, 'findMany');
      if (shouldExclude) {
        continue;
      }

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

      if (isEntityProperty) {
        writer.writeLine(`  // Process property: ${propertyName}`);
        writer.writeLine(`  if (dto.${propertyName} !== undefined && dto.${propertyName} !== null) {`);

        // Determine the appropriate operator type based on the property type
        const isStringType = propertyTypeText.includes('string');
        const isNumberType = propertyTypeText.includes('number');
        const isDateType = propertyTypeText.includes('Date');
        const isBooleanType = propertyTypeText.includes('boolean');

        if (isDateType) {
          writer.writeLine(`    // Check if the value is a Date object first, since typeof Date returns 'object'`);
          writer.writeLine(`    if (dto.${propertyName} instanceof Date) {`);
          writer.writeLine(`      // Direct Date value assignment`);
          writer.writeLine(`      filter.${propertyName} = dto.${propertyName};`);
          writer.writeLine(`    } else if (typeof dto.${propertyName} === 'object') {`);
        } else {
          writer.writeLine(`    if (typeof dto.${propertyName} === 'object') {`);
        }

        writer.writeLine(`      // Handle operators`);
        writer.writeLine(`      const operators = dto.${propertyName};`);
        writer.writeLine(`      if (operators.eq !== undefined) {`);
        writer.writeLine(`        filter.${propertyName} = operators.eq;`);
        writer.writeLine(`      } else {`);
        writer.writeLine(`        // Handle other operators based on type`);

        if (isStringType) {
          writer.writeLine(`        if (operators.contains !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $ilike: '%' + operators.contains + '%' };`);
          writer.writeLine(`        } else if (operators.startsWith !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $ilike: operators.startsWith + '%' };`);
          writer.writeLine(`        } else if (operators.endsWith !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $ilike: '%' + operators.endsWith };`);
          writer.writeLine(`        } else if (operators.in !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $in: operators.in };`);
        } else if (isNumberType) {
          writer.writeLine(`        if (operators.gte !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $gte: operators.gte };`);
          writer.writeLine(`        } else if (operators.lte !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $lte: operators.lte };`);
          writer.writeLine(`        } else if (operators.gt !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $gt: operators.gt };`);
          writer.writeLine(`        } else if (operators.lt !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $lt: operators.lt };`);
          writer.writeLine(`        } else if (operators.in !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $in: operators.in };`);
        } else if (isDateType) {
          writer.writeLine(`        if (operators.gte !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $gte: operators.gte };`);
          writer.writeLine(`        } else if (operators.lte !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $lte: operators.lte };`);
          writer.writeLine(`        } else if (operators.gt !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $gt: operators.gt };`);
          writer.writeLine(`        } else if (operators.lt !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $lt: operators.lt };`);
          writer.writeLine(`        } else if (operators.in !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $in: operators.in };`);
        } else if (isBooleanType) {
          writer.writeLine(`        if (operators.in !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $in: operators.in };`);
        } else {
          // Default case for other types
          writer.writeLine(`        if (operators.in !== undefined) {`);
          writer.writeLine(`          filter.${propertyName} = { $in: operators.in };`);
        }

        writer.writeLine(`        }`);
        writer.writeLine(`      }`);
        writer.writeLine(`    } else {`);
        writer.writeLine(`      // Direct value assignment`);
        writer.writeLine(`      filter.${propertyName} = dto.${propertyName};`);
        writer.writeLine(`    }`);
        writer.writeLine(`  }`);
        writer.writeLine('');
      } else if (isRelation) {
        writer.writeLine(`  // Process relation property: ${propertyName}`);
        writer.writeLine(`  if (dto.${propertyName} !== undefined && dto.${propertyName} !== null) {`);
        writer.writeLine(`    // Check if the value is an array first, since arrays are also objects`);
        writer.writeLine(`    if (Array.isArray(dto.${propertyName})) {`);
        writer.writeLine(`      // Direct array value assignment for relation`);
        writer.writeLine(`      filter.${propertyName} = dto.${propertyName};`);
        writer.writeLine(`    } else if (typeof dto.${propertyName} === 'object') {`);
        writer.writeLine(`      // Handle operators for relation`);
        writer.writeLine(`      const operators = dto.${propertyName};`);
        writer.writeLine(`      if (operators.eq !== undefined) {`);
        writer.writeLine(`        filter.${propertyName} = operators.eq;`);
        writer.writeLine(`      } else if (operators.gte !== undefined) {`);
        writer.writeLine(`        filter.${propertyName} = { $gte: operators.gte };`);
        writer.writeLine(`      } else if (operators.lte !== undefined) {`);
        writer.writeLine(`        filter.${propertyName} = { $lte: operators.lte };`);
        writer.writeLine(`      } else if (operators.in !== undefined) {`);
        writer.writeLine(`        filter.${propertyName} = { $in: operators.in };`);
        writer.writeLine(`      }`);
        writer.writeLine(`    } else {`);
        writer.writeLine(`      // Direct value assignment for relation (e.g., single ID)`);
        writer.writeLine(`      filter.${propertyName} = dto.${propertyName};`);
        writer.writeLine(`    }`);
        writer.writeLine(`  }`);
        writer.writeLine('');
      }
    }

    writer.writeLine('  return filter;');
  });
}