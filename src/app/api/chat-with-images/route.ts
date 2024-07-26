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

    const projectDir = formData.get('projectDir');
    const message = formData.get('message') as string;
    const isInitial = formData.get('isInitial') === 'true';
    const conversationHistory = JSON.parse(formData.get('conversationHistory') as string) as Message[];
    const selectedAPIKeyIndex = formData.get('selectedAPIKeyIndex') as string;

    console.log('chat-with-images: Parsed form data:', { projectDir, message, isInitial, selectedAPIKeyIndex });
    console.log('chat-with-images: Conversation history length:', conversationHistory.length);

    if (!projectDir || typeof projectDir !== 'string') {
      console.error('chat-with-images: Invalid project directory:', projectDir);
      return NextResponse.json({ error: 'Invalid project directory' }, { status: 400 });
    }

    let apiKey = selectedAPIKeyIndex !== null && selectedAPIKeyIndex !== ''
      ? readAPIKeys().keys[parseInt(selectedAPIKeyIndex)]
      : getSelectedAPIKey();

    if (!apiKey) {
      console.error('chat-with-images: No API key selected');
      throw new Error('No API key selected');
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

    console.log('chat-with-images: Collected images for messages:', Object.keys(messageImages).length);

    // Attach images to the correct messages in the conversation history
    const updatedConversationHistory = conversationHistory.map((msg, index) => {
      if (messageImages[index.toString()]) {
        return { ...msg, images: messageImages[index.toString()] };
      }
      return msg;
    });

    // Add the new message with images
    updatedConversationHistory.push({
      role: 'user',
      content: message,
      images: messageImages[conversationHistory.length.toString()] || []
    });

    const initialPrompt = getInitialPrompt();
    const projectFiles = await getProjectFiles(projectDir);
    const systemPrompt = initialPrompt;
    const initialMessage = constructInitialMessage(projectFiles);

    const serverMessages = constructServerMessages(isInitial, initialMessage, updatedConversationHistory);
    console.log('chat-with-images: Server messages constructed:', serverMessages.length);

    console.log('chat-with-images: Fetching API response');
    const apiResponse = await fetchAPIResponse(apiKey, systemPrompt, serverMessages, projectDir);

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
