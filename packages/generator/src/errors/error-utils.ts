import { DtoGeneratorError, ErrorContext } from './DtoGeneratorError';

/**
 * Formats error messages with consistent structure and context
 * @param error The error to format
 * @param context Additional context information
 * @returns Formatted error message
 */
export function formatError(error: Error, context: ErrorContext = {}): string {
  let message = error.message;

  // If it's our custom error, include the code
  if (error instanceof DtoGeneratorError) {
    message = `[${error.code}] ${message}`;
  }

  // Add context information if available
  const contextParts: string[] = [];

  if (context.entityName) {
    contextParts.push(`Entity: ${context.entityName}`);
  }

  if (context.propertyName) {
    contextParts.push(`Property: ${context.propertyName}`);
  }

  if (context.operation) {
    contextParts.push(`Operation: ${context.operation}`);
  }

  if (context.filePath) {
    contextParts.push(`File: ${context.filePath}`);
  }

  if (context.targetType) {
    contextParts.push(`Target Type: ${context.targetType}`);
  }

  if (contextParts.length > 0) {
    message += ` (${contextParts.join(', ')})`;
  }

  return message;
}

/**
 * Centralized error logging with different log levels
 * @param error The error to log
 * @param context Additional context information
 * @param level Log level (default: 'error')
 */
export function logError(error: Error, context: ErrorContext = {}, level: 'error' | 'warn' | 'info' = 'error'): void {
  const formattedMessage = formatError(error, context);

  switch (level) {
    case 'error':
      console.error(`[ERROR] ${formattedMessage}`);
      if (error.stack) {
        console.error(error.stack);
      }
      break;
    case 'warn':
      console.warn(`[WARN] ${formattedMessage}`);
      break;
    case 'info':
      console.info(`[INFO] ${formattedMessage}`);
      break;
  }
}

/**
 * Higher-order function for wrapping operations with error handling
 * @param fn The function to wrap
 * @param context Context information for error reporting
 * @param fallback Optional fallback value or function
 * @returns Wrapped function with error handling
 */
export function withErrorHandling<T>(
  fn: () => T,
  context: ErrorContext = {},
  fallback?: T | (() => T)
): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof DtoGeneratorError) {
      logError(error, context);
      // Check if there's a fallback value
      if (fallback !== undefined) {
        return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
      }
      throw error;
    } else if (error instanceof Error) {
      const wrappedError = new DtoGeneratorError(
        error.message,
        'UNEXPECTED_ERROR',
        context
      );
      logError(wrappedError, context);
      // Check if there's a fallback value
      if (fallback !== undefined) {
        return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
      }
      throw wrappedError;
    } else {
      const wrappedError = new DtoGeneratorError(
        String(error),
        'UNEXPECTED_ERROR',
        context
      );
      logError(wrappedError, context);
      // Check if there's a fallback value
      if (fallback !== undefined) {
        return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
      }
      throw wrappedError;
    }
  }
}

/**
 * Graceful error handling that allows processing to continue after an error
 * @param fn The function to execute
 * @param context Context information for error reporting
 * @param fallback Optional fallback value or function
 * @param logError Flag to control whether to log the error (default: true)
 * @returns Object with success flag and either result or error
 */
export function gracefulErrorHandling<T>(
  fn: () => T,
  context: ErrorContext = {},
  fallback?: T | (() => T),
  logErrorFlag: boolean = true
): { success: boolean; result?: T; error?: Error } {
  try {
    const result = fn();
    return { success: true, result };
  } catch (error) {
    if (logErrorFlag) {
      const dtoError = error instanceof DtoGeneratorError
        ? error
        : new DtoGeneratorError(
            error instanceof Error ? error.message : String(error),
            'UNEXPECTED_ERROR',
            context
          );
      logError(dtoError, context);
    }

    // Return fallback if available
    if (fallback !== undefined) {
      const fallbackResult = typeof fallback === 'function' ? (fallback as () => T)() : fallback;
      return { success: true, result: fallbackResult };
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Maps ts-morph library errors to custom error types
 * @param error The ts-morph error
 * @param context Additional context information
 * @returns Custom error with appropriate type and context
 */
export function mapTsMorphError(error: any, context: ErrorContext = {}): DtoGeneratorError {
  if (error instanceof Error) {
    return new DtoGeneratorError(
      `ts-morph error: ${error.message}`,
      'TS_MORPH_ERROR',
      context
    );
  } else {
    return new DtoGeneratorError(
      `ts-morph error: ${String(error)}`,
      'TS_MORPH_ERROR',
      context
    );
  }
}

/**
 * Creates a detailed error context from entity class and property
 * @param entityClass The entity class (can be null)
 * @param property The property (can be null)
 * @param operation The operation being performed
 * @param generatorType The type of generator
 * @returns Error context object
 */
export function createErrorContext(
  entityClass: any,
  property: any,
  operation: string,
  generatorType?: ErrorContext['generatorType']
): ErrorContext {
  const context: ErrorContext = {
    operation,
    generatorType
  };

  if (entityClass && typeof entityClass.getName === 'function') {
    context.entityName = entityClass.getName() || 'UnknownEntity';
  }

  if (property && typeof property.getName === 'function') {
    context.propertyName = property.getName() || 'UnknownProperty';
  }

  return context;
}