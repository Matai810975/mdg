import { ClassDeclaration } from "ts-morph";

/**
 * Check if a class has the @Entity() decorator
 * @param classDeclaration The class to check
 * @returns true if the class has the @Entity() decorator, false otherwise
 */
export function isEntityClass(classDeclaration: ClassDeclaration): boolean {
  // Get all decorators applied to the class
  const decorators = classDeclaration.getDecorators();

  // Check if any decorator is @Entity
  for (const decorator of decorators) {
    const decoratorName = decorator.getName();
    if (decoratorName === "Entity") {
      return true;
    }
  }

  return false;
}