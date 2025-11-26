import { ClassDeclaration, PropertyDeclaration } from "ts-morph";
import { EntityRegistry, resolveRelationEntityTypeWithRegistry, inferEntityTypeFromPropertyTypeWithRegistry } from "./entity-registry";

/**
 * Resolve relation entity type from decorator using entity registry for O(1) lookup performance
 */
export function resolveRelationEntityTypeOptimized(
  decorator: any,
  property: PropertyDeclaration,
  registry: EntityRegistry
): ClassDeclaration | null {
  return resolveRelationEntityTypeWithRegistry(decorator, property, registry);
}

/**
 * Infer entity type from property type annotation using entity registry for O(1) lookup performance
 */
export function inferEntityTypeFromPropertyTypeOptimized(
  property: PropertyDeclaration,
  registry: EntityRegistry
): ClassDeclaration | null {
  // Get the property type to infer the entity type
  const propertyType = property.getType();
  const typeSymbol = propertyType.getSymbol();

  // Handle union types (like Category | null) by getting the non-null type
  let actualType = propertyType;
  let actualTypeName = typeSymbol?.getName() || "";

  if (propertyType.isUnion()) {
    const unionTypes = propertyType.getUnionTypes();
    // Find the non-null/non-undefined type
    const nonNullType = unionTypes.find(t =>
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
      return registry[argTypeName] || null;
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
      return registry[argTypeName] || null;
    }
  } else if (entityNameToFind) {
    // Use the registry for O(1) lookup instead of nested loops
    return registry[entityNameToFind] || null;
  }

  return null;
}

