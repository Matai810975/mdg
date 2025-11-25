import { DtoGeneratorError, ErrorContext } from './DtoGeneratorError';

/**
 * Error for file system operations
 */
export class FileSystemError extends DtoGeneratorError {
  constructor(
    message: string,
    context: ErrorContext = {}
  ) {
    super(message, 'FILE_SYSTEM_ERROR', context);
    this.name = 'FileSystemError';

    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, FileSystemError.prototype);
  }
}