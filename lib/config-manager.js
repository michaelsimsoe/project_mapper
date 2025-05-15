// lib/config-manager.js
import fs from "fs/promises";
import path from "path";

/**
 * Default configuration for project-mapper
 */
export const defaultConfig = {
  projectInfo: {
    title: "Project Structure",
    version: "v1.0",
    description: "This document outlines the project structure.",
  },
  output: {
    markdownTree: {
      enabled: true,
      filename: "PROJECT-STRUCTURE.md",
      includePrinciples: true,
      includeChangelog: true,
    },
    configFiles: {
      enabled: true,
      filename: "CONFIG-FILES.md",
      includeFiles: {
        "package.json": true,
        dockerfile: true,
        "docker-compose": true,
        "tsconfig.json": true,
        eslint: true,
        "env.example": true,
        "jest.config": true,
        "vite.config": true,
        "webpack.config": true,
        "biome.json": true,
      },
    },
    dependencyGraph: {
      enabled: false,
      filename: "DEPENDENCIES.md",
      includeExternal: true,
      includeInternal: true,
    },
    envVarsDocs: {
      enabled: false,
      filename: "ENV-VARIABLES.md",
      patterns: [".env.example", ".env.*.example"],
    },
    architecture: {
      enabled: false,
      filename: "ARCHITECTURE.md",
      diagramType: "mermaid",
    },
    metadataJson: {
      enabled: false,
      filename: "project-metadata.json",
    },
  },
  ignore: {
    directories: [
      "node_modules",
      ".git",
      "dist",
      "build",
      "coverage",
      ".next",
      ".cache",
    ],
    files: [".DS_Store", "Thumbs.db", "*.log"],
    patterns: [],
  },
  maxDepth: 8,
  includeDescriptions: true,
  directoryDescriptions: {},
  filePatternDescriptions: {},
  principles: [],
  changelog: [],
};

/**
 * Create a default configuration file
 * @param {string} configPath - Path to save the config file
 */
export async function createDefaultConfig(configPath) {
  const config = JSON.stringify(defaultConfig, null, 2);
  await fs.writeFile(configPath, config, "utf8");
  return configPath;
}

/**
 * Load configuration from file
 * @param {string} configPath - Path to the config file
 * @returns {Object} Loaded configuration
 */
export async function loadConfig(configPath) {
  const configData = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(configData);

  // Merge with default config to ensure all properties exist
  return {
    ...defaultConfig,
    ...config,
    output: {
      ...defaultConfig.output,
      ...config.output,
      markdownTree: {
        ...defaultConfig.output.markdownTree,
        ...config.output?.markdownTree,
      },
      configFiles: {
        ...defaultConfig.output.configFiles,
        ...config.output?.configFiles,
        includeFiles: {
          ...defaultConfig.output.configFiles.includeFiles,
          ...config.output?.configFiles?.includeFiles,
        },
      },
    },
    ignore: {
      ...defaultConfig.ignore,
      ...config.ignore,
    },
  };
}
