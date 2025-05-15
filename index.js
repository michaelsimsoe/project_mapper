#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { generateMarkdownTree } from "./lib/markdown-generator.js";
import { extractConfigFiles } from "./lib/config-extractor.js";
import { createDefaultConfig } from "./lib/config-manager.js";
import { ensureDirectoryExists } from "./lib/utils.js";
import { extractEnvVars } from "./lib/env-vars-extractor.js";
import { analyzeDependencies } from "./lib/dependency-analyzer.js";
import { generateArchitecture } from "./lib/architecture-generator.js";
import { saveMetadata } from "./lib/metadata-generator.js";
import figlet from "figlet";
import ora from "ora";

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Package information
const packageJson = JSON.parse(
  await fs.readFile(path.join(__dirname, "package.json"), "utf8")
);

// Create CLI program
const program = new Command();

// Display banner
console.log(
  chalk.cyan(
    figlet.textSync("Project Mapper", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
    })
  )
);
console.log(
  chalk.blue(`v${packageJson.version} - Project structure documentation tool\n`)
);

program
  .name("project-mapper")
  .description("Generate comprehensive project structure documentation")
  .version(packageJson.version);

// init command - Create default config file
program
  .command("init")
  .description("Create a default configuration file")
  .option("-f, --force", "Overwrite existing config file", false)
  .action(async (options) => {
    const configPath = path.resolve(".project-mapper.json");

    if ((await fileExists(configPath)) && !options.force) {
      console.error(
        chalk.yellow(`Config file already exists at ${configPath}`)
      );
      console.log(chalk.blue("Use --force to overwrite it"));
      return;
    }

    const spinner = ora("Creating configuration file...").start();

    try {
      await createDefaultConfig(configPath);
      spinner.succeed(
        chalk.green(`Configuration file created at ${configPath}`)
      );
    } catch (error) {
      spinner.fail(chalk.red(`Failed to create config file: ${error.message}`));
    }
  });

// map command - Main command to generate documentation
program
  .command("map")
  .description("Generate project structure documentation (default command)")
  .option("-c, --config <path>", "Path to config file", ".project-mapper.json")
  .option("-r, --root <path>", "Root directory to map", ".")
  .option(
    "-o, --output <directory>",
    "Output directory for generated files",
    "./project-docs"
  )
  .option(
    "--only <types>",
    "Only generate specific output types (comma-separated)",
    ""
  )
  .option("-v, --verbose", "Show detailed logging", false)
  .option("--silent", "Suppress all console output except errors", false)
  .action(async (options) => {
    if (options.silent) {
      console.log = () => {};
    }

    // Load configuration
    let config;
    const configSpinner = ora("Loading configuration...").start();

    try {
      const configPath = path.resolve(options.config);
      if (!(await fileExists(configPath))) {
        configSpinner.fail(chalk.red(`Config file not found at ${configPath}`));
        console.log(
          chalk.blue(
            'Run "project-mapper init" to create a default config file'
          )
        );
        return;
      }

      const configContent = await fs.readFile(configPath, "utf8");
      config = JSON.parse(configContent);
      configSpinner.succeed("Configuration loaded");
    } catch (error) {
      configSpinner.fail(chalk.red(`Error loading config: ${error.message}`));
      return;
    }

    // Create output directory
    const outputDir = path.resolve(options.output);
    await ensureDirectoryExists(outputDir);

    // Determine which outputs to generate
    const outputTypes = options.only
      ? options.only.split(",").map((type) => type.trim())
      : Object.keys(config.output).filter((key) => config.output[key].enabled);

    // Process root directory
    const rootDir = path.resolve(options.root);
    if (options.verbose) {
      console.log(chalk.blue(`Processing directory: ${rootDir}`));
    }

    // Generate all requested outputs
    if (
      outputTypes.includes("markdownTree") ||
      outputTypes.includes("markdown")
    ) {
      await generateMarkdownOutput(rootDir, outputDir, config, options);
    }

    if (outputTypes.includes("configFiles")) {
      await generateConfigFilesOutput(rootDir, outputDir, config, options);
    }

    if (outputTypes.includes("envVarsDocs")) {
      await generateEnvVarsOutput(rootDir, outputDir, config, options);
    }

    if (outputTypes.includes("dependencyGraph")) {
      await generateDependencyOutput(rootDir, outputDir, config, options);
    }

    if (outputTypes.includes("architecture")) {
      await generateArchitectureOutput(rootDir, outputDir, config, options);
    }

    if (outputTypes.includes("metadataJson")) {
      await generateMetadataOutput(rootDir, outputDir, config, options);
    }

    console.log(
      chalk.green(`\nDocumentation complete! Files saved to ${outputDir}`)
    );
    console.log(
      chalk.blue(
        "Tip: Open the markdown files in a markdown viewer for best results"
      )
    );
  });

