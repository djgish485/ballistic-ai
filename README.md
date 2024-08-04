# Ballistic - AI-powered Code Analysis Assistant

Ballistic is a Next.js-based application designed to enhance your local software development workflow with AI-powered code analysis and collaboration features. It serves as a tool to assist in developing other software projects, not for developing itself.

## Prerequisites

Before you begin, ensure you have the following installed on your system:
- Node.js (version 14 or later)
- npm (usually comes with Node.js)
- Git

## Getting Started

Follow these steps to set up and run Ballistic on your local machine:

1. Clone the repository:
   ```
   git clone https://github.com/your-username/ballistic-nextjs.git
   cd ballistic-nextjs
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev -- /path/to/your/project
   ```
   Replace `/path/to/your/project` with the absolute path to the project you want to analyze.

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Quick Start Guide

1. Click 'Start' to begin
   - Project backup will be automatically created
   - Crucial project files will be automatically added to AI context
2. Enhance context by adding extra files (e.g., requirements doc)
   - Optimize large contexts (>150 KB) via context settings
3. Expect full file outputs from the AI
   - Execute/Write/Diff/Undo buttons will appear underneath files & commands
   - If AI truncates a file, prompt it for the full file
4. Click "Next Feature" or reload page to keep chat manageable 

## Choosing Your API

- Anthropic Claude 3.5 (Recommended): 8192 token output, highly capable
- OpenAI GPT-4 Turbo: 4096 token output, faster with higher rate limits

## Usage

1. Once Ballistic is running, you'll see its interface in your browser.
2. Use the "Start" button to begin analyzing your target project.
3. Interact with the AI assistant to ask questions about your project's code or request changes.
4. Use the file management features to upload, view, or modify project files.
5. Execute code snippets directly from the chat interface.
6. Review and apply suggested changes to your target project.

## Features

- Project backup and restoration for your target project
- Real-time collaborative coding assistance
- Integrated chat with AI assistant
- File management and code execution for your target project
- API key management for different AI services
- Syntax highlighting and diff viewing

## Customization

You can customize the behavior of Ballistic by modifying the following files:
- `src/utils/settings.ts`: Adjust default settings like included paths and file extensions.
- `public/initial_prompt.txt`: Modify the initial prompt given to the AI assistant.

## Contributing

Contributions to Ballistic are welcome! Please feel free to submit a Pull Request.

## License

[MIT](https://choosealicense.com/licenses/mit/)