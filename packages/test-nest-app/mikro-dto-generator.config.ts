import { DtoGeneratorConfig } from "@mdg/mikro-dto-generator";

const config = new DtoGeneratorConfig({
  input: "src/entities/**/*.ts",
  output: "src/generated/mdg",
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
  parallel: true,
  concurrency: 4,
  resources: {
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

