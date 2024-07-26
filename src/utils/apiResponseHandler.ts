import { Message } from '@/types/chat';
import fs from 'fs/promises';
import path from 'path';
import { getProjectBackupsDir } from './directoryUtils';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function truncateField(field: any, maxLength: number = 30): string {
  if (typeof field === 'string') {
    return field.length > maxLength ? field.substring(0, maxLength) + '...' : field;
  } else if (Array.isArray(field)) {
    return `Array(${field.length})`;
  } else if (typeof field === 'object' && field !== null) {
    return 'Object';
  } else {
    return String(field);
  }
}

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
  const backupsDir = getProjectBackupsDir(projectDir);
  const logFileName = `api_request_log_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const logFilePath = path.join(backupsDir, logFileName);

  const logContent = JSON.stringify({
    timestamp: new Date().toISOString(),
    apiType,
    requestBody
  }, null, 2);

  await fs.writeFile(logFilePath, logContent, 'utf-8');
  console.log(`API request logged to: ${logFilePath}`);
}

export async function fetchAPIResponse(apiKey: { type: string; key: string }, systemPrompt: string, messages: Message[], projectDir: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let body: any;

  const filteredMessages = await filterMessages(messages);

  console.log("Messages being sent to the API:");
  filteredMessages.forEach((msg, index) => {
    console.log(`Message ${index}:`);
    Object.keys(msg).forEach(key => {
      console.log(`  ${key}: ${truncateField((msg as any)[key])}`);
    });
  });

  if (apiKey.type === 'Claude') {
    headers['x-api-key'] = apiKey.key;
    headers['anthropic-version'] = '2023-06-01';
    headers["anthropic-beta"] = "max-tokens-3-5-sonnet-2024-07-15";
    
    body = {
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 8192,
      system: systemPrompt,
      messages: filteredMessages,
      stream: true
    };

    console.log("Claude API request body (truncated for logging):");
    console.log(JSON.stringify(body, (key, value) => {
      if (key === 'data' && typeof value === 'string') {
        return truncateField(value);
      }
      return value;
    }, 2));

  } else if (apiKey.type === 'OpenAI') {
    headers['Authorization'] = `Bearer ${apiKey.key}`;
    body = {
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...filteredMessages],
      max_tokens: 4096,
      stream: true
    };

    console.log("OpenAI API request body:");
    console.log(JSON.stringify(body, (key, value) => {
      if (typeof value === 'string') {
        return truncateField(value);
      }
      return value;
    }, 2));
  } else {
    throw new Error('Unsupported API type');
  }

  // Log the API request
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
