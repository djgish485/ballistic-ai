import fs from 'fs';
import path from 'path';
import { Message } from '@/types/chat';
import os from 'os';

export function getInitialPrompt(): string {
  const promptPath = path.join(process.cwd(), 'public', 'initial_prompt.txt');
  let prompt = fs.readFileSync(promptPath, 'utf-8');

  // Determine the current operating system
  let currentOS: string;
  switch (os.platform()) {
    case 'darwin':
      currentOS = 'macOS';
      break;
    case 'win32':
      currentOS = 'Windows';
      break;
    case 'linux':
      currentOS = 'Linux';
      break;
    default:
      currentOS = 'the current operating system';
  }

  // Replace the placeholder with the actual operating system
  prompt = prompt.replace('{{OS_PLACEHOLDER}}', currentOS);

  return prompt;
}

export function constructInitialMessage(projectFiles: string): string {
  return `Please provide a SHORT, CONCISE overview of the project based on the following information. Limit your response to 2-3 sentences focusing on the main purpose and key features. After the overview, invite the user to ask questions about the project or request specific changes and improvements.\n\nHere are the project files:\n\n${projectFiles}`;
}

export function constructServerMessages(
  isInitial: boolean, 
  initialMessage: string, 
  conversationHistory: Message[]
): Message[] {
  if (isInitial) {
    return [{ role: 'user', content: initialMessage }];
  } else {
    return [
      { role: 'user', content: initialMessage },
      ...conversationHistory
    ];
  }
}