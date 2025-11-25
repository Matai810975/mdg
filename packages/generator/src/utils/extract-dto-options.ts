import { PropertyDeclaration } from "ts-morph";
import { DtoType } from "../to-copy/types/dto-type";
import { getStringCache, setStringCache } from "./cache-manager";

/**
 * 提取DtoOptions装饰器中针对特定操作的排除设置
 * @param property 实体属性
 * @param dtoType dto类型
 * @returns 是否应该排除该属性
 */
export function shouldExcludePropertyForOperation(
  property: PropertyDeclaration,
  dtoType: DtoType
): boolean {
  // Create cache key from property name and DTO type
  const propertyName = property.getName();
  const cacheKey = `shouldExcludePropertyForOperation:${propertyName}:${dtoType}`;

  // Check cache first
  const cachedResult = getStringCache(cacheKey);
  if (cachedResult !== undefined) {
    return cachedResult;
  }

  const decorators = property.getDecorators();

  // 检查是否有DtoOptions装饰器
  const dtoOptionsDecorator = decorators.find(
    (d: any) => d.getName() === "DtoOptions"
  );

  if (dtoOptionsDecorator) {
    const args = dtoOptionsDecorator.getArguments();
    if (args.length > 0) {
      const argText = args[0].getText();

      // 检查是否包含exclude选项
      if (argText.includes("exclude:")) {
        // 尝试解析exclude配置
        const excludeMatch = argText.match(
          /exclude:\s*(\[[^\]]*\]|true|false)/
        );
        if (excludeMatch) {
          const excludeValue = excludeMatch[1].trim();
          if (excludeValue === "true") {
            // Cache the result
            setStringCache(cacheKey, true);
            return true; // 明确指定排除
          } else if (excludeValue === "false") {
            // Cache the result
            setStringCache(cacheKey, false);
            return false; // 明确指定不排除
          } else if (
            excludeValue.startsWith("[") &&
            excludeValue.endsWith("]")
          ) {
            // 解析排除数组
            const excludedOperations = excludeValue
              .substring(1, excludeValue.length - 1)
              .split(",")
              .map((field) => field.trim().replace(/['"]/g, "").replace(/[\s\n\r]+/g, ''))
              .filter(field => field !== '');

            // 检查是否包含指定的操作，如果是，则排除
            const result = excludedOperations.includes(dtoType);

            // Cache the result
            setStringCache(cacheKey, result);
            return result;
          }
        }
      }
    }
  }

  // Cache the default result
  setStringCache(cacheKey, false);
  return false; // 默认不排除
}