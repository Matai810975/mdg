import { DtoGeneratorError, ErrorContext } from './DtoGeneratorError';

/**
 * Error during code generation operations
 */
export class GenerationError extends DtoGeneratorError {
  constructor(
    message: string,
    context: ErrorContext = {}
  ) {
    super(message, 'GENERATION_ERROR', context);
    this.name = 'GenerationError';

    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, GenerationError.prototype);
  }
}