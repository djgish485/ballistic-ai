import { NextRequest, NextResponse } from 'next/server';
import { getProjectFiles } from '@/utils/projectUtils';
import { getSelectedAPIKey, readAPIKeys } from '@/utils/apiKeyManager';
import { fetchAPIResponse } from '@/utils/apiResponseHandler';
import { getInitialPrompt, constructInitialMessage, constructServerMessages } from '@/utils/messageProcessor';
import { createResponseStream } from '@/utils/streamHandler';
import { Message } from '@/types/chat';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const projectDir = formData.get('projectDir');
    const isInitial = formData.get('isInitial') === 'true';
    const conversationHistory = JSON.parse(formData.get('conversationHistory') as string) as Message[];
    const selectedAPIKeyIndex = formData.get('selectedAPIKeyIndex') as string;

    if (!projectDir || typeof projectDir !== 'string') {
      return NextResponse.json({ error: 'Invalid project directory' }, { status: 400 });
    }

    let apiKey = selectedAPIKeyIndex !== null && selectedAPIKeyIndex !== ''
      ? readAPIKeys().keys[parseInt(selectedAPIKeyIndex)]
      : getSelectedAPIKey();

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key selected' }, { status: 400 });
    }

    // Collect received images for all messages
    const messageImages: { [key: string]: File[] } = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        const [_, msgIndex, imgIndex] = key.split('_');
        if (!messageImages[msgIndex]) {
          messageImages[msgIndex] = [];
        }
        messageImages[msgIndex].push(value);
      }
    }

    // Attach images to the correct messages in the conversation history
    const updatedConversationHistory = conversationHistory.map((msg, index) => {
      if (messageImages[index.toString()]) {
        return { ...msg, images: messageImages[index.toString()] };
      }
      return msg;
    });

    const initialPrompt = getInitialPrompt();
    const projectFiles = await getProjectFiles(projectDir);
    const systemPrompt = initialPrompt;
    const initialMessage = constructInitialMessage(projectFiles);

    const serverMessages = constructServerMessages(isInitial, initialMessage, updatedConversationHistory);

    const apiResponse = await fetchAPIResponse(apiKey, systemPrompt, serverMessages, projectDir);

    const stream = createResponseStream(apiKey, apiResponse, (messages: Message[]) => {
      // Messages updated callback
    });

    let isCancelled = false;
    req.signal.addEventListener('abort', () => {
      isCancelled = true;
    });

    return new NextResponse(new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done || isCancelled) {
              break;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          // Error handling
        } finally {
          controller.close();
          reader.releaseLock();
        }
      }
    }), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    let errorMessage = 'An error occurred while processing the chat with images';
    let errorDetails = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('API request failed')) {
        const match = error.message.match(/\{.*\}/);
        if (match) {
          try {
            const errorObj = JSON.parse(match[0]);
            errorDetails = JSON.stringify(errorObj, null, 2);
          } catch (parseError) {
            // Error parsing error message
          }
        }
      }
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
}