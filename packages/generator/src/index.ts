// Configuration structure (v3.0+)
export {
  MikroNestForgeConfig,
  MappingGeneratorOptions,
  ScaffoldGeneratorOptions,
  PerformanceConfig,
  ScaffoldTemplatesConfig,
  GeneratorType,
} from "./types/config.types";

// Configuration validation
export {
  validateNewConfig,
} from "./shared-config/config-validator";
