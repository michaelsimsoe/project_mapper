// lib/config-extractor.js
import fs from "fs/promises";
import path from "path";
import { getAllFiles } from "./utils.js";

/**
 * Extract config files content from project
 * @param {string} rootDir - Root directory to process
 * @param {Object} config - Configuration object
 * @returns {string} Markdown content with config files
 */
export async function extractConfigFiles(rootDir, config) {
  // Get the list of file types to include
  const includeFiles = config.output.configFiles.includeFiles || {};
  const filePatterns = getFilePatterns(includeFiles);

  if (filePatterns.length === 0) {
    return "# Config Files\n\nNo config files were selected for extraction.";
  }

  // Get all files in the project
  const allFiles = await getAllFiles(rootDir, config);

  // Filter files by patterns
  const matchingFiles = allFiles.filter((file) => {
    const filename = path.basename(file.relativePath).toLowerCase();

    for (const pattern of filePatterns) {
      if (pattern.test(filename)) {
        return true;
      }
    }

    return false;
  });

  // Sort files by category and path
  matchingFiles.sort((a, b) => {
    const aCategory = getFileCategory(
      path.basename(a.relativePath).toLowerCase(),
      includeFiles
    );
    const bCategory = getFileCategory(
      path.basename(b.relativePath).toLowerCase(),
      includeFiles
    );

    if (aCategory !== bCategory) {
      return aCategory.localeCompare(bCategory);
    }

    return a.relativePath.localeCompare(b.relativePath);
  });

  // Group files by category
  const filesByCategory = {};

  for (const file of matchingFiles) {
    const filename = path.basename(file.relativePath).toLowerCase();
    const category = getFileCategory(filename, includeFiles);

    if (!filesByCategory[category]) {
      filesByCategory[category] = [];
    }

    filesByCategory[category].push(file);
  }

  // Generate markdown content
  let markdown = "# Config Files\n\n";
  markdown +=
    "This file contains the content of key configuration files in the project.\n\n";

  // Add table of contents
  markdown += "## Table of Contents\n\n";

  for (const category of Object.keys(filesByCategory).sort()) {
    markdown += `- [${formatCategoryName(category)}](#${category
      .toLowerCase()
      .replace(/\./g, "")})\n`;
  }

  // Add file contents by category
  for (const category of Object.keys(filesByCategory).sort()) {
    markdown += `\n## ${formatCategoryName(category)}\n\n`;

    for (const file of filesByCategory[category]) {
      try {
        const content = await fs.readFile(file.path, "utf8");
        const extension = path.extname(file.relativePath).substring(1);

        markdown += `### ${file.relativePath}\n\n`;
        markdown += "```" + extension + "\n";
        markdown += content.trim();
        markdown += "\n```\n\n";
      } catch (error) {
        markdown += `### ${file.relativePath}\n\n`;
        markdown += `> Error reading file: ${error.message}\n\n`;
      }
    }
  }

  return markdown;
}

/**
 * Get file patterns based on config
 * @param {Object} includeFiles - Configuration for file types to include
 * @returns {Array} Array of RegExp objects
 */
function getFilePatterns(includeFiles) {
  const patterns = [];

  if (includeFiles["package.json"] === true) {
    patterns.push(/^package\.json$/i);
  }

  if (includeFiles["dockerfile"] === true) {
    patterns.push(/^dockerfile$/i);
    patterns.push(/^dockerfile\..+$/i);
  }

  if (includeFiles["docker-compose"] === true) {
    patterns.push(/^docker-compose\.ya?ml$/i);
    patterns.push(/^docker-compose\..+\.ya?ml$/i);
  }

  if (includeFiles["tsconfig.json"] === true) {
    patterns.push(/^tsconfig\.json$/i);
    patterns.push(/^tsconfig\..+\.json$/i);
  }

  if (includeFiles["eslint"] === true) {
    patterns.push(/^\.eslintrc$/i);
    patterns.push(/^\.eslintrc\.(json|js|yaml|yml)$/i);
    patterns.push(/^eslint\.config\.(js|mjs|cjs)$/i);
  }

  if (includeFiles["env.example"] === true) {
    patterns.push(/^\.env\.example$/i);
    patterns.push(/^\.env\..+\.example$/i);
  }

  if (includeFiles["jest.config"] === true) {
    patterns.push(/^jest\.config\.(js|ts|json)$/i);
  }

  if (includeFiles["vite.config"] === true) {
    patterns.push(/^vite\.config\.(js|ts)$/i);
  }

  if (includeFiles["webpack.config"] === true) {
    patterns.push(/^webpack\.config\.(js|ts)$/i);
    patterns.push(/^webpack\..+\.config\.(js|ts)$/i);
  }

  if (includeFiles["biome.json"] === true) {
    patterns.push(/^biome\.json$/i);
  }

  return patterns;
}

/**
 * Get the category for a file
 * @param {string} filename - Name of the file
 * @param {Object} includeFiles - Configuration for file types to include
 * @returns {string} Category name
 */
function getFileCategory(filename, includeFiles) {
  if (/^package\.json$/i.test(filename)) {
    return "package.json";
  }

  if (/^dockerfile$/i.test(filename) || /^dockerfile\..+$/i.test(filename)) {
    return "Dockerfile";
  }

  if (
    /^docker-compose\.ya?ml$/i.test(filename) ||
    /^docker-compose\..+\.ya?ml$/i.test(filename)
  ) {
    return "Docker Compose";
  }

  if (
    /^tsconfig\.json$/i.test(filename) ||
    /^tsconfig\..+\.json$/i.test(filename)
  ) {
    return "TypeScript Config";
  }

  if (
    /^\.eslintrc$/i.test(filename) ||
    /^\.eslintrc\.(json|js|yaml|yml)$/i.test(filename) ||
    /^eslint\.config\.(js|mjs|cjs)$/i.test(filename)
  ) {
    return "ESLint Config";
  }

  if (
    /^\.env\.example$/i.test(filename) ||
    /^\.env\..+\.example$/i.test(filename)
  ) {
    return "Environment Variables";
  }

  if (/^jest\.config\.(js|ts|json)$/i.test(filename)) {
    return "Jest Config";
  }

  if (/^vite\.config\.(js|ts)$/i.test(filename)) {
    return "Vite Config";
  }

  if (
    /^webpack\.config\.(js|ts)$/i.test(filename) ||
    /^webpack\..+\.config\.(js|ts)$/i.test(filename)
  ) {
    return "Webpack Config";
  }

  if (/^biome\.json$/i.test(filename)) {
    return "Biome Config";
  }

  return "Other Config";
}

/**
 * Format category name for display
 * @param {string} category - Category name
 * @returns {string} Formatted category name
 */
function formatCategoryName(category) {
  // Special case for package.json
  if (category === "package.json") {
    return "Package.json Files";
  }

  return `${category} Files`;
}
