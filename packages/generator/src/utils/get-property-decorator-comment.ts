import { PropertyDeclaration } from "ts-morph";

/**
 * Extract comment from decorator options
 */
export function getPropertyDecoratorComment(
  property: PropertyDeclaration
): string | null {
  const decorators = property.getDecorators();

  for (const decorator of decorators) {
    const args = decorator.getArguments();

    for (const arg of args) {
      // Check if it's an object literal containing a comment property
      if (arg.getKindName() === "ObjectLiteralExpression") {
        // Cast to ObjectLiteralExpression to access getProperties
        const objLiteral: any = arg;
        if (typeof objLiteral.getProperties === "function") {
          const properties = objLiteral.getProperties();

          for (const prop of properties) {
            // Check if it's a property assignment
            if (prop.getKindName() === "PropertyAssignment") {
              const propertyAssignment: any = prop;
              const propName = propertyAssignment.getName();
              if (propName === "comment") {
                const initializer = propertyAssignment.getInitializer();
                if (initializer) {
                  const initializerText = initializer.getText();
                  // Remove quotes from string literal
                  if (
                    initializerText.startsWith('"') &&
                    initializerText.endsWith('"')
                  ) {
                    return initializerText.substring(
                      1,
                      initializerText.length - 1
                    );
                  } else if (
                    initializerText.startsWith("'") &&
                    initializerText.endsWith("'")
                  ) {
                    return initializerText.substring(
                      1,
                      initializerText.length - 1
                    );
                  } else {
                    return initializerText;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return null;
}
