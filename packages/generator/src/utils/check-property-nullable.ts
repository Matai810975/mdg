import { PropertyDeclaration } from "ts-morph";

/**
 * Check if a property type can be null based on TypeScript type annotation and decorator options
 */
export function checkPropertyNullable(property: PropertyDeclaration): boolean {
  // Check if the property has a question mark (optional)
  if (property.hasQuestionToken()) {
    return true;
  }

  // Get the type node to check the original type as written in source code
  const typeNode = property.getTypeNode();
  if (typeNode) {
    const typeText = typeNode.getText();

    // Check if the type includes null or undefined in its text representation
    if (typeText.includes("null") || typeText.includes("undefined")) {
      return true;
    }

    // If it's a union type, we need to check each part
    if (typeNode.getKindName() === "UnionType") {
      // Parse the union parts
      const unionParts = typeText.split("|").map((part) => part.trim());
      for (const part of unionParts) {
        if (part === "null" || part === "undefined") {
          return true;
        }
      }
    }

    // Also check for nested types like Ref<User | null>
    if (typeNode.getKindName() === "TypeReference") {
      if (typeText.includes("null") || typeText.includes("undefined")) {
        return true;
      }
    }
  }

  // Check decorator options for nullable: true as fallback
  const decorators = property.getDecorators();
  for (const decorator of decorators) {
    const args = decorator.getArguments();

    for (const arg of args) {
      // Check if it's an object literal containing a nullable property
      if (arg.getKindName() === "ObjectLiteralExpression") {
        const objLiteral: any = arg;
        if (typeof objLiteral.getProperties === "function") {
          const properties = objLiteral.getProperties();

          for (const prop of properties) {
            // Check if it's a property assignment
            if (prop.getKindName() === "PropertyAssignment") {
              const propertyAssignment: any = prop;
              const propName = propertyAssignment.getName();
              if (propName === "nullable") {
                const initializer = propertyAssignment.getInitializer();
                if (initializer) {
                  const initializerText = initializer.getText();
                  // Check if nullable is set to true
                  return initializerText === "true";
                }
              }
            }
          }
        }
      }
    }
  }

  return false;
}
