# Extending Project Mapper: Developer Guide

Project Mapper is designed with modularity and extensibility in mind. This guide explains how to extend the tool with new features, customize existing functionality, or modify its behavior to better suit your specific needs.

## Architecture Overview

Project Mapper follows a modular architecture with clear separation of concerns:

```text
project-mapper/
├── bin/                  # Entry point for CLI
├── lib/                  # Core functionality modules
│   ├── feature-module.js # Each feature in its own module
├── project-mapper.js     # Main application and CLI commands 
└── package.json          # Dependencies and metadata
```

Each feature is implemented as a separate module in the `lib/` directory, making it easy to add new features without modifying existing code.

## Adding a New Output Type

To add a new output type (e.g., "apiDocumentation" or "testCoverage"), follow these steps:

### 1. Create a new module in the `lib/` directory

Create a new file, e.g., `lib/api-documentation-generator.js`:

```javascript
// lib/api-documentation-generator.js
import fs from 'fs/promises';
import path from 'path';
import { getAllFiles } from './utils.js';

/**
 * Generate API documentation
 * @param {string} rootDir - Root directory to process
 * @param {Object} config - Configuration object
 * @returns {string} Markdown content with API documentation
 */
export async function generateApiDocumentation(rootDir, config) {
  // Implementation logic here
  let markdown = '# API Documentation\n\n';
  
  // Find API files (e.g., route definitions, controllers)
  const allFiles = await getAllFiles(rootDir, config);
  const apiFiles = allFiles.filter(file => 
    // Your criteria for identifying API files
    file.relativePath.includes('/api/') || 
    file.relativePath.includes('.routes.') ||
    file.relativePath.includes('.controller.')
  );
  
  // Process files and generate documentation
  // ...
  
  return markdown;
}
```

### 2. Update the config-manager.js with default configuration

Add your new output type to the default configuration in `lib/config-manager.js`:

```javascript
export const defaultConfig = {
  // Existing configuration...
  output: {
    // Existing outputs...
    apiDocumentation: {
      enabled: false,
      filename: "API-DOCUMENTATION.md",
      includeHeaders: true,
      includeParameters: true
    }
  }
};
```

### 3. Add a generator function in project-mapper.js

Add a new function to process your feature:

```javascript
// In project-mapper.js

// Import your new module
import { generateApiDocumentation } from './lib/api-documentation-generator.js';

// Add a new generator function
async function generateApiDocumentationOutput(rootDir, outputDir, config, options) {
  const spinner = ora('Generating API documentation...').start();
  
  try {
    const apiDocConfig = config.output.apiDocumentation || {};
    const outputPath = path.join(outputDir, apiDocConfig.filename || 'API-DOCUMENTATION.md');
    
    const apiDoc = await generateApiDocumentation(rootDir, config);
    await fs.writeFile(outputPath, apiDoc, 'utf8');
    
    spinner.succeed(chalk.green(`Generated API documentation at ${outputPath}`));
  } catch (error) {
    spinner.fail(chalk.red(`Error generating API documentation: ${error.message}`));
    if (options.verbose) {
      console.error(error);
    }
  }
}
```

### 4. Add your feature to the map action

In the `map` command, add your new output type:

```javascript
// In the map action of project-mapper.js
if (outputTypes.includes('apiDocumentation')) {
  await generateApiDocumentationOutput(rootDir, outputDir, config, options);
}
```

### 5. Update README.md to document your new feature

Make sure to update the documentation to include your new feature.

## Extending Existing Features

You can also enhance existing features by modifying their implementation:

### Example: Adding file size information to the markdown tree

1. Modify `lib/markdown-generator.js` to include file sizes:

```javascript
// In generateTree function of markdown-generator.js
const stats = await fs.stat(entryPath);
const size = entry.isDirectory() ? '' : ` (${formatFileSize(stats.size)})`;
result += `${linePrefix}${entry.name}${size}${description}\n`;
```

2. Import the formatFileSize utility if not already present:

```javascript
import { shouldIgnore, formatFileSize } from './utils.js';
```

## Creating Custom Commands

You can add new commands to the CLI by extending `project-mapper.js`:

```javascript
// Add a new command
program
  .command('analyze')
  .description('Analyze project quality and complexity')
  .option('-c, --config <path>', 'Path to config file', '.project-mapper.json')
  .option('-r, --root <path>', 'Root directory to analyze', '.')
  .option('-o, --output <file>', 'Output file path', './project-analysis.md')
  .action(async (options) => {
    // Command implementation
  });
```

## Adding a Custom Configuration Section

If your feature needs custom configuration, add it to the default config:

```javascript
// In config-manager.js
export const defaultConfig = {
  // Existing config...
  
  // Add your custom section
  customFeature: {
    enabled: false,
    option1: 'value1',
    option2: 'value2',
    complexOption: {
      subOption1: true,
      subOption2: false
    }
  }
};
```

## Publishing Your Extension

If you've developed a valuable extension, consider:

1. Forking the main project repository
2. Implementing your changes
3. Submitting a pull request
4. Alternatively, publish your extension as a separate package that can be used alongside Project Mapper

## Advanced Extension: Plugin System

For a more advanced extension mechanism, you could implement a plugin system:

```javascript
// Example of a plugin loader (would need to be implemented)
async function loadPlugins(config) {
  const plugins = [];
  
  if (config.plugins && Array.isArray(config.plugins)) {
    for (const pluginPath of config.plugins) {
      try {
        const plugin = await import(pluginPath);
        if (plugin.initialize && typeof plugin.initialize === 'function') {
          plugin.initialize(config);
        }
        plugins.push(plugin);
      } catch (error) {
        console.error(`Failed to load plugin ${pluginPath}: ${error.message}`);
      }
    }
  }
  
  return plugins;
}
```

## Common Extension Points

Here are some aspects of Project Mapper that are particularly well-suited for extension:

1. **New output formats**: In addition to Markdown, you could generate HTML, PDF, or even interactive documentation
2. **Code analysis**: Add complexity metrics, code quality checks, or security scanning
3. **Visualization improvements**: Enhance the mermaid diagrams or add new visualization types
4. **Integration with other tools**: Connect with CI/CD pipelines, documentation systems, or project management tools
5. **Custom renderers**: Create custom formatting for specific file types or project structures

## Best Practices for Extensions

When extending Project Mapper, follow these guidelines:

1. **Maintain modularity**: Keep features in separate modules with clear responsibilities
2. **Respect the existing architecture**: Follow the established patterns
3. **Add comprehensive error handling**: Use try/catch blocks and provide meaningful error messages
4. **Document your extensions**: Include comments, JSDoc annotations, and update README files
5. **Add configuration options**: Make your extensions configurable with sensible defaults
6. **Consider performance**: Be mindful of performance, especially for large projects
7. **Write tests**: Add tests for your new functionality

## Example: Test Coverage Reporter Extension

Here's a complete example of a new feature that generates test coverage reports:

```javascript
// lib/test-coverage-analyzer.js
import fs from 'fs/promises';
import path from 'path';
import { getAllFiles } from './utils.js';

/**
 * Analyze test coverage for the project
 * @param {string} rootDir - Root directory to process
 * @param {Object} config - Configuration object
 * @returns {string} Markdown content with test coverage analysis
 */
export async function analyzeTestCoverage(rootDir, config) {
  const allFiles = await getAllFiles(rootDir, config);
  
  // Group files by type (source vs test)
  const sourceFiles = allFiles.filter(file => {
    const ext = path.extname(file.relativePath);
    return ['.js', '.jsx', '.ts', '.tsx'].includes(ext) && 
           !file.relativePath.includes('/test/') &&
           !file.relativePath.includes('/__tests__/') &&
           !file.relativePath.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/);
  });
  
  const testFiles = allFiles.filter(file => {
    const ext = path.extname(file.relativePath);
    return ['.js', '.jsx', '.ts', '.tsx'].includes(ext) && 
           (file.relativePath.includes('/test/') ||
            file.relativePath.includes('/__tests__/') ||
            file.relativePath.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/));
  });
  
  // Analyze test coverage by directory
  const directories = {};
  
  for (const file of sourceFiles) {
    const dir = path.dirname(file.relativePath);
    if (!directories[dir]) {
      directories[dir] = { sourceFiles: 0, testFiles: 0 };
    }
    directories[dir].sourceFiles++;
  }
  
  for (const file of testFiles) {
    // Try to find the corresponding source directory
    const dir = path.dirname(file.relativePath)
      .replace('/test/', '/')
      .replace('/__tests__/', '/');
    
    if (directories[dir]) {
      directories[dir].testFiles++;
    } else {
      // If no matching source dir, add to the test directory itself
      const testDir = path.dirname(file.relativePath);
      if (!directories[testDir]) {
        directories[testDir] = { sourceFiles: 0, testFiles: 0 };
      }
      directories[testDir].testFiles++;
    }
  }
  
  // Generate Markdown report
  let markdown = '# Test Coverage Analysis\n\n';
  
  markdown += `Total source files: ${sourceFiles.length}\n`;
  markdown += `Total test files: ${testFiles.length}\n`;
  markdown += `Overall test ratio: ${(testFiles.length / sourceFiles.length).toFixed(2)}\n\n`;
  
  // Add coverage by directory
  markdown += '## Coverage by Directory\n\n';
  markdown += '| Directory | Source Files | Test Files | Ratio |\n';
  markdown += '|-----------|--------------|------------|-------|\n';
  
  Object.entries(directories)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([dir, counts]) => {
      const ratio = counts.sourceFiles > 0 
        ? (counts.testFiles / counts.sourceFiles).toFixed(2)
        : 'N/A';
      
      markdown += `| ${dir} | ${counts.sourceFiles} | ${counts.testFiles} | ${ratio} |\n`;
    });
  
  return markdown;
}
```

You would then integrate this in the main application as described above.

## Need Help?

If you need assistance with extending Project Mapper, consider:

1. Reviewing the existing code for patterns and examples
2. Consulting the documentation
3. Creating a GitHub issue with your questions
4. Contributing your extensions back to the main project

Happy extending!
