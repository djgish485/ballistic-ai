import { NextRequest, NextResponse } from 'next/server';
import { getProjectFiles } from '@/utils/projectUtils';
import { getSelectedAPIKey, readAPIKeys } from '@/utils/apiKeyManager';
import { fetchAPIResponse } from '@/utils/apiResponseHandler';
import { getInitialPrompt, constructInitialMessage, constructServerMessages } from '@/utils/messageProcessor';
import { createResponseStream } from '@/utils/streamHandler';
import { Message } from '@/types/chat';

export async function POST(req: NextRequest) {
  console.log('chat-with-images: Received POST request');
  try {
    const formData = await req.formData();
    console.log('chat-with-images: FormData keys:', [...formData.keys()]);

    const projectDir = formData.get('projectDir') as string;
    const message = formData.get('message') as string;
    const isInitial = formData.get('isInitial') === 'true';
    const conversationHistory = JSON.parse(formData.get('conversationHistory') as string) as Message[];
    const selectedAPIKeyIndex = formData.get('selectedAPIKeyIndex') as string;

    console.log('chat-with-images: Parsed form data:', { projectDir, message, isInitial, selectedAPIKeyIndex });
    console.log('chat-with-images: Conversation history length:', conversationHistory.length);

    if (!projectDir) {
      console.error('chat-with-images: Project directory is missing');
      return NextResponse.json({ error: 'Project directory is required' }, { status: 400 });
    }

    let apiKey = selectedAPIKeyIndex !== null && selectedAPIKeyIndex !== ''
      ? readAPIKeys().keys[parseInt(selectedAPIKeyIndex)]
      : getSelectedAPIKey();

    if (!apiKey) {
      console.error('chat-with-images: No API key selected');
      throw new Error('No API key selected');
    }

    // Collect received images
    const images: File[] = [];
    for (let i = 0; i < 10; i++) { // Assuming a maximum of 10 images
      const image = formData.get(`image${i}`) as File | null;
      if (image && image instanceof File) {
        images.push(image);
      } else {
        break;
      }
    }
    console.log(`chat-with-images: Received ${images.length} images:`);
    images.forEach((image, index) => {
      console.log(`chat-with-images: Image ${index + 1}: ${image.name} (${image.size} bytes)`);
    });

    const initialPrompt = getInitialPrompt();
    const projectFiles = await getProjectFiles(projectDir);
    const systemPrompt = initialPrompt;
    const initialMessage = constructInitialMessage(projectFiles);

    const serverMessages = constructServerMessages(isInitial, initialMessage, conversationHistory, message);
    console.log('chat-with-images: Server messages constructed:', serverMessages.length);

    console.log('chat-with-images: Fetching API response');
    const apiResponse = await fetchAPIResponse(apiKey, systemPrompt, serverMessages, images);

    console.log('chat-with-images: Creating response stream');
    const stream = createResponseStream(apiKey, apiResponse, (messages: Message[]) => {
      console.log('chat-with-images: Messages updated:', messages.length);
    });

    console.log('chat-with-images: Returning stream response');
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat with images API:', error);
    return NextResponse.json({ 
      error: 'An error occurred while processing the chat with images',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
