import { MikroNestForgeConfig } from "@mikro-nest-forge/mikro-nest-forge";

const config = new MikroNestForgeConfig({
  mappingGeneratorOptions: {
    entitiesGlob: "src/entities/**/*.ts",
    outputDir: "src/generated/mikro-nest-forge",
    generators: [
      "dto",
      "create-dto",
      "update-dto",
      "find-many-dto",
      "find-many-response-dto",
      "find-many-to-filter",
      "entity-to-dto",
      "create-dto-to-entity",
      "update-dto-to-entity"
    ],
    performance: {
      enabled: true,
      workerCount: 4
    }
  },
  scaffoldGeneratorOptions: {
    basePath: "src",
    templates: {
      entity: "entities/{dir}/{entity}.ts",
      controller: "user/{dir}/{entity}/{entity}.controller.ts",
      service: "user/{dir}/{entity}/{entity}.service.ts",
      module: "user/{dir}/{entity}/{entity}.module.ts"
    }
  }
});

export default config;
