import { EntityInfo } from '../resource-utils/entity-analyzer';
import { TemplateUtils } from '../resource-utils/template-utils';
import * as path from 'path';
import { DtoGeneratorConfig } from '../types/config.types';
import { getEntityDtoImports } from '../resource-utils/config-loader';

/**
 * Generate NestJS module content for an entity using Handlebars template
 */
export function generateModule(entityInfo: EntityInfo, dtoConfig: DtoGeneratorConfig | null, outputPath?: string): string {
  const entityFileName = entityInfo.fileName;

  // Calculate the relative path to the entity file
  // The outputPath is already the entity-specific directory (e.g., src/test/crud-output/user)
  const entityOutputDir = outputPath || '';
  const entityImportPath = path.relative(
    entityOutputDir,
    entityInfo.filePath
  ).replace(/\\/g, '/').replace(/\.ts$/, '');

  // Generate template context
  const context = {
    entityName: entityInfo.name,
    entityFileName,
    entityFileNameKebab: entityFileName.toLowerCase(),
    entityImportPath,
    hasRelations: entityInfo.relations.length > 0,
    relations: entityInfo.relations.map(rel => ({
      name: rel.name,
      type: rel.type,
      relationType: rel.relationType
    }))
  };

  // Get template path
  const templatePath = path.join(__dirname, '..', 'templates', 'module.template.hbs');

  // Compile and render template
  const template = TemplateUtils.compileTemplateFromFile(templatePath);
  return TemplateUtils.renderTemplate(template, context);
}