import { ClassDeclaration } from "ts-morph";
import { getAllPropertiesIncludingInherited } from "./get-all-properties-including-inherited";
import { EntityResolutionError } from "../errors/EntityResolutionError";
import { getClassCache } from "./cache-manager";

/**
 * Extract primary key type from an entity class
 */
export function extractPrimaryKeyType(entityClass: ClassDeclaration): string | null {
  // Check cache first
  const cache = getClassCache(entityClass, 'extractPrimaryKeyType');
  const cacheKey = 'primaryKeyType';

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const properties = getAllPropertiesIncludingInherited(entityClass);
  for (const prop of properties) {
    const decorators = prop.getDecorators();
    if (decorators.some((d: any) => d.getName() === 'PrimaryKey')) {
      const typeText = prop.getType().getText();
      // 清理类型文本，移除 ! 等修饰符
      const result = typeText.replace(/!/g, '').trim();

      // Cache the result
      cache.set(cacheKey, result);
      return result;
    }
  }

  // Cache the null result
  cache.set(cacheKey, null);
  return null;
}

/**
 * Extract primary key type from an entity class with detailed error handling
 */
export function extractPrimaryKeyTypeWithValidation(entityClass: ClassDeclaration, className?: string): string {
  // Check cache first
  const cache = getClassCache(entityClass, 'extractPrimaryKeyTypeWithValidation');
  const cacheKey = 'primaryKeyTypeWithValidation';

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const properties = getAllPropertiesIncludingInherited(entityClass);
  for (const prop of properties) {
    const decorators = prop.getDecorators();
    if (decorators.some((d: any) => d.getName() === 'PrimaryKey')) {
      const typeText = prop.getType().getText();
      // 清理类型文本，移除 ! 等修饰符
      const result = typeText.replace(/!/g, '').trim();

      // Cache the result
      cache.set(cacheKey, result);
      return result;
    }
  }

  // If no primary key is found, throw a detailed error
  const entityName = className || (entityClass.getName ? entityClass.getName() : 'UnknownEntity');

  // Cache the error result (we don't want to cache the error itself, but the fact that it failed)
  cache.set(cacheKey, undefined); // Use undefined to indicate that this call will always throw

  throw new EntityResolutionError(
    `Cannot find primary key type in entity '${entityName}'. Entity must have at least one property decorated with @PrimaryKey.`,
    {
      entityName,
      operation: 'extract-primary-key-type',
      targetType: 'primary-key'
    }
  );
}