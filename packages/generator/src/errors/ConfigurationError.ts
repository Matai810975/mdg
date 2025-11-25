import { DtoGeneratorError, ErrorContext } from './DtoGeneratorError';

/**
 * Error for invalid configuration or CLI options
 */
export class ConfigurationError extends DtoGeneratorError {
  constructor(
    message: string,
    context: ErrorContext = {}
  ) {
    super(message, 'CONFIGURATION_ERROR', context);
    this.name = 'ConfigurationError';

    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}