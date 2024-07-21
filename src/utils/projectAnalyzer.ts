import fs from 'fs';
import path from 'path';
import { getProjectFilesDir } from './directoryUtils';

function shouldExclude(basename: string): boolean {
  const excludeDirs = new Set(['node_modules', '.git', 'dist', 'build', '.vscode', '.idea', 'venv', 'superhero_env', '__pycache__', 'example_project']);
  const excludeFiles = new Set(['.DS_Store']);
  return excludeDirs.has(basename) || excludeFiles.has(basename) || basename.startsWith('.');
}

export function analyzeProject(projectDir: string): string {
  const superheroFilesDir = getProjectFilesDir(projectDir);
  const structureFile = path.join(projectDir, superheroFilesDir, 'project-structure.txt');
  const contentFile = path.join(projectDir, superheroFilesDir, 'project-content.txt');

  // Analyze project structure
  let structureContent = `Project Structure:\n=================\n\nRoot: ${projectDir}\n\n`;
  function analyzeStructure(dir: string, level: number = 0) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (shouldExclude(item)) continue;
      const fullPath = path.join(dir, item);
      const relativePath = path.relative(projectDir, fullPath);
      const indent = '  '.repeat(level);
      if (fs.statSync(fullPath).isDirectory()) {
        structureContent += `${indent}${item}/\n`;
        analyzeStructure(fullPath, level + 1);
      } else {
        structureContent += `${indent}${item}\n`;
      }
    }
  }
  analyzeStructure(projectDir);
  fs.writeFileSync(structureFile, structureContent);

  // Analyze project content
  let contentContent = `Project Content:\n================\n\n`;
  function analyzeContent(dir: string) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (shouldExclude(item)) continue;
      const fullPath = path.join(dir, item);
      const relativePath = path.relative(projectDir, fullPath);
      if (fs.statSync(fullPath).isDirectory()) {
        analyzeContent(fullPath);
      } else if (item.match(/\.(py|txt|md|json|js|ts|tsx)$/)) {
        contentContent += `File: ${relativePath}\n${'='.repeat(relativePath.length + 6)}\n`;
        try {
          contentContent += fs.readFileSync(fullPath, 'utf8') + '\n\n';
        } catch (error) {
          contentContent += `Error reading file: ${error}\n\n`;
        }
      }
    }
  }
  analyzeContent(projectDir);
  fs.writeFileSync(contentFile, contentContent);

  return `Project analyzed. Results saved in ${structureFile} and ${contentFile}`;
}
