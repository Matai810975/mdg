import { DtoGeneratorError, ErrorContext } from './DtoGeneratorError';

/**
 * Error when entity types or properties cannot be resolved
 */
export class EntityResolutionError extends DtoGeneratorError {
  constructor(
    message: string,
    context: ErrorContext = {}
  ) {
    super(message, 'ENTITY_RESOLUTION_ERROR', context);
    this.name = 'EntityResolutionError';

    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, EntityResolutionError.prototype);
  }
}