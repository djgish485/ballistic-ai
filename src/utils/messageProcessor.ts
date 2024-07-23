import fs from 'fs';
import path from 'path';
import { Message } from '@/types/chat';

export function getInitialPrompt(): string {
  return fs.readFileSync(path.join(process.cwd(), 'public', 'initial_prompt.txt'), 'utf-8');
}

export function constructInitialMessage(projectFiles: string): string {
  return `Please provide a SHORT, CONCISE overview of the project based on the following information. I will then ask for specific changes or improvements.\n\nHere are the project files:\n\n${projectFiles}`;
}

export function constructServerMessages(isInitial: boolean, initialMessage: string, conversationHistory: Message[], message?: string): Message[] {
  let serverMessages: Message[] = [];
  if (isInitial) {
    serverMessages = [{ role: 'user', content: initialMessage }];
  } else {
    serverMessages = [
      { role: 'user', content: initialMessage },
      ...conversationHistory
    ];
    if (message) {
      serverMessages.push({ role: 'user', content: message });
    }
  }
  return serverMessages;
}
