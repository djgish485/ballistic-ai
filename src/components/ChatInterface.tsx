import React, { useState, useEffect, useRef } from 'react';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import { useScrollHandler } from '../hooks/useScrollHandler';
import { createBackup, sendChatMessage, restoreBackup } from '../utils/chatApi';
import { Message, SystemMessage } from '../types/chat';

interface ChatInterfaceProps {
  projectDir: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ projectDir }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { userScrolledUp, chatEndRef, scrollToBottom } = useScrollHandler();

  useEffect(() => {
    if (!userScrolledUp) {
      scrollToBottom();
    }
  }, [messages, userScrolledUp, scrollToBottom]);

  const processStreamResponse = async (response: Response) => {
    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let currentContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              currentContent += data.content;
              setMessages((prev) => {
                const newMessages = [...prev];
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                  newMessages[newMessages.length - 1].content = currentContent;
                } else {
                  newMessages.push({ role: 'assistant', content: currentContent });
                }
                return newMessages;
              });
            } else if (data.conversationHistory) {
              setMessages(data.conversationHistory);
            }
          } catch (error) {
            console.error('Error parsing JSON:', error);
          }
        }
      }
    }
  };

  const handleStart = async () => {
    setIsStarted(true);
    setMessages([]);
    setIsLoading(true);
    setIsAIResponding(true);

    try {
      const backupResult = await createBackup(projectDir);
      if (backupResult.success) {
        setHasBackup(true);
        setSystemMessages((prev) => [...prev, { type: 'backup', content: backupResult.message }]);
      } else {
        throw new Error(backupResult.error);
      }

      const response = await sendChatMessage(projectDir, '', true, [], sessionStorage.getItem('selectedAPIKeyIndex'));
      await processStreamResponse(response);
    } catch (error) {
      console.error('Error starting chat:', error);
      setMessages([{ role: 'assistant', content: 'An error occurred while starting the chat.' }]);
    } finally {
      setIsLoading(false);
      setIsAIResponding(false);
    }
  };

  const handleSend = async () => {
    if (input.trim() && !isLoading) {
      const userMessage: Message = { role: 'user', content: input };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      setIsAIResponding(true);

      try {
        const response = await sendChatMessage(projectDir, input, false, messages, sessionStorage.getItem('selectedAPIKeyIndex'));
        await processStreamResponse(response);
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'An error occurred while processing your message.' },
        ]);
      } finally {
        setIsLoading(false);
        setIsAIResponding(false);
      }
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsAIResponding(false);
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!hasBackup) return;

    const confirmed = window.confirm(
      'Are you sure you want to restore the project to the latest backup? This will replace your current project with the backup.'
    );
    if (!confirmed) return;

    const result = await restoreBackup(projectDir);
    if (result.success) {
      setMessages([]);
      setIsStarted(false);
      setHasBackup(false);
      setSystemMessages((prev) => [
        ...prev,
        {
          type: 'restore',
          content: 'Project restored successfully. You can start a new analysis by clicking the "Start" button.',
        },
      ]);
    } else {
      setSystemMessages((prev) => [
        ...prev,
        { type: 'restore', content: `Error restoring backup: ${result.error}` },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex space-x-2">
        <button
          onClick={handleStart}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          disabled={isLoading}
        >
          {isStarted ? 'Next feature/fix' : 'Start'}
        </button>
        {hasBackup && (
          <button
            onClick={handleRestore}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
            disabled={isLoading}
          >
            Undo All & Restore Backup
          </button>
        )}
      </div>
      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-100 rounded">
        <ChatMessages systemMessages={systemMessages} messages={messages} />
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 bg-gray-200 rounded-b">
        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          handleCancel={handleCancel}
          isLoading={isLoading}
          isAIResponding={isAIResponding}
        />
      </div>
    </div>
  );
};

export default ChatInterface;