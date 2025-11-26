import * as path from 'path';
import { DtoGeneratorConfig } from '../types/config.types';

/**
 * Get DTO import path relative to CRUD output directory
 */
export function getDtoImportPath(
  entityFileName: string,
  config: DtoGeneratorConfig,
  entityFilePath?: string,
  crudOutputPath?: string
): string {
  // Get the DTO output directory from config
  const dtoOutputDir = config.output || 'src/dtos';

  // If we know the entity file path and CRUD output path, calculate the relative path
  if (entityFilePath && crudOutputPath) {
    // The DTOs are generated in a subdirectory structure like output/generated/entityname/
    // Calculate the relative path from the CRUD output directory to the DTO entity subdirectory
    const dtoEntityDir = path.join(dtoOutputDir, 'generated', entityFileName.toLowerCase());
    const relativePath = path.relative(crudOutputPath, dtoEntityDir).replace(/\\/g, '/');

    // If the DTO output is in the same or a sibling directory, the path might start with '..'
    // If it's in a subdirectory, it might be a direct path
    // We return the path to the entity directory with the entity file name as base
    return `${relativePath}/${entityFileName.toLowerCase()}`;
  }

  // Fallback: if we don't have the paths, use a reasonable default
  // This should be adjusted based on the relationship between the entity file location and the CRUD output location
  return `../dtos/${entityFileName.toLowerCase()}`;
}

/**
 * Get full DTO import paths for a specific entity
 */
export function getEntityDtoImports(
  entityFileName: string,
  config: DtoGeneratorConfig,
  entityFilePath?: string,
  crudOutputPath?: string
): {
  dtoImport: string;
  createDtoImport: string;
  updateDtoImport: string;
} {
  const basePath = getDtoImportPath(entityFileName, config, entityFilePath, crudOutputPath);

  return {
    dtoImport: `${basePath}.dto`,
    createDtoImport: `${basePath}.create.dto`,
    updateDtoImport: `${basePath}.update.dto`
  };
}
