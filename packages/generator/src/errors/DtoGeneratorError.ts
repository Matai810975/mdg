/**
 * Context object for error information
 */
export interface ErrorContext {
  entityName?: string | null;
  propertyName?: string | null;
  operation?: string;
  filePath?: string | null;
  generatorType?: 'dto' | 'create-dto' | 'update-dto' | 'find-many-dto' | 'find-many-response-dto' | 'find-many-to-filter' | 'mapping' | 'create-dto-to-entity' | 'update-dto-to-entity' | string;
  sourceFile?: string | null;
  targetFile?: string | null;
  decoratorName?: string | null;
  targetType?: string | null;
  optionName?: string | null;
  expectedType?: string | null;
  receivedValue?: any;
  path?: string | null;
}

/**
 * Base error class for all DTO generator errors
 */
export class DtoGeneratorError extends Error {
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly stack: string | undefined;

  constructor(
    message: string,
    code: string,
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = 'DtoGeneratorError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    // this.stack = new Error().stack;

    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, DtoGeneratorError.prototype);
  }
}