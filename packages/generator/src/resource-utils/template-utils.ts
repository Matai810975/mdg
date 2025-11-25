import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

/**
 * Template utilities for CRUD generation
 */
export class TemplateUtils {
  private static handlebars: typeof Handlebars = Handlebars;

  /**
   * Register helper functions for templates
   */
  static registerHelpers(): void {
    // Convert string to PascalCase
    this.handlebars.registerHelper('pascalCase', (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Convert string to camelCase
    this.handlebars.registerHelper('camelCase', (str: string) => {
      if (!str) return '';
      return str.charAt(0).toLowerCase() + str.slice(1);
    });

    // Convert string to kebab-case
    this.handlebars.registerHelper('kebabCase', (str: string) => {
      if (!str) return '';
      return str
        .replace(/([A-Z])/g, '-$1')
        .replace(/^-/, '')
        .toLowerCase();
    });

    // Convert entity name to plural form (simple implementation)
    this.handlebars.registerHelper('pluralize', (str: string) => {
      if (!str) return '';
      // Simple pluralization - just add 's' for now
      return str + (str.endsWith('s') ? '' : 's');
    });

    // Generate property definitions for the service
    this.handlebars.registerHelper('generateProperties', (properties: any[]) => {
      return properties.map(prop => ({
        name: prop.name,
        type: prop.type,
        isOptional: prop.isOptional || false
      }));
    });
  }

  /**
   * Compile a template from string
   */
  static compileTemplate(templateStr: string): Handlebars.TemplateDelegate {
    return this.handlebars.compile(templateStr);
  }

  /**
   * Compile a template from file
   */
  static compileTemplateFromFile(templatePath: string): Handlebars.TemplateDelegate {
    const templateStr = fs.readFileSync(templatePath, 'utf-8');
    return this.handlebars.compile(templateStr);
  }

  /**
   * Render a template with given context
   */
  static renderTemplate(template: Handlebars.TemplateDelegate, context: any): string {
    return template(context);
  }

  /**
   * Initialize template system with helpers
   */
  static initialize(): void {
    this.registerHelpers();
  }
}

// Initialize template system
TemplateUtils.initialize();