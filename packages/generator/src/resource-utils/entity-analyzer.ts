import { Project, SyntaxKind, PropertyDeclaration, ClassDeclaration } from 'ts-morph';
import * as path from 'path';
import { extractEntityNameFromPath } from '../utils/extract-entity-name';

export interface EntityProperty {
  name: string;
  type: string;
  isOptional: boolean;
  decorators: string[];
  isPrimaryKey: boolean;
  isRelation: boolean;
}

export interface EntityInfo {
  name: string;
  fileName: string;
  filePath: string;  // Full path to the entity file
  properties: EntityProperty[];
  primaryKey: string;
  imports: string[];
  relations: {
    name: string;
    type: string;
    relationType: string; // OneToOne, OneToMany, ManyToOne, ManyToMany
  }[];
}

/**
 * Analyze entity file to extract information
 */
export async function analyzeEntity(entityPath: string): Promise<EntityInfo> {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(entityPath);

  // Get the first class declaration (should be the entity)
  const classDeclaration = sourceFile.getClasses()[0];
  if (!classDeclaration) {
    throw new Error(`No class found in entity file: ${entityPath}`);
  }

  const cleanEntityName = extractEntityNameFromPath(entityPath);
  const entityName = classDeclaration.getName() || cleanEntityName;
  const fileName = cleanEntityName;

  const properties: EntityProperty[] = [];
  let primaryKey = '';
  const relations: EntityInfo['relations'] = [];

  // Get all property declarations
  const propertyDeclarations = classDeclaration.getProperties();

  for (const prop of propertyDeclarations) {
    const propName = prop.getName();
    const propType = prop.getType().getText();
    const isOptional = prop.hasQuestionToken() || prop.getInitializer()?.getText() !== undefined;
    const decorators = prop.getDecorators().map(dec => dec.getName());
    const isPrimaryKey = decorators.includes('PrimaryKey');

    // Check for relation decorators
    const relationTypes = ['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany'];
    const isRelation = decorators.some(name => relationTypes.includes(name));

    if (isRelation) {
      // Extract relation type and target entity
      const relationDecoratorName = decorators.find(name => relationTypes.includes(name));
      if (relationDecoratorName) {
        // Extract the target entity from decorator arguments
        const decorator = prop.getDecorator(relationDecoratorName);
        if (decorator) {
          const args = decorator.getArguments();
          if (args.length > 0) {
            const argText = args[0].getText();
            const targetEntity = extractEntityFromDecorator(argText);
            relations.push({
              name: propName,
              type: targetEntity,
              relationType: relationDecoratorName
            });
          }
        }
      }
    }

    properties.push({
      name: propName,
      type: propType,
      isOptional,
      decorators,
      isPrimaryKey,
      isRelation
    });

    if (isPrimaryKey) {
      primaryKey = propName;
    }
  }

  // If no primary key found, default to 'id'
  if (!primaryKey) {
    primaryKey = 'id';
  }

  // Get imports from the file
  const imports = sourceFile.getImportDeclarations().map(imp => imp.getText());

  return {
    name: entityName,
    fileName,
    filePath: entityPath,
    properties,
    primaryKey,
    imports,
    relations
  };
}

/**
 * Extract entity name from decorator argument
 */
function extractEntityFromDecorator(decoratorArg: string): string {
  // Handle cases like '() => User', 'User', or '() => { return User; }'
  if (decoratorArg.includes('() =>')) {
    // Extract from arrow function
    const match = decoratorArg.match(/\(\s*\)\s*=>\s*([A-Za-z_][A-Za-z0-9_]*)/);
    if (match) {
      return match[1];
    }
  } else if (decoratorArg.includes('{')) {
    // Handle more complex function expressions
    const match = decoratorArg.match(/return\s+([A-Za-z_][A-Za-z0-9_]*)\s*;/);
    if (match) {
      return match[1];
    }
  }

  // Direct reference
  return decoratorArg.replace(/['"`]/g, '').trim();
}