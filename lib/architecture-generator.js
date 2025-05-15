// lib/architecture-generator.js
import fs from "fs/promises";
import path from "path";
import { getAllFiles } from "./utils.js";

/**
 * Generate architecture diagrams
 * @param {string} rootDir - Root directory to process
 * @param {Object} config - Configuration object
 * @returns {string} Markdown content with architecture diagrams
 */
export async function generateArchitecture(rootDir, config) {
  // Get module information files
  const allFiles = await getAllFiles(rootDir, config);
  const moduleInfoFiles = allFiles.filter(
    (file) => path.basename(file.relativePath) === "MODULE_INFORMATION.md"
  );

  // Get package.json files for module relationships
  const packageFiles = allFiles.filter(
    (file) => path.basename(file.relativePath) === "package.json"
  );

  // Parse package.json files
  const packages = [];
  for (const file of packageFiles) {
    try {
      const content = await fs.readFile(file.path, "utf8");
      const pkg = JSON.parse(content);
      packages.push({
        path: file.relativePath,
        name: pkg.name || path.dirname(file.relativePath),
        dependencies: pkg.dependencies || {},
      });
    } catch (error) {
      console.error(`Error parsing ${file.path}: ${error.message}`);
    }
  }

  // Generate markdown content
  let markdown = "# Project Architecture\n\n";
  markdown +=
    "This document provides an overview of the project architecture.\n\n";

  // Add high-level architecture diagram
  markdown += "## High-Level Architecture\n\n";
  markdown += generateHighLevelDiagram(packages, rootDir);

  // Add module information if available
  if (moduleInfoFiles.length > 0) {
    markdown += "## Module Documentation\n\n";

    for (const file of moduleInfoFiles) {
      try {
        const content = await fs.readFile(file.path, "utf8");
        const moduleName = path.dirname(file.relativePath);

        markdown += `### ${moduleName}\n\n`;
        markdown += content.trim() + "\n\n";
      } catch (error) {
        console.error(`Error reading ${file.path}: ${error.message}`);
      }
    }
  }

  // Add component relationships diagram
  if (packages.length > 0) {
    markdown += "## Component Relationships\n\n";
    markdown += generateComponentDiagram(packages);
  }

  return markdown;
}

/**
 * Generate a high-level architecture diagram
 * @param {Array} packages - Array of package objects
 * @param {string} rootDir - Root directory
 * @returns {string} Mermaid diagram in markdown
 */
function generateHighLevelDiagram(packages, rootDir) {
  // Identify top-level directories
  const rootName = path.basename(rootDir);
  const topLevelDirs = new Set();

  for (const pkg of packages) {
    const parts = pkg.path.split("/");
    if (parts.length > 1) {
      topLevelDirs.add(parts[0]);
    }
  }

  // Create a high-level diagram
  let mermaid = "```mermaid\nflowchart TB\n";

  // Root node
  mermaid += `  root["${rootName}"]\n`;

  // Top-level directories
  for (const dir of topLevelDirs) {
    if (["node_modules", ".git"].includes(dir)) continue;

    const cleanDir = dir.replace(/[^a-zA-Z0-9]/g, "_");
    mermaid += `  ${cleanDir}["${dir}"]\n`;
    mermaid += `  root --> ${cleanDir}\n`;

    // Look for subdirectories in package paths
    const subDirs = new Set();
    for (const pkg of packages) {
      const parts = pkg.path.split("/");
      if (parts[0] === dir && parts.length > 2) {
        subDirs.add(parts[1]);
      }
    }

    // Add subdirectories
    for (const subDir of subDirs) {
      if (["node_modules", ".git"].includes(subDir)) continue;

      const cleanSubDir = `${cleanDir}_${subDir.replace(/[^a-zA-Z0-9]/g, "_")}`;
      mermaid += `  ${cleanSubDir}["${subDir}"]\n`;
      mermaid += `  ${cleanDir} --> ${cleanSubDir}\n`;
    }
  }

  mermaid += "```\n\n";
  return mermaid;
}

/**
 * Generate a component relationship diagram
 * @param {Array} packages - Array of package objects
 * @returns {string} Mermaid diagram in markdown
 */
function generateComponentDiagram(packages) {
  // Filter to only named packages
  const namedPackages = packages.filter((pkg) => pkg.name && pkg.name !== ".");

  if (namedPackages.length === 0) {
    return "> No named packages found to generate a component diagram.\n\n";
  }

  let mermaid = "```mermaid\nflowchart LR\n";

  // Create nodes for each package
  for (const pkg of namedPackages) {
    const cleanName = pkg.name.replace(/[^a-zA-Z0-9]/g, "_");
    mermaid += `  ${cleanName}["${pkg.name}"]\n`;
  }

  mermaid += "\n";

  // Add dependencies
  for (const pkg of namedPackages) {
    const cleanName = pkg.name.replace(/[^a-zA-Z0-9]/g, "_");

    for (const dep of Object.keys(pkg.dependencies)) {
      // Check if it's an internal dependency
      const depPkg = namedPackages.find((p) => p.name === dep);
      if (depPkg) {
        const cleanDepName = dep.replace(/[^a-zA-Z0-9]/g, "_");
        mermaid += `  ${cleanName} --> ${cleanDepName}\n`;
      }
    }
  }

  mermaid += "```\n\n";
  return mermaid;
}
