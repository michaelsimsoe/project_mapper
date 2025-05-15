// lib/dependency-analyzer.js
import fs from "fs/promises";
import path from "path";
import { getAllFiles } from "./utils.js";

/**
 * Analyze project dependencies
 * @param {string} rootDir - Root directory to process
 * @param {Object} config - Configuration object
 * @returns {string} Markdown content with dependency analysis
 */
export async function analyzeDependencies(rootDir, config) {
  // Get all package.json files
  const allFiles = await getAllFiles(rootDir, config);
  const packageFiles = allFiles.filter(
    (file) => path.basename(file.relativePath) === "package.json"
  );

  if (packageFiles.length === 0) {
    return "# Dependency Analysis\n\nNo package.json files found in the project.";
  }

  // Parse package.json files
  const packages = [];
  for (const file of packageFiles) {
    try {
      const content = await fs.readFile(file.path, "utf8");
      const pkg = JSON.parse(content);
      packages.push({
        path: file.relativePath,
        name: pkg.name || path.dirname(file.relativePath),
        version: pkg.version,
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
        peerDependencies: pkg.peerDependencies || {},
        workspaces: pkg.workspaces || [],
      });
    } catch (error) {
      console.error(`Error parsing ${file.path}: ${error.message}`);
    }
  }

  // Generate markdown content
  let markdown = "# Dependency Analysis\n\n";

  // Add packages summary
  markdown += `## Project Packages\n\n`;
  markdown += `Total packages found: ${packages.length}\n\n`;

  if (packages.length > 0) {
    markdown += "| Package | Version | Dependencies | Dev Dependencies |\n";
    markdown += "|---------|---------|--------------|------------------|\n";

    for (const pkg of packages) {
      const depCount = Object.keys(pkg.dependencies).length;
      const devDepCount = Object.keys(pkg.devDependencies).length;
      markdown += `| \`${pkg.name}\` | ${
        pkg.version || "—"
      } | ${depCount} | ${devDepCount} |\n`;
    }

    markdown += "\n";
  }

  // Add dependency graph as mermaid diagram
  markdown += `## Dependency Graph\n\n`;
  markdown += generateDependencyDiagram(packages, config);

  // Add detailed package dependencies
  markdown += `## Detailed Dependencies\n\n`;

  for (const pkg of packages) {
    markdown += `### ${pkg.name}\n\n`;
    markdown += `**Path:** \`${pkg.path}\`\n\n`;

    if (pkg.workspaces && pkg.workspaces.length > 0) {
      markdown += `**Workspaces:**\n\n`;
      for (const workspace of pkg.workspaces) {
        markdown += `- \`${workspace}\`\n`;
      }
      markdown += "\n";
    }

    // Dependencies
    if (Object.keys(pkg.dependencies).length > 0) {
      markdown += `**Dependencies:**\n\n`;
      markdown += "| Package | Version |\n";
      markdown += "|---------|----------|\n";

      const sortedDeps = Object.entries(pkg.dependencies).sort(([a], [b]) =>
        a.localeCompare(b)
      );
      for (const [dep, version] of sortedDeps) {
        markdown += `| \`${dep}\` | \`${version}\` |\n`;
      }

      markdown += "\n";
    } else {
      markdown += "**Dependencies:** None\n\n";
    }

    // DevDependencies
    if (Object.keys(pkg.devDependencies).length > 0) {
      markdown += `**Dev Dependencies:**\n\n`;
      markdown += "| Package | Version |\n";
      markdown += "|---------|----------|\n";

      const sortedDevDeps = Object.entries(pkg.devDependencies).sort(
        ([a], [b]) => a.localeCompare(b)
      );
      for (const [dep, version] of sortedDevDeps) {
        markdown += `| \`${dep}\` | \`${version}\` |\n`;
      }

      markdown += "\n";
    } else {
      markdown += "**Dev Dependencies:** None\n\n";
    }

    // PeerDependencies
    if (Object.keys(pkg.peerDependencies).length > 0) {
      markdown += `**Peer Dependencies:**\n\n`;
      markdown += "| Package | Version |\n";
      markdown += "|---------|----------|\n";

      const sortedPeerDeps = Object.entries(pkg.peerDependencies).sort(
        ([a], [b]) => a.localeCompare(b)
      );
      for (const [dep, version] of sortedPeerDeps) {
        markdown += `| \`${dep}\` | \`${version}\` |\n`;
      }

      markdown += "\n";
    }
  }

  // Add dependency version analysis
  markdown += `## Dependency Version Analysis\n\n`;
  markdown += generateVersionAnalysis(packages);

  return markdown;
}

