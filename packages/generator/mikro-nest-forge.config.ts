import { DtoGeneratorConfig } from './src/types/config.types';

const config = new DtoGeneratorConfig({
  // Input pattern for your MikroORM entity files
  input: 'src/entities/*.ts',

  // Output directory for generated DTOs
  output: 'src/test/output',

  // Array of generator types to run
  generators: [
    'dto',                    // Basic data transfer objects
    'create-dto',            // DTOs for create operations
    'update-dto',            // DTOs for update operations
    'find-many-dto',         // DTOs for find-many operations
    'find-many-response-dto', // FindMany response DTOs
    'find-many-to-filter',    // FindMany to filter mapping
    'entity-to-dto',               // Entity-to-DTO mapping functions
    'create-dto-to-entity',  // Create DTO to entity mapping
    'update-dto-to-entity'   // Update DTO to entity mapping
  ],

  // Enable parallel processing for faster generation
  parallel: false,

  // Set the number of concurrent workers for parallel processing
  concurrency: 4
});

export default config;