import { EntityInfo } from '../resource-utils/entity-analyzer';
import { TemplateUtils } from '../resource-utils/template-utils';
import * as path from 'path';
import { DtoGeneratorConfig } from '../types/config.types';
import { getEntityDtoImports } from '../resource-utils/config-loader';

/**
 * Generate NestJS controller content for an entity using Handlebars template
 */
export function generateController(entityInfo: EntityInfo, dtoConfig: DtoGeneratorConfig | null, outputPath?: string): string {
  const entityName = entityInfo.name;
  const entityFileName = entityInfo.fileName;
  const entityFileNameKebab = entityFileName.toLowerCase();
  const entityNameCamel = entityName.charAt(0).toLowerCase() + entityName.slice(1);
  const primaryKey = entityInfo.primaryKey;

  // Determine primary key type (default to number)
  const primaryKeyProperty = entityInfo.properties.find(prop => prop.name === primaryKey);
  const primaryKeyType = primaryKeyProperty?.type || 'number';

  // Get DTO import paths
  // Get the directory of the entity file for relative path calculation
  const entityFileDir = path.dirname(entityInfo.filePath);
  const dtoImports = dtoConfig ? getEntityDtoImports(entityFileName, dtoConfig, entityFileDir, outputPath) : {
    dtoImport: `../dtos/${entityFileName.toLowerCase()}.dto`,
    createDtoImport: `../dtos/${entityFileName.toLowerCase()}.create.dto`,
    updateDtoImport: `../dtos/${entityFileName.toLowerCase()}.update.dto`
  };

  // Calculate base path for FindMany DTOs
  const basePath = dtoImports.dtoImport.replace(/\.dto$/, '');

  // Calculate the relative path to the entity file
  // The outputPath is already the entity-specific directory (e.g., src/test/crud-output/user)
  const entityOutputDir = outputPath || '';
  const entityImportPath = path.relative(
    entityOutputDir,
    entityInfo.filePath
  ).replace(/\\/g, '/').replace(/\.ts$/, '');

  // Generate template context
  const context = {
    entityName,
    entityFileName,
    entityFileNameKebab,
    entityNameCamel,
    primaryKey,
    primaryKeyType,
    pluralName: entityFileName + (entityFileName.endsWith('s') ? '' : 's'),
    entityImportPath,
    dtoImportPath: dtoImports.dtoImport,
    createDtoImportPath: dtoImports.createDtoImport,
    updateDtoImportPath: dtoImports.updateDtoImport,
    // FindMany DTO paths
    findManyDtoImportPath: `${basePath}.find-many.dto`,
    findManyResponseDtoImportPath: `${basePath}.find-many.response.dto`,
  };

  // Get template path
  const templatePath = path.join(__dirname, '..', 'templates', 'controller.template.hbs');

  // Compile and render template
  const template = TemplateUtils.compileTemplateFromFile(templatePath);
  return TemplateUtils.renderTemplate(template, context);
}