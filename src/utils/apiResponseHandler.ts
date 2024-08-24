import { Message } from '@/types/chat';
import fs from 'fs/promises';
import path from 'path';
import { getProjectFilesDir } from './directoryUtils';

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
        // lastMessage.content += "\n\nRemember to ALWAYS show FULL files when making modifications. No need to apologize.";
      } else if (Array.isArray(lastMessage.content)) {
        const lastContentItem = lastMessage.content[lastMessage.content.length - 1];
        if (lastContentItem.type === 'text') {
          // lastContentItem.text += "\n\nRemember to ALWAYS show FULL files when making modifications. No need to apologize.";
        } else {
          // lastMessage.content.push({ type: 'text', text: "\n\nRemember to ALWAYS show FULL files when making modifications. No need to apologize." });
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

export async function guessModifiedFiles(apiKey: { type: string; key: string }, systemPrompt: string, messages: Message[], projectDir: string): Promise<string[]> {
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
        lastMessage.content += "\n\nBased on this conversation, guess which files might be modified or needed for context. Guess liberally and also include project files that seem important in general. Respond ONLY with a list of ABSOLUTE file paths, one per line. Do NOT implement the modifications or include any explanations or additional text.";
      } else if (Array.isArray(lastMessage.content)) {
        lastMessage.content.push({ type: 'text', text: "\n\nBased on this conversation, guess which files might be modified or needed for context. Guess liberally and also include project files that seem important in general. Respond ONLY with a list of ABSOLUTE file paths, one per line. Do NOT implement the modifications or include any explanations or additional text." });
      }
    }
    
    body = {
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      system: systemPrompt,
      messages: filteredMessages,
    };

  } else if (apiKey.type === 'OpenAI') {
    headers['Authorization'] = `Bearer ${apiKey.key}`;

    const lastMessage = filteredMessages[filteredMessages.length - 1];
    if (lastMessage.role === 'user') {
      if (typeof lastMessage.content === 'string') {
        lastMessage.content += "\n\nBased on this conversation, guess which files might be modified or needed for context. Respond ONLY with a list of ABSOLUTE file paths, one per line. Do not include any explanations or additional text.";
      } else if (Array.isArray(lastMessage.content)) {
        lastMessage.content.push({ type: 'text', text: "\n\nBased on this conversation, guess which files might be modified or needed for context. Respond ONLY with a list of ABSOLUTE file paths, one per line. Do not include any explanations or additional text." });
      }
    }

    body = {
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...filteredMessages],
      max_tokens: 1000,
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

  const data = await response.json();
  const content = apiKey.type === 'Claude' ? data.content[0].text : data.choices[0].message.content;
  
  console.log('Raw LLM response:', content);

  // Extract file paths from the content
  const filePaths = content.split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Match lines that look like file paths
      const pathPattern = /(?:\/|\\|[A-Za-z]:\\)(?:[^\/\\:*?"<>|\r\n]+[\/\\])*[^\/\\:*?"<>|\r\n]+/;
      return pathPattern.test(line);
    })
    .map(line => {
      // Extract the file path from the line
      const pathPattern = /(?:\/|\\|[A-Za-z]:\\)(?:[^\/\\:*?"<>|\r\n]+[\/\\])*[^\/\\:*?"<>|\r\n]+/;
      const match = line.match(pathPattern);
      return match ? match[0] : '';
    })
    .filter(path => path !== ''); // Remove any empty strings

  console.log('Extracted file paths:', filePaths);

  // Populate project-content.txt with file contents
  let projectContent = 'Project Content:\n================\n\n';

  for (const filePath of filePaths) {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      projectContent += `File: ${filePath}\n${'='.repeat(filePath.length + 6)}\n${fileContent}\n\n`;
      console.log(`Added content of ${filePath} to project-content.txt`);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      projectContent += `File: ${filePath}\nError: Unable to read file content\n\n`;
    }
  }

  // Write the project content to project-content.txt in the correct location
  const ballisticFilesDir = getProjectFilesDir(projectDir);
  const projectContentPath = path.join(process.cwd(), ballisticFilesDir, 'project-content.txt');
  try {
    await fs.writeFile(projectContentPath, projectContent);
    console.log('Successfully wrote project-content.txt');
  } catch (error) {
    console.error('Error writing project-content.txt:', error);
  }

  return filePaths;
}