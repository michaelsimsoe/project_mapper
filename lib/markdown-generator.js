// lib/markdown-generator.js
import fs from "fs/promises";
import path from "path";
import { shouldIgnore } from "./utils.js";

/**
 * Generate markdown tree for project structure
 * @param {string} rootDir - Root directory to map
 * @param {Object} config - Configuration object
 * @returns {string} Markdown content
 */
export async function generateMarkdownTree(rootDir, config) {
  // Root project name is the base directory name
  const projectName = path.basename(rootDir);

  // Create document header
  let markdown = `# ${config.projectInfo.title} ${config.projectInfo.version}\n\n`;
  markdown += `${config.projectInfo.description}\n\n`;

  // Add directory structure
  markdown += `## Project Directory Layout\n\n\`\`\`bash\n${projectName}/\n`;
  markdown += await generateTree(rootDir, config);
  markdown += "```\n";

  // Add principles section if enabled
  if (
    config.output.markdownTree.includePrinciples &&
    config.principles.length > 0
  ) {
    markdown += generatePrinciples(config);
  }

  // Add changelog section if enabled
  if (
    config.output.markdownTree.includeChangelog &&
    config.changelog.length > 0
  ) {
    markdown += generateChangelog(config);
  }

  return markdown;
}

/**
 * Generate tree structure in markdown
 * @param {string} dirPath - Current directory path
 * @param {Object} config - Configuration object
 * @param {number} depth - Current depth (default: 0)
 * @param {string} prefix - Line prefix for indentation (default: '')
 * @param {string} relativePath - Relative path from root (default: '')
 * @returns {string} Markdown tree structure
 */
async function generateTree(
  dirPath,
  config,
  depth = 0,
  prefix = "",
  relativePath = ""
) {
  if (depth > config.maxDepth) {
    return "";
  }

  let result = "";
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  // Sort directories first, then files
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLast = i === entries.length - 1;
    const entryRelativePath = path.join(relativePath, entry.name);

    if (
      shouldIgnore(entry.name, entry.isDirectory(), entryRelativePath, config)
    ) {
      continue;
    }

    const entryPath = path.join(dirPath, entry.name);

    // Generate the line prefix for the current entry
    const linePrefix = `${prefix}${isLast ? "└── " : "├── "}`;
    const childPrefix = `${prefix}${isLast ? "    " : "│   "}`;

    // Add description if available and descriptions are enabled
    let description = "";
    if (config.includeDescriptions) {
      const desc = getDescription(
        entryRelativePath,
        entry.isDirectory(),
        config
      );
      if (desc) {
        description = ` # ${desc}`;
      }
    }

    // Add the current entry to the result
    result += `${linePrefix}${entry.name}${description}\n`;

    // Recursively add children for directories
    if (entry.isDirectory()) {
      result += await generateTree(
        entryPath,
        config,
        depth + 1,
        childPrefix,
        entryRelativePath
      );
    }
  }

  return result;
}

/**
 * Get description for a file or directory
 * @param {string} relativePath - Relative path from root
 * @param {boolean} isDirectory - Whether it's a directory
 * @param {Object} config - Configuration object
 * @returns {string|null} Description or null if none
 */
function getDescription(relativePath, isDirectory, config) {
  // Direct match for directories
  if (
    isDirectory &&
    config.directoryDescriptions &&
    config.directoryDescriptions[relativePath]
  ) {
    return config.directoryDescriptions[relativePath];
  }

  // For files, check pattern matches
  if (!isDirectory && config.filePatternDescriptions) {
    for (const [pattern, description] of Object.entries(
      config.filePatternDescriptions
    )) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(relativePath)) {
          return description;
        }
      } catch (e) {
        // Skip invalid regex
        console.warn(`Invalid regex pattern: ${pattern}`);
      }
    }
  }

  return null;
}

/**
 * Generate principles section
 * @param {Object} config - Configuration object
 * @returns {string} Markdown content for principles section
 */
function generatePrinciples(config) {
  if (!config.principles || !config.principles.length) {
    return "";
  }

  let result = `\n## Structure Principles\n\n`;
  config.principles.forEach((principle) => {
    result += `* **${principle.title}**: ${principle.description}\n`;
  });

  return result;
}

/**
 * Generate changelog section
 * @param {Object} config - Configuration object
 * @returns {string} Markdown content for changelog section
 */
function generateChangelog(config) {
  if (!config.changelog || !config.changelog.length) {
    return "";
  }

  let result = `\n## Change Log\n\n`;
  config.changelog.forEach((change) => {
    result += `* ${change.version} (${change.date}): ${change.description}\n`;
  });

  return result;
}