/**
 * Generate a mermaid dependency diagram
 * @param {Array} packages - Array of package objects
 * @param {Object} config - Configuration object
 * @returns {string} Mermaid diagram in markdown
 */
function generateDependencyDiagram(packages, config) {
  const includeExternal = config.output.dependencyGraph.includeExternal;
  const includeInternal = config.output.dependencyGraph.includeInternal;

  let mermaid = "```mermaid\ngraph TD\n";

  // Create nodes for each package
  for (const pkg of packages) {
    const name = pkg.name.replace(/[^a-zA-Z0-9]/g, "_");
    mermaid += `  ${name}["${pkg.name}"]\n`;
  }

  mermaid += "\n";

  // Add links between packages
  for (const pkg of packages) {
    const pkgName = pkg.name.replace(/[^a-zA-Z0-9]/g, "_");

    // Internal dependencies (workspace packages)
    if (includeInternal) {
      for (const otherPkg of packages) {
        if (pkg.name === otherPkg.name) continue;

        if (pkg.dependencies[otherPkg.name]) {
          const otherName = otherPkg.name.replace(/[^a-zA-Z0-9]/g, "_");
          mermaid += `  ${pkgName} --> ${otherName}\n`;
        }
      }
    }

    // External dependencies
    if (includeExternal) {
      const allPkgNames = packages.map((p) => p.name);
      const externalDeps = Object.keys(pkg.dependencies)
        .filter((dep) => !allPkgNames.includes(dep))
        .slice(0, 10); // Limit to top 10 to avoid overwhelming diagram

      if (externalDeps.length > 0) {
        for (const dep of externalDeps) {
          const depName = dep.replace(/[^a-zA-Z0-9]/g, "_");
          mermaid += `  ${dep}_ext["${dep}"] :::external\n`;
          mermaid += `  ${pkgName} --> ${dep}_ext\n`;
        }
      }
    }
  }

  // Add class definition for external dependencies
  mermaid += "\n  classDef external fill:#f9f,stroke:#333,stroke-width:2px\n";

  mermaid += "```\n\n";

  // Add a note about limits if applicable
  if (includeExternal) {
    mermaid +=
      "> Note: For clarity, only up to 10 external dependencies are shown per package.\n\n";
  }

  return mermaid;
}

/**
 * Generate version analysis for dependencies
 * @param {Array} packages - Array of package objects
 * @returns {string} Markdown content with version analysis
 */
function generateVersionAnalysis(packages) {
  // Collect all dependencies and their versions
  const dependencies = {};

  for (const pkg of packages) {
    // Regular dependencies
    for (const [dep, version] of Object.entries(pkg.dependencies)) {
      if (!dependencies[dep]) {
        dependencies[dep] = {};
      }
      dependencies[dep][version] = (dependencies[dep][version] || 0) + 1;
    }

    // Dev dependencies
    for (const [dep, version] of Object.entries(pkg.devDependencies)) {
      if (!dependencies[dep]) {
        dependencies[dep] = {};
      }
      dependencies[dep][version] = (dependencies[dep][version] || 0) + 1;
    }
  }

  // Filter to find dependencies with multiple versions
  const inconsistentDeps = Object.entries(dependencies)
    .filter(([, versions]) => Object.keys(versions).length > 1)
    .sort(([a], [b]) => a.localeCompare(b));

  let markdown = "";

  if (inconsistentDeps.length > 0) {
    markdown += "### Inconsistent Dependency Versions\n\n";
    markdown +=
      "The following dependencies have different versions across packages:\n\n";
    markdown += "| Dependency | Versions |\n";
    markdown += "|------------|----------|\n";

    for (const [dep, versions] of inconsistentDeps) {
      const versionList = Object.entries(versions)
        .map(([version, count]) => `\`${version}\` (${count} packages)`)
        .join(", ");

      markdown += `| \`${dep}\` | ${versionList} |\n`;
    }

    markdown += "\n";
  } else {
    markdown += "### Dependency Version Consistency\n\n";
    markdown +=
      "All dependencies have consistent versions across packages.\n\n";
  }

  // Top dependencies
  const topDeps = Object.entries(dependencies)
    .map(([name, versions]) => ({
      name,
      count: Object.values(versions).reduce((sum, count) => sum + count, 0),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  markdown += "### Top Dependencies\n\n";
  markdown += "| Dependency | Used in Packages |\n";
  markdown += "|------------|------------------|\n";

  for (const dep of topDeps) {
    markdown += `| \`${dep.name}\` | ${dep.count} |\n`;
  }

  markdown += "\n";

  return markdown;
}
