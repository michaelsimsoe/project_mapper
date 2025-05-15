// lib/utils.js
import fs from "fs/promises";
import path from "path";

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path to ensure
 */
export async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Check if a file/directory should be ignored
 * @param {string} name - Name of file/directory
 * @param {boolean} isDirectory - Whether the entry is a directory
 * @param {Object} config - Config object with ignore patterns
 * @returns {boolean} True if the entry should be ignored
 */
export function shouldIgnore(name, isDirectory, relativePath, config) {
  const patterns = isDirectory
    ? config.ignore.directories
    : config.ignore.files;

  // Check direct matches
  if (patterns.includes(name)) {
    return true;
  }

  // Check pattern matches
  return config.ignore.patterns.some((pattern) => {
    const regex = new RegExp(
      `^${pattern.replace(/\./g, "\\.").replace(/\*/g, ".*")}$`
    );
    return regex.test(name) || regex.test(relativePath);
  });
}

/**
 * Get all files in a directory recursively up to a max depth
 * @param {string} rootDir - Root directory to start from
 * @param {Object} config - Config object with ignore patterns
 * @param {number} currentDepth - Current depth level (default: 0)
 * @param {string} relativePath - Current relative path from root (default: '')
 * @returns {Array} Array of file objects with path and stats
 */
export async function getAllFiles(
  rootDir,
  config,
  currentDepth = 0,
  relativePath = ""
) {
  if (currentDepth > config.maxDepth) {
    return [];
  }

  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  let results = [];

  for (const entry of entries) {
    const entryRelativePath = path.join(relativePath, entry.name);

    if (
      shouldIgnore(entry.name, entry.isDirectory(), entryRelativePath, config)
    ) {
      continue;
    }

    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(
        entryPath,
        config,
        currentDepth + 1,
        entryRelativePath
      );
      results = results.concat(subFiles);
    } else {
      const stats = await fs.stat(entryPath);
      results.push({
        path: entryPath,
        relativePath: entryRelativePath,
        stats,
      });
    }
  }

  return results;
}

/**
 * Format file size in a human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
