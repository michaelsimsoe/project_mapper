# Project Mapper

A CLI tool that generates comprehensive documentation for your project structure. Perfect for communicating with LLM development agents about your codebase.

## Features

- **Project Structure Visualization**: Generate a tree view of your project structure in markdown format
- **Config Files Extraction**: Compile all configuration files (package.json, tsconfig.json, etc.) into a single document
- **Dependency Analysis**: Analyze and visualize dependencies between packages in your project
- **Environment Variables Documentation**: Document all environment variables from .env.example files
- **Architecture Diagrams**: Generate Mermaid diagrams of your project architecture

## Installation

```bash
# Local installation
npm install

# Run from the project directory
npm start

# Link for global usage
npm link
```

## Usage

```bash
# Create a default configuration file
project-mapper init

# Generate documentation using default settings
project-mapper

# Specify a custom config file and output directory
project-mapper map --config custom-config.json --output ./docs

# Generate only specific outputs
project-mapper map --only markdown,configFiles
```

## Configuration

The tool uses a JSON configuration file (default: `.project-mapper.json`) to customize its behavior. You can generate a default configuration file by running `project-mapper init`.
Example configuration:

```json
{
  "projectInfo": {
    "title": "My Project",
    "version": "v1.0",
    "description": "Project structure documentation"
  },
  "output": {
    "markdownTree": {
      "enabled": true,
      "filename": "PROJECT-STRUCTURE.md",
      "includePrinciples": true,
      "includeChangelog": true
    },
    "configFiles": {
      "enabled": true,
      "filename": "CONFIG-FILES.md",
      "includeFiles": {
        "package.json": true,
        "dockerfile": true,
        "tsconfig.json": true,
        "eslint": true,
        "env.example": true
      }
    }
  },
  "ignore": {
    "directories": [
      "node_modules",
      ".git",
      "dist"
    ],
    "files": [
      ".DS_Store",
      "*.log"
    ]
  }
}
```