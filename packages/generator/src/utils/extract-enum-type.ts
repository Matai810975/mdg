import { PropertyDeclaration } from "ts-morph";
import { getStringCache, setStringCache } from "./cache-manager";

/**
 * Extracts enum type from @Enum decorator regardless of its format
 * Supports both:
 * - @Enum(() => MyEnum)
 * - @Enum({ items: () => MyEnum, comment: "..." })
 * - @Enum({ items: MyEnum, comment: "..." })
 * - @Enum(MyEnum)
 * @param property The property declaration containing the @Enum decorator
 * @returns The extracted enum type name or null if not found
 */
export function extractEnumTypeFromDecorator(property: PropertyDeclaration): string | null {
  // Create cache key using property name
  const propertyName = property.getName();
  const cacheKey = `extractEnumTypeFromDecorator:${propertyName}`;

  // Check cache first
  const cachedResult = getStringCache(cacheKey);
  if (cachedResult !== undefined) {
    return cachedResult;
  }

  const enumDecorator = property.getDecorators().find((d) => d.getName() === "Enum");

  if (!enumDecorator) {
    // Cache the result
    setStringCache(cacheKey, null);
    return null;
  }

  const args = enumDecorator.getArguments();
  if (args.length === 0) {
    // Cache the result
    setStringCache(cacheKey, null);
    return null;
  }

  const firstArg = args[0];
  const argText = firstArg.getText();

  // Case 1: @Enum(() => MyEnum) - Arrow function format
  if (argText.startsWith("() => ")) {
    const result = argText.replace("() => ", "").trim();
    // Cache the result
    setStringCache(cacheKey, result);
    return result;
  }

  // Case 2: @Enum(MyEnum) - Direct reference
  if (!argText.includes("{") && !argText.includes("=>")) {
    const result = argText.trim();
    // Cache the result
    setStringCache(cacheKey, result);
    return result;
  }

  // Case 3: @Enum({ items: () => MyEnum, comment: "..." }) - Object format with arrow function
  if (argText.startsWith("{") && argText.includes("items:")) {
    // Extract the items value using regex
    const itemsMatch = argText.match(/items:\s*\(\)\s*=>\s*([A-Za-z_$][A-Za-z0-9_$]*)/);
    if (itemsMatch) {
      const result = itemsMatch[1];
      // Cache the result
      setStringCache(cacheKey, result);
      return result;
    }

    // Also try to match direct reference format: items: MyEnum
    const directItemsMatch = argText.match(/items:\s*([A-Za-z_$][A-Za-z0-9_$]*)/);
    if (directItemsMatch) {
      const result = directItemsMatch[1];
      // Cache the result
      setStringCache(cacheKey, result);
      return result;
    }
  }

  // Cache the result
  setStringCache(cacheKey, null);
  return null;
}