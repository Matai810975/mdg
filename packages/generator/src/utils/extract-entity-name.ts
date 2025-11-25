import * as path from 'path';

/**
 * Extract clean entity name from file path by removing .ts extension and common suffixes
 * @param entityPath Path to the entity file
 * @returns Clean entity name without common suffixes like .entity, .model, .schema
 */
export function extractEntityNameFromPath(entityPath: string): string {
  const baseName = path.basename(entityPath, '.ts');
  // Remove common suffixes like .entity, .model, etc. to extract clean entity name
  return baseName.replace(/\.(entity|model|schema)$/, '');
}

/**
 * Extract clean file name from file path (alias to extractEntityNameFromPath for consistency)
 * @param entityPath Path to the entity file
 * @returns Clean file name without common suffixes like .entity, .model, .schema
 */
export function extractFileNameFromPath(entityPath: string): string {
  return extractEntityNameFromPath(entityPath);
}