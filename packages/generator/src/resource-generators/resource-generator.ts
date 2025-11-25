import * as fs from 'fs';
import * as path from 'path';
import { EntityInfo } from '../resource-utils/entity-analyzer';
import { generateModule } from './module-generator';
import { generateService } from './service-generator';
import { generateController } from './controller-generator';
import { findAndLoadDtoConfig } from '../resource-utils/config-loader';

export interface ResourceOptions {
  generateModule: boolean;
  generateService: boolean;
  generateController: boolean;
  force: boolean;
}

export type OutputPaths = {
  controller: string;
  service: string;
  module: string;
};

/**
 * Generate Nestjs Resource for an entity
 */
export async function generateResource(entityInfo: EntityInfo, outputPaths: OutputPaths, options: ResourceOptions): Promise<void> {
  // Load DTO configuration to determine DTO import paths
  const dtoConfig = await findAndLoadDtoConfig();
  if (!dtoConfig) {
    console.log('⚠️  No DTO configuration found, using default DTO paths');
  }

  // Generate module if requested
  if (options.generateModule) {
    const modulePath = outputPaths.module;
    const moduleContent = generateModule(entityInfo, dtoConfig, path.dirname(modulePath));
    await writeGeneratedFile(modulePath, moduleContent, options.force);
    console.log(`📄 Generated module: ${modulePath}`);
  }

  // Generate service if requested
  if (options.generateService) {
    const servicePath = outputPaths.service;
    const serviceContent = generateService(entityInfo, dtoConfig, path.dirname(servicePath));
    await writeGeneratedFile(servicePath, serviceContent, options.force);
    console.log(`📄 Generated service: ${servicePath}`);
  }

  // Generate controller if requested
  if (options.generateController) {
    const controllerPath = outputPaths.controller;
    const controllerContent = generateController(entityInfo, dtoConfig, path.dirname(controllerPath));
    await writeGeneratedFile(controllerPath, controllerContent, options.force);
    console.log(`📄 Generated controller: ${controllerPath}`);
  }
}

/**
 * Write generated content to file
 */
async function writeGeneratedFile(filePath: string, content: string, force: boolean): Promise<void> {
  // Check if file exists and force is not enabled
  if (fs.existsSync(filePath) && !force) {
    console.log(`⚠️  File already exists (use --force to overwrite): ${filePath}`);
    return;
  }

  // Ensure the output directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created output directory: ${dir}`);
  }

  // Write file
  fs.writeFileSync(filePath, content, 'utf-8');
}