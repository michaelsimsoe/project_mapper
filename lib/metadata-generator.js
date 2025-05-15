// lib/metadata-generator.js
import fs from "fs/promises";
import path from "path";
import { getAllFiles, formatFileSize } from "./utils.js";

/**
 * Generate project metadata
 * @param {string} rootDir - Root directory to process
 * @param {Object} config - Configuration object
 * @returns {Object} Project metadata object
 */
export async function generateMetadata(rootDir, config) {
  // Get all files
  const allFiles = await getAllFiles(rootDir, config);

  // Get package.json files
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
        version: pkg.version,
        dependencies: Object.keys(pkg.dependencies || {}).length,
        devDependencies: Object.keys(pkg.devDependencies || {}).length,
      });
    } catch (error) {
      console.error(`Error parsing ${file.path}: ${error.message}`);
    }
  }

  // Count files by extension
  const extensionCounts = {};
  let totalSize = 0;

  for (const file of allFiles) {
    const ext = path.extname(file.path).toLowerCase() || "(no extension)";
    extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
    totalSize += file.stats.size;
  }

  // Generate directories structure
  const directories = {};

  for (const file of allFiles) {
    const dir = path.dirname(file.relativePath);
    if (!directories[dir]) {
      directories[dir] = {
        fileCount: 0,
        size: 0,
      };
    }

    directories[dir].fileCount++;
    directories[dir].size += file.stats.size;
  }

  // Create metadata object
  const metadata = {
    projectInfo: {
      name: path.basename(rootDir),
      ...config.projectInfo,
      generatedAt: new Date().toISOString(),
    },
    stats: {
      totalFiles: allFiles.length,
      totalPackages: packages.length,
      totalDirectories: Object.keys(directories).length,
      totalSize: totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
    },
    fileTypes: Object.entries(extensionCounts)
      .map(([ext, count]) => ({ extension: ext, count }))
      .sort((a, b) => b.count - a.count),
    packages: packages,
    topDirectories: Object.entries(directories)
      .map(([dir, stats]) => ({
        path: dir,
        fileCount: stats.fileCount,
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
      }))
      .sort((a, b) => b.fileCount - a.fileCount)
      .slice(0, 20),
  };

  return metadata;
}

/**
 * Save project metadata to a file
 * @param {string} rootDir - Root directory to process
 * @param {string} outputDir - Output directory
 * @param {Object} config - Configuration object
 * @returns {Promise<string>} Path to the generated file
 */
export async function saveMetadata(rootDir, outputDir, config) {
  const metadata = await generateMetadata(rootDir, config);
  const outputPath = path.join(
    outputDir,
    config.output.metadataJson.filename || "project-metadata.json"
  );

  await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2), "utf8");

  return outputPath;
}