// Default command is 'map'
program.addHelpText(
  "after",
  `
Examples:
  $ project-mapper init
  $ project-mapper 
  $ project-mapper map --config custom-config.json --output ./docs
  $ project-mapper map --only markdown,configFiles
`
);

// Helper function to check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Generate markdown tree output
async function generateMarkdownOutput(rootDir, outputDir, config, options) {
  const spinner = ora("Generating project structure markdown...").start();

  try {
    const markdownConfig = config.output.markdownTree || {};
    const outputPath = path.join(
      outputDir,
      markdownConfig.filename || "PROJECT-STRUCTURE.md"
    );

    const markdown = await generateMarkdownTree(rootDir, config);
    await fs.writeFile(outputPath, markdown, "utf8");

    spinner.succeed(chalk.green(`Generated markdown at ${outputPath}`));
  } catch (error) {
    spinner.fail(chalk.red(`Error generating markdown: ${error.message}`));
    if (options.verbose) {
      console.error(error);
    }
  }
}

// Generate config files output
async function generateConfigFilesOutput(rootDir, outputDir, config, options) {
  const spinner = ora("Extracting config files...").start();

  try {
    const configFilesConfig = config.output.configFiles || {};
    const outputPath = path.join(
      outputDir,
      configFilesConfig.filename || "CONFIG-FILES.md"
    );

    const configFiles = await extractConfigFiles(rootDir, config);
    await fs.writeFile(outputPath, configFiles, "utf8");

    spinner.succeed(chalk.green(`Generated config files at ${outputPath}`));
  } catch (error) {
    spinner.fail(chalk.red(`Error extracting config files: ${error.message}`));
    if (options.verbose) {
      console.error(error);
    }
  }
}

// Add these functions below the existing ones

// Generate environment variables documentation
async function generateEnvVarsOutput(rootDir, outputDir, config, options) {
  const spinner = ora("Extracting environment variables...").start();

  try {
    const envVarsConfig = config.output.envVarsDocs || {};
    const outputPath = path.join(
      outputDir,
      envVarsConfig.filename || "ENV-VARIABLES.md"
    );

    const envVarsDoc = await extractEnvVars(rootDir, config);
    await fs.writeFile(outputPath, envVarsDoc, "utf8");

    spinner.succeed(
      chalk.green(
        `Generated environment variables documentation at ${outputPath}`
      )
    );
  } catch (error) {
    spinner.fail(
      chalk.red(`Error extracting environment variables: ${error.message}`)
    );
    if (options.verbose) {
      console.error(error);
    }
  }
}

// Generate dependency analysis
async function generateDependencyOutput(rootDir, outputDir, config, options) {
  const spinner = ora("Analyzing dependencies...").start();

  try {
    const dependencyConfig = config.output.dependencyGraph || {};
    const outputPath = path.join(
      outputDir,
      dependencyConfig.filename || "DEPENDENCIES.md"
    );

    const dependencyDoc = await analyzeDependencies(rootDir, config);
    await fs.writeFile(outputPath, dependencyDoc, "utf8");

    spinner.succeed(
      chalk.green(`Generated dependency analysis at ${outputPath}`)
    );
  } catch (error) {
    spinner.fail(chalk.red(`Error analyzing dependencies: ${error.message}`));
    if (options.verbose) {
      console.error(error);
    }
  }
}

// Generate architecture diagrams
async function generateArchitectureOutput(rootDir, outputDir, config, options) {
  const spinner = ora("Generating architecture diagrams...").start();

  try {
    const architectureConfig = config.output.architecture || {};
    const outputPath = path.join(
      outputDir,
      architectureConfig.filename || "ARCHITECTURE.md"
    );

    const architectureDoc = await generateArchitecture(rootDir, config);
    await fs.writeFile(outputPath, architectureDoc, "utf8");

    spinner.succeed(
      chalk.green(`Generated architecture documentation at ${outputPath}`)
    );
  } catch (error) {
    spinner.fail(
      chalk.red(`Error generating architecture diagrams: ${error.message}`)
    );
    if (options.verbose) {
      console.error(error);
    }
  }
}

// Generate metadata JSON
async function generateMetadataOutput(rootDir, outputDir, config, options) {
  const spinner = ora("Generating project metadata...").start();

  try {
    const outputPath = await saveMetadata(rootDir, outputDir, config);
    spinner.succeed(chalk.green(`Generated project metadata at ${outputPath}`));
  } catch (error) {
    spinner.fail(chalk.red(`Error generating metadata: ${error.message}`));
    if (options.verbose) {
      console.error(error);
    }
  }
}

// Parse command line arguments
program.parse(process.argv);

// If no arguments, run the default 'map' command
if (process.argv.length <= 2) {
  program.parse([process.argv[0], process.argv[1], "map"]);
}
