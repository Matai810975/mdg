import * as path from 'path';

/**
 * Parses the entity path to extract a relative directory and the entity's base name.
 * This function supports two modes:
 * 1. Template-based extraction: It tries to match the entity path against a template to extract a {dir} and {entity} part.
 * 2. Fallback mode: If the template doesn't match, it uses the --dir argument as the directory and the basename of the entity file as the entity name.
 *
 * @param entityPath The full path to the entity file (from the -e CLI argument).
 * @param dirArg The directory path (from the --dir CLI argument, optional).
 * @param entityTemplate The entity path template from the configuration (e.g., 'src/entities/{dir}/{entity}.ts').
 * @returns An object containing the extracted `dir` and `entityName`.
 */
export function parsePath(
  entityPath: string,
  dirArg: string | undefined,
  entityTemplate: string,
): { dir: string; entityName: string } {
  const entityNameFromPath = path.basename(entityPath, path.extname(entityPath));

  // Create a regex from the template.
  // Example: 'src/entities/{dir}/{entity}.ts'
  // Becomes: 'src\/entities\/(.*?)\/([^\/\\]+?)\.ts'
  const regex = new RegExp(
    entityTemplate
      .replace(/[.*+?^${}()|[\\]/g, '\\$&') // Escape special regex characters
      .replace('{dir}', '(.*?)') // Capture the directory part (non-greedy)
      .replace('{entity}', '([^/\\]+?)') // Capture the entity part
  );

  const match = entityPath.match(regex);

  // If the template regex matches the entity path, extract `dir` and `entityName` from it.
  if (match && match[1] !== undefined && match[2] !== undefined) {
    // match[0] is the full string, match[1] is {dir}, match[2] is {entity}
    const dir = match[1];
    const entityName = match[2].replace(/\.(ts|js)$/, ''); // Clean extension
    return { dir, entityName };
  }

  // If the template does not match, fall back to using --dir and the entity's file name.
  return { dir: dirArg || '', entityName: entityNameFromPath };
}


/**
 * Resolves the final output path for a generated file using a template.
 * @param basePath The base path from the config.
 * @param template The path template for the file type (e.g., controller).
 * @param dir The relative directory.
 * @param entityName The name of the entity.
 * @returns The resolved absolute file path.
 */
export function resolveOutputPath(
  basePath: string,
  template: string,
  dir: string,
  entityName: string,
): string {
    
  // Replace placeholders in the template.
  let filledTemplate = template.replace(/\{entity\}/g, entityName);

  // Safely handle the {dir} placeholder.
  // If dir is empty, we remove the placeholder and any surrounding slashes to avoid empty path segments.
  if (dir) {
    filledTemplate = filledTemplate.replace(/\{dir\}/g, dir);
  } else {
    // Handles cases like `/{dir}/` or `{dir}/` -> `/`
    filledTemplate = filledTemplate.replace(/(\/)?\{dir\}(\/)?/g, '/');
    // Handles case where template is just `{dir}`
    if (filledTemplate === '{dir}') filledTemplate = '';
  }

  // Remove any double slashes that might result from joining paths or template substitutions.
  filledTemplate = filledTemplate.replace(/[\/\\]+/g, '/');

  // Convert kebab-case file names to match entity class name casing if needed
  // But usually the template expects the kebab-case file name for {entity}
  // Let's check if we should be converting cases. 
  // Actually, based on the config, {entity} usually refers to the file name without extension.
  // If the input entityName is "User" (class name), and the file is "user.entity.ts", 
  // then parsePath extracts "user" (file name).
  
  return path.resolve(basePath, filledTemplate);
}