// New configuration structure (v2.0+)
export {
  MikroNestForgeConfig,
  MappingGeneratorOptions,
  ScaffoldGeneratorOptions,
  PerformanceConfig,
  ScaffoldTemplatesConfig,
  GeneratorType,
  legacyToNewConfig,
  newToLegacyConfig,
} from "./types/config.types";

// Legacy configuration (deprecated, will be removed in v3.0.0)
export {
  /** @deprecated Use MikroNestForgeConfig instead */
  DtoGeneratorConfig,
  /** @deprecated Use ScaffoldGeneratorOptions instead */
  ResourceGeneratorConfig,
} from "./types/config.types";
