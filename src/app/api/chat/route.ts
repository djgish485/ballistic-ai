import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProjectFilesDir, getProjectBackupsDir } from '@/utils/directoryUtils';
import { getSelectedAPIKey } from '@/utils/apiKeyManager';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export async function POST(req: NextRequest) {
  console.log('Received POST request to /api/chat');
  try {
    const { projectDir, message, isInitial, conversationHistory } = await req.json();
    console.log('Request body:', { projectDir, message, isInitial, conversationHistory });

    if (!projectDir) {
      console.error('Project directory is required');
      return NextResponse.json({ error: 'Project directory is required' }, { status: 400 });
    }

    const apiKey = getSelectedAPIKey();
    console.log('Selected API key type:', apiKey?.type);

    if (!apiKey) {
      console.error('No API key selected');
      throw new Error('No API key selected');
    }

    const initialPrompt = fs.readFileSync(path.join(process.cwd(), 'public', 'initial_prompt.txt'), 'utf-8');
    console.log('Initial prompt loaded');

    const projectFiles = await getProjectFiles(projectDir);
    console.log('Project files loaded');

    const systemPrompt = initialPrompt;
    const initialMessage = `Please provide a SHORT overview of the project based on the following information. I will then ask for specific changes or improvements.\n\nHere are the project files:\n\n${projectFiles}`;

    let serverMessages: Message[] = [];
    if (isInitial) {
      serverMessages = [{ role: 'user', content: initialMessage }];
      console.log('Set up initial message');
    } else {
      // Reconstruct the server messages, ensuring the initial message is always first
      serverMessages = [
        { role: 'user', content: initialMessage },
        ...conversationHistory
      ];
      if (message) {
        serverMessages.push({ role: 'user', content: message });
      }
      console.log('Reconstructed conversation history');
    }

    console.log('Server messages:', serverMessages);

    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        console.log('Starting stream');
        try {
          const apiResponse = await fetchAPIResponse(apiKey, systemPrompt, serverMessages);
          console.log('API response status:', apiResponse.status);

          if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error(`API request failed with status ${apiResponse.status}: ${errorText}`);
            controller.error(`API request failed with status ${apiResponse.status}: ${errorText}`);
            return;
          }

          const reader = apiResponse.body!.getReader();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            //console.log('Received chunk:', chunk);

            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  let content = '';
                  if (apiKey.type === 'Claude' && data.type === 'content_block_delta' && data.delta?.text) {
                    content = data.delta.text;
                  } else if (apiKey.type === 'OpenAI' && data.choices && data.choices[0].delta.content) {
                    content = data.choices[0].delta.content;
                  }
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(`data: ${JSON.stringify({ content })}\n\n`);
                  }
                } catch (error) {
                  console.error('Error parsing JSON:', error);
                  // Skip this line and continue with the next one
                }
              }
            }
          }

          console.log('Stream completed');

          // Add the assistant's response to the server-side conversation history
          serverMessages.push({ role: 'assistant', content: fullResponse });

          // Export chat log
          await exportChatLog(projectDir, serverMessages);

          // Only send back the visible part of the conversation to the client
          const visibleMessages = isInitial 
            ? [{ role: 'assistant' as const, content: fullResponse }]
            : [...conversationHistory, { role: 'user' as const, content: message || '' }, { role: 'assistant' as const, content: fullResponse }];

          controller.enqueue(`event: done\ndata: ${JSON.stringify({ conversationHistory: visibleMessages })}\n\n`);
          controller.close();
        } catch (error) {
          console.error('Error in stream processing:', error);
          controller.error(error instanceof Error ? error.message : String(error));
        }
      }
    });

    console.log('Returning stream response');
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ 
      error: 'An error occurred while processing the chat',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

async function fetchAPIResponse(apiKey: { type: string; key: string }, systemPrompt: string, messages: Message[]) {
  console.log('Fetching API response');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  let body: any = {};

  if (apiKey.type === 'Claude') {
    headers['x-api-key'] = apiKey.key;
    headers['anthropic-version'] = '2023-06-01';
    headers["anthropic-beta"] = "max-tokens-3-5-sonnet-2024-07-15";
    body = {
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 8192,
      system: systemPrompt,
      messages: messages,
      stream: true
    };
    console.log('Sending request to Claude API:', JSON.stringify(body, null, 2));
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error response:', errorText);
      throw new Error(`Claude API request failed with status ${response.status}: ${errorText}`);
    }

    return response;
  } else if (apiKey.type === 'OpenAI') {
    headers['Authorization'] = `Bearer ${apiKey.key}`;
    body = {
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 4096,
      stream: true
    };
    console.log('Sending request to OpenAI API:', JSON.stringify(body, null, 2));
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API request failed with status ${response.status}: ${errorText}`);
    }

    return response;
  } else {
    console.error('Unsupported API type:', apiKey.type);
    throw new Error('Unsupported API type');
  }
}

async function getProjectFiles(projectDir: string): Promise<string> {
  console.log('Getting project files');
  const superheroFilesDir = getProjectFilesDir(projectDir);
  const structureFile = path.join(superheroFilesDir, 'project-structure.txt');
  const contentFile = path.join(superheroFilesDir, 'project-content.txt');

  let projectFiles = '';

  if (fs.existsSync(structureFile)) {
    projectFiles += `${fs.readFileSync(structureFile, 'utf-8')}\n\n`;
  }

  if (fs.existsSync(contentFile)) {
    projectFiles += `${fs.readFileSync(contentFile, 'utf-8')}`;
  }

  console.log('Project files loaded');
  return projectFiles;
}

async function exportChatLog(projectDir: string, messages: Message[]) {
  console.log('Exporting chat log');
  const backupsDir = getProjectBackupsDir(projectDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFileName = `chat_log_${timestamp}.txt`;
  const logFilePath = path.join(process.cwd(), backupsDir, logFileName);

  const logContent = messages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');

  fs.writeFileSync(logFilePath, logContent);
  console.log(`Chat log exported to: ${logFilePath}`);
}