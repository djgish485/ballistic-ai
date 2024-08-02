import { Message } from '@/types/chat';
import fs from 'fs/promises';
import path from 'path';
import { getProjectBackupsDir } from './directoryUtils';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

async function filterMessages(messages: Message[]): Promise<{ role: string, content: string | { type: string, text?: string, source?: any }[] }[]> {
  const filteredMessages = [];
  for (const { role, content, images } of messages) {
    if (images && images.length > 0) {
      const contentArray: { type: string, text?: string, source?: any }[] = [];
      for (const image of images) {
        const base64Data = await fileToBase64(image);
        contentArray.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: image.type,
            data: base64Data,
          },
        });
      }
      contentArray.push({ type: 'text', text: content });
      filteredMessages.push({ role, content: contentArray });
    } else {
      filteredMessages.push({ role, content });
    }
  }
  return filteredMessages;
}

async function logAPIRequest(projectDir: string, apiType: string, requestBody: any) {
  // Commented out the file writing functionality
  /*
  const backupsDir = getProjectBackupsDir(projectDir);
  const logFileName = `api_request_log_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const logFilePath = path.join(backupsDir, logFileName);

  const logContent = JSON.stringify({
    timestamp: new Date().toISOString(),
    apiType,
    requestBody
  }, null, 2);

  await fs.writeFile(logFilePath, logContent, 'utf-8');
  */
}

export async function fetchAPIResponse(apiKey: { type: string; key: string }, systemPrompt: string, messages: Message[], projectDir: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let body: any;

  const filteredMessages = await filterMessages(messages);

  if (apiKey.type === 'Claude') {
    headers['x-api-key'] = apiKey.key;
    headers['anthropic-version'] = '2023-06-01';
    headers["anthropic-beta"] = "max-tokens-3-5-sonnet-2024-07-15";
    
    const lastMessage = filteredMessages[filteredMessages.length - 1];
    if (lastMessage.role === 'user') {
      if (typeof lastMessage.content === 'string') {
        lastMessage.content += "\n\nRemember to ALWAYS show FULL files when making modifications. No need to apologize.";
      } else if (Array.isArray(lastMessage.content)) {
        const lastContentItem = lastMessage.content[lastMessage.content.length - 1];
        if (lastContentItem.type === 'text') {
          lastContentItem.text += "\n\nRemember to ALWAYS show FULL files when making modifications. No need to apologize.";
        } else {
          lastMessage.content.push({ type: 'text', text: "\n\nRemember to ALWAYS show FULL files when making modifications. No need to apologize." });
        }
      }
    }
    
    body = {
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 8192,
      system: systemPrompt,
      messages: filteredMessages,
      stream: true
    };

  } else if (apiKey.type === 'OpenAI') {
    headers['Authorization'] = `Bearer ${apiKey.key}`;

    const lastMessage = filteredMessages[filteredMessages.length - 1];
    if (lastMessage.role === 'user') {
      if (typeof lastMessage.content === 'string') {
      //  lastMessage.content += "\n\nRemember to use PRECISE absolute paths.";
      } else if (Array.isArray(lastMessage.content)) {
        const lastContentItem = lastMessage.content[lastMessage.content.length - 1];
        if (lastContentItem.type === 'text') {
      //    lastContentItem.text += "\n\nRemember to use PRECISE absolute paths.";
        } else {
        //  lastMessage.content.push({ type: 'text', text: "\n\nRemember to use PRECISE absolute paths." });
        }
      }
    }

    body = {
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...filteredMessages],
      max_tokens: 4096,
      stream: true
    };
  } else {
    throw new Error('Unsupported API type');
  }

  await logAPIRequest(projectDir, apiKey.type, body);

  const response = await fetch(apiKey.type === 'Claude' ? CLAUDE_API_URL : OPENAI_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${apiKey.type} API request failed with status ${response.status}: ${errorText}`);
  }

  return response;
}