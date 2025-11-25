import { ClassDeclaration, PropertyDeclaration } from "ts-morph";
import { getClassCache } from "./cache-manager";

/**
 * Recursively gets all properties from a class including inherited properties
 * from parent classes in the inheritance hierarchy.
 *
 * If a property is overridden in a child class, the child's property takes precedence.
 *
 * @param entityClass The class to get properties from
 * @returns Array of all properties including inherited ones
 */
export function getAllPropertiesIncludingInherited(entityClass: ClassDeclaration): PropertyDeclaration[] {
  // Check cache first
  const cache = getClassCache(entityClass, 'getAllPropertiesIncludingInherited');
  const cacheKey = 'properties';

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // Get direct properties of the current class
  let allProperties = [...entityClass.getProperties()];
  // Get base class if it exists
  const baseClass = entityClass.getBaseClass();
  if (baseClass) {
    // Recursively get inherited properties
    const inheritedProperties = getAllPropertiesIncludingInherited(baseClass);

    // Filter out properties that are overridden in the current class
    // This ensures child class properties take precedence
    const inheritedPropsNotOverridden = inheritedProperties.filter(
      inheritedProp => !allProperties.some(
        currentProp => currentProp.getName() === inheritedProp.getName()
      )
    );

    // Combine inherited properties with current class properties
    allProperties = [...inheritedPropsNotOverridden, ...allProperties];
  }

  // Cache the result
  cache.set(cacheKey, allProperties);

  return allProperties;
}