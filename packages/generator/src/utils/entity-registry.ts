import { ClassDeclaration, SourceFile } from "ts-morph";
import { getStringCache, setStringCache } from "./cache-manager";

export interface EntityRegistry {
  [entityName: string]: ClassDeclaration;
}

/**
 * Creates an entity registry mapping entity names to their class declarations
 * This allows O(1) lookups instead of O(N*M) nested loops for relation resolution
 *
 * @param sourceFiles Array of source files to scan for entities
 * @returns A registry mapping entity names to their class declarations
 */
export function createEntityRegistry(sourceFiles: SourceFile[]): EntityRegistry {
  const registry: EntityRegistry = {};

  for (const file of sourceFiles) {
    const classes = file.getClasses();
    for (const cls of classes) {
      const className = cls.getName();
      if (className) {
        registry[className] = cls;
      }
    }
  }

  return registry;
}

/**
 * Resolves relation entity type from decorator using the entity registry for O(1) lookup
 */
export function resolveRelationEntityTypeWithRegistry(
  decorator: any,
  property: any, // PropertyDeclaration type
  registry: EntityRegistry
): ClassDeclaration | null {
  // Create cache key from decorator text and property name
  const decoratorText = decorator.getFullText();
  const propertyName = property.getName ? property.getName() : '';
  const cacheKey = `resolveRelationEntityTypeWithRegistry:${propertyName}:${decoratorText}`;

  // Check cache first
  const cachedResult = getStringCache(cacheKey);
  if (cachedResult !== undefined) {
    // For cached class declarations, we need to return the actual class from registry
    if (cachedResult === null) {
      return null;
    }
    // Return the actual class from registry
    return registry[cachedResult] || null;
  }

  const args = decorator.getArguments();

  // Case 1: First argument is a function like () => Entity
  if (args.length > 0) {
    const firstArg = args[0].getText();
    // 处理 () => Entity 格式
    const match = firstArg.match(/\(\)\s*=>\s*(\w+)/);
    if (match) {
      const entityName = match[1];
      // Use the registry for O(1) lookup instead of nested loops
      const result = registry[entityName] || null;
      // Cache the entity name (not the class itself to avoid circular references)
      setStringCache(cacheKey, result ? entityName : null);
      return result;
    }

    // Case 2: First argument is an options object
    // In this case, infer entity type from property type annotation
    if (firstArg.startsWith("{") && firstArg.endsWith("}")) {
      const result = inferEntityTypeFromPropertyTypeWithRegistry(property, registry);
      // Cache the result
      if (result) {
        // Find the entity name in registry for caching
        const entityName = Object.keys(registry).find(key => registry[key] === result) || null;
        setStringCache(cacheKey, entityName);
      } else {
        setStringCache(cacheKey, null);
      }
      return result;
    }
  }
  // Case 3: No arguments in decorator (e.g., @ManyToOne())
  // In this case, infer entity type from property type annotation
  else if (args.length === 0) {
    const result = inferEntityTypeFromPropertyTypeWithRegistry(property, registry);
    // Cache the result
    if (result) {
      // Find the entity name in registry for caching
      const entityName = Object.keys(registry).find(key => registry[key] === result) || null;
      setStringCache(cacheKey, entityName);
    } else {
      setStringCache(cacheKey, null);
    }
    return result;
  }

  // Cache the null result
  setStringCache(cacheKey, null);
  return null;
}

/**
 * Infer entity type from property type annotation using the entity registry
 */
function inferEntityTypeFromPropertyTypeWithRegistry(
  property: any, // PropertyDeclaration type
  registry: EntityRegistry
): ClassDeclaration | null {
  // Create cache key from property name
  const propertyName = property.getName ? property.getName() : '';
  const cacheKey = `inferEntityTypeFromPropertyTypeWithRegistry:${propertyName}`;

  // Check cache first
  const cachedResult = getStringCache(cacheKey);
  if (cachedResult !== undefined) {
    // For cached class declarations, we need to return the actual class from registry
    if (cachedResult === null) {
      return null;
    }
    // Return the actual class from registry
    return registry[cachedResult] || null;
  }

  // Get the property type to infer the entity type
  const propertyType = property.getType();
  const typeSymbol = propertyType.getSymbol();

  // Handle union types (like Category | null) by getting the non-null type
  let actualType = propertyType;
  let actualTypeName = typeSymbol?.getName() || "";

  if (propertyType.isUnion()) {
    const unionTypes = propertyType.getUnionTypes();
    // Find the non-null/non-undefined type
    const nonNullType = unionTypes.find((t: any) =>
      !t.isUndefined() && !t.isNull()
    );
    if (nonNullType) {
      actualType = nonNullType;
      const nonNullSymbol = actualType.getSymbol();
      if (nonNullSymbol) {
        actualTypeName = nonNullSymbol.getName();
      }
    }
  }

  // Extract entity name from complex types like import("path").EntityName
  let entityNameToFind = actualTypeName;
  const propertyTypeText = actualType.getText();

  // Find the LAST import statement to get the actual entity type (in complex types, the entity is usually the last one)
  const allImportMatches = propertyTypeText.match(/import\([^)]+\)\.([A-Za-z_][A-Za-z0-9_]*)/g);
  let importMatch = null;
  if (allImportMatches && allImportMatches.length > 0) {
    // Use the last match
    const lastMatchText = allImportMatches[allImportMatches.length - 1];
    const lastMatch = lastMatchText.match(/import\([^)]+\)\.([A-Za-z_][A-Za-z0-9_]*)/);
    if (lastMatch) {
      importMatch = lastMatch;
    }
  }

  if (importMatch) {
    entityNameToFind = importMatch[1];  // Extracted entity name from import("path").EntityName
  }

  // If we still don't have a symbol name, try to get it from the import match
  if (!actualTypeName && entityNameToFind) {
    actualTypeName = entityNameToFind;
  }

  // Handle Collection<SomeType> case
  if (
    actualTypeName === "Collection" &&
    actualType.getTypeArguments().length > 0
  ) {
    const argType = actualType.getTypeArguments()[0];
    const argSymbol = argType.getSymbol();
    if (argSymbol) {
      const argTypeName = argSymbol.getName();
      // Use the registry for O(1) lookup instead of nested loops
      const result = registry[argTypeName] || null;
      // Cache the entity name (not the class itself to avoid circular references)
      setStringCache(cacheKey, result ? argTypeName : null);
      return result;
    }
  }
  // Handle Ref<SomeType> case
  else if (
    actualTypeName === "Ref" &&
    actualType.getTypeArguments().length > 0
  ) {
    const argType = actualType.getTypeArguments()[0];
    const argSymbol = argType.getSymbol();
    if (argSymbol) {
      const argTypeName = argSymbol.getName();
      // Use the registry for O(1) lookup instead of nested loops
      const result = registry[argTypeName] || null;
      // Cache the entity name (not the class itself to avoid circular references)
      setStringCache(cacheKey, result ? argTypeName : null);
      return result;
    }
  } else if (entityNameToFind) {
    // Use the registry for O(1) lookup instead of nested loops
    const result = registry[entityNameToFind] || null;
    // Cache the entity name (not the class itself to avoid circular references)
    setStringCache(cacheKey, result ? entityNameToFind : null);
    return result;
  }

  // Cache the null result
  setStringCache(cacheKey, null);
  return null;
}