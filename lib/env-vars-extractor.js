// lib/env-vars-extractor.js
import fs from "fs/promises";
import path from "path";
import { getAllFiles } from "./utils.js";

/**
 * Extract environment variables documentation from .env.example files
 * @param {string} rootDir - Root directory to process
 * @param {Object} config - Configuration object
 * @returns {string} Markdown content with environment variables
 */
export async function extractEnvVars(rootDir, config) {
  const patterns = config.output.envVarsDocs.patterns || [
    ".env.example",
    ".env.*.example",
  ];

  // Get all files in the project
  const allFiles = await getAllFiles(rootDir, config);

  // Filter files by patterns
  const envFiles = allFiles.filter((file) => {
    const filename = path.basename(file.relativePath);
    return patterns.some((pattern) => {
      // Convert glob pattern to regex
      const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*");
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(filename);
    });
  });

  if (envFiles.length === 0) {
    return (
      "# Environment Variables\n\nNo environment variable files found matching the patterns: " +
      patterns.join(", ")
    );
  }

  // Sort files by path
  envFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  // Generate markdown content
  let markdown = "# Environment Variables\n\n";
  markdown +=
    "This document contains environment variables used by the project.\n\n";

  // Process each env file
  for (const file of envFiles) {
    try {
      const content = await fs.readFile(file.path, "utf8");
      markdown += `## ${file.relativePath}\n\n`;

      // Parse environment variables
      const variables = parseEnvFile(content);

      if (variables.length === 0) {
        markdown += "No environment variables found in this file.\n\n";
        continue;
      }

      // Create a table of variables
      markdown += "| Variable | Default Value | Description |\n";
      markdown += "|----------|---------------|-------------|\n";

      for (const variable of variables) {
        const value =
          variable.value === ""
            ? "_(empty)_"
            : `\`${escapeMarkdown(variable.value)}\``;
        const description = variable.description || "—";
        markdown += `| \`${variable.name}\` | ${value} | ${description} |\n`;
      }

      markdown += "\n";

      // Also include the raw file for reference
      markdown += "### Raw File Content\n\n";
      markdown += "```env\n";
      markdown += content.trim();
      markdown += "\n```\n\n";
    } catch (error) {
      markdown += `## ${file.relativePath}\n\n`;
      markdown += `> Error reading file: ${error.message}\n\n`;
    }
  }

  return markdown;
}

/**
 * Parse environment variables from a .env file
 * @param {string} content - Content of the .env file
 * @returns {Array} Array of parsed variables
 */
function parseEnvFile(content) {
  const lines = content.split("\n");
  const variables = [];

  for (let line of lines) {
    line = line.trim();

    // Skip empty lines and comments without a variable
    if (line === "" || (line.startsWith("#") && !line.includes("="))) {
      continue;
    }

    // Extract description from comment before the variable
    let description = "";
    let commentIndex = lines.indexOf(line) - 1;
    while (commentIndex >= 0 && lines[commentIndex].trim().startsWith("#")) {
      const commentLine = lines[commentIndex].trim().substring(1).trim();
      description = commentLine + (description ? " " + description : "");
      commentIndex--;
    }

    // Handle inline comments
    if (line.startsWith("#") && line.includes("=")) {
      line = line.substring(1).trim();
    }

    // Extract variable parts
    const match = line.match(/^([^=]+)(?:=(.*))?$/);
    if (match) {
      const name = match[1].trim();
      let value = match[2] ? match[2].trim() : "";

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.substring(1, value.length - 1);
      }

      // Handle inline comment after value
      const inlineCommentIndex = value.indexOf(" #");
      if (inlineCommentIndex !== -1) {
        const inlineComment = value.substring(inlineCommentIndex + 2).trim();
        value = value.substring(0, inlineCommentIndex).trim();
        if (!description) {
          description = inlineComment;
        }
      }

      variables.push({ name, value, description });
    }
  }

  return variables;
}

/**
 * Escape special markdown characters in a string
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeMarkdown(text) {
  return text
    .replace(/\|/g, "\\|")
    .replace(/\*/g, "\\*")
    .replace(/\_/g, "\\_")
    .replace(/\~/g, "\\~")
    .replace(/\`/g, "\\`");
}
