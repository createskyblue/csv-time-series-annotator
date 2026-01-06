<a href="./README.md">中文版</a> | <a href="./README.en.md">English Version</a>

# Online Usage
You can use this tool directly at [https://createskyblue.github.io/csv-time-series-annotator/](https://createskyblue.github.io/csv-time-series-annotator/) without installing any dependencies.

# NanoEdgeAI CSV Time Series Annotation Tool

## Project Introduction

The NanoEdgeAI CSV Time Series Annotation Tool is a web-based data annotation platform designed specifically for the visualization and annotation of time series data. The project provides local operation and rapid deployment capabilities, improving data annotation efficiency.

This tool is mainly aimed at data scientists, machine learning engineers, and research teams that need structured annotation of time series data.

## Main Features

- **Data Import and Parsing**: Supports importing data in formats such as CSV, using Papa Parse for efficient parsing
- **Time Series Visualization**: Implements data visualization based on the lightweight chart library uPlot
- **Label Management**: Flexible label configuration system supporting custom labels
- **Data Export**: One-click export of annotation results to categorized CSV files
- **Project Backup and Recovery**: Supports import/export functionality for project states

## Demo

![Application Demo](./img/PixPin_2026-01-06_23-07-55.png)

## Technical Architecture

- **Frontend Framework**: React v19.2.3
- **Language**: TypeScript ~5.8.2
- **Build Tool**: Vite ^6.2.0
- **Chart Library**: uPlot ^1.6.32
- **CSV Parsing**: Papa Parse ^5.5.3

## Quick Start

### Environment Preparation

Ensure your system has Node.js installed (version compatible with npm)

### Installation and Running

1. **Clone or download the project to your local directory**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local service**:
   ```bash
   npm run dev
   ```

## Usage Instructions

### Data Import
- Click the "Upload CSV Data Source" button in the sidebar and select a CSV file
- Each row in the CSV will be treated as an independent time series sample

### Label Configuration
- Edit labels in the "Label Configuration" area, one label per line
- The tagging buttons below will update immediately after modification

### Data Annotation
- Use the A/D keys on the keyboard or click the arrow buttons to switch samples
- Click the label button to tag the current sample
- Annotated samples will be displayed in the status indicator area

### Data Export
- After completing the annotation, click the "Export Annotation Results" button
- The system will export CSV files classified by label

### Project Management
- Use the "Export Project" function to save current annotation progress
- Use the "Import Project" function to restore previous annotation progress

## Build and Deployment
```bash
npm run build
```

## Project Structure

```
.
├── App.tsx           # Main application component
├── uplot-wrapper.tsx # Chart component wrapper
├── types.ts          # Type definitions
├── index.html        # Application entry HTML
├── index.tsx         # React rendering entry
├── vite.config.ts    # Vite configuration
├── lib/              # Third-party libraries
├── img/              # Image assets
└── README.md
```

