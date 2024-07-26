import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import DiffScreen from './DiffScreen';
import { Message, SystemMessage } from '@/types/chat';

interface ChatInterfaceProps {
  projectDir: string;
  isStarted: boolean;
  hasBackup: boolean;
  onStart: () => void;
  onRestore: () => void;
  systemMessages: SystemMessage[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  projectDir, 
  isStarted, 
  hasBackup, 
  onStart, 
  onRestore, 
  systemMessages 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastScrollTop = useRef(0);
  const [showDiff, setShowDiff] = useState(false);
  const [diffCommand, setDiffCommand] = useState('');
  const isAutoScrolling = useRef(false);

  useEffect(() => {
    console.log('ChatInterface: Props updated', { projectDir, isStarted, hasBackup, systemMessages });
  }, [projectDir, isStarted, hasBackup, systemMessages]);

  useEffect(() => {
    if (isStarted && messages.length === 0) {
      console.log('ChatInterface: Project started, initiating chat');
      initiateChat();
    }
  }, [isStarted, messages.length]);

  useEffect(() => {
    const updateInputPosition = () => {
      if (chatContainerRef.current && inputContainerRef.current) {
        const rect = chatContainerRef.current.getBoundingClientRect();
        inputContainerRef.current.style.width = `${rect.width}px`;
        inputContainerRef.current.style.left = `${rect.left}px`;
      }
    };

    updateInputPosition();
    window.addEventListener('resize', updateInputPosition);

    return () => {
      window.removeEventListener('resize', updateInputPosition);
    };
  }, []);

  const getCurrentApiType = (): 'Claude 3.5 Sonnet' | 'GPT-4o' => {
    const selectedAPIKeyType = sessionStorage.getItem('selectedAPIKeyType');
    return selectedAPIKeyType === 'OpenAI' ? 'GPT-4o' : 'Claude 3.5 Sonnet';
  };

  const initiateChat = async () => {
    console.log('ChatInterface: Initiating chat');
    setIsLoading(true);
    setIsAIResponding(true);

    try {
      console.log('ChatInterface: Starting backup process');
      setIsBackupInProgress(true);
      const backupResponse = await fetch('/api/project-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir }),
      });
      if (backupResponse.ok) {
        console.log('ChatInterface: Backup process completed');
        setIsBackupInProgress(false);
      } else {
        console.error('ChatInterface: Failed to initiate backup');
        setIsBackupInProgress(false);
      }

      console.log('ChatInterface: Sending initial chat request');
      abortControllerRef.current = new AbortController();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectDir, 
          isInitial: true, 
          conversationHistory: [],
          selectedAPIKeyIndex: sessionStorage.getItem('selectedAPIKeyIndex')
        }),
        signal: abortControllerRef.current.signal,
      });

      console.log('ChatInterface: Initial chat response received');
      await processStreamResponse(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('ChatInterface: Request was cancelled');
      } else {
        console.error('ChatInterface: Error starting chat:', error);
      }
    } finally {
      setIsLoading(false);
      setIsAIResponding(false);
      abortControllerRef.current = null;
    }
  };

  const scrollToBottom = useCallback(() => {
    if (chatEndRef.current) {
      isAutoScrolling.current = true;
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        isAutoScrolling.current = false;
      }, 100);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (isAutoScrolling.current) return;

    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    const isScrollingUp = scrollTop < lastScrollTop.current;
    const isScrolledToBottom = scrollTop + windowHeight >= documentHeight - 1;
    
    if (isScrollingUp && !isScrolledToBottom) {
      setUserScrolledUp(true);
    } else if (isScrolledToBottom) {
      setUserScrolledUp(false);
    }
    
    lastScrollTop.current = scrollTop;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    if (!userScrolledUp) {
      scrollToBottom();
    }
  }, [messages, systemMessages, userScrolledUp, scrollToBottom]);

  const processStreamResponse = async (response: Response) => {
    console.log('ChatInterface: Processing stream response');
    if (!response.body) {
      console.error('ChatInterface: No response body');
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let currentContent = '';

    setMessages((prev) => [...prev, { 
      role: 'assistant', 
      content: '', 
      isComplete: false,
      apiType: getCurrentApiType()
    }]);

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
                newMessages[newMessages.length - 1] = {
                  ...newMessages[newMessages.length - 1],
                  content: currentContent,
                };
                return newMessages;
              });
            } else if (data.conversationHistory) {
              setMessages(data.conversationHistory.map((msg: Message) => ({ 
                ...msg, 
                isComplete: true,
                apiType: getCurrentApiType()
              })));
              return;
            }
          } catch (error) {
            console.error('ChatInterface: Error parsing JSON:', error);
          }
        }
      }
    }
    console.log('ChatInterface: Stream processing completed');
    
    setMessages((prev) => {
      const newMessages = [...prev];
      newMessages[newMessages.length - 1] = {
        ...newMessages[newMessages.length - 1],
        isComplete: true,
      };
      return newMessages;
    });
  };

  const handleSend = async (images: File[]) => {
    if (input.trim() || images.length > 0) {
      console.log('ChatInterface: Sending message:', input);
      console.log('ChatInterface: Number of images:', images.length);
      images.forEach((image, index) => {
        console.log(`ChatInterface: Image ${index + 1}:`, image.name, image.type, image.size);
      });

      const userMessage: Message = { 
        role: 'user', 
        content: input, 
        images,
        isComplete: true,
        apiType: getCurrentApiType()
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      setIsAIResponding(true);

      try {
        abortControllerRef.current = new AbortController();

        const formData = new FormData();
        formData.append('projectDir', projectDir);
        formData.append('message', input);
        formData.append('isInitial', 'false');
        formData.append('conversationHistory', JSON.stringify(messages.map(msg => ({
          ...msg,
          images: undefined // We'll handle images separately
        }))));
        formData.append('selectedAPIKeyIndex', sessionStorage.getItem('selectedAPIKeyIndex') || '');
        
        // Append all images from all messages
        messages.forEach((msg, msgIndex) => {
          msg.images?.forEach((image, imgIndex) => {
            formData.append(`image_${msgIndex}_${imgIndex}`, image);
          });
        });
        // Append new images
        images.forEach((image, index) => {
          formData.append(`image_${messages.length}_${index}`, image);
        });

        console.log('ChatInterface: Sending request to /api/chat-with-images');
        console.log('ChatInterface: FormData keys:', [...formData.keys()]);

        const response = await fetch('/api/chat-with-images', {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        console.log('ChatInterface: Response status:', response.status);
        await processStreamResponse(response);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('ChatInterface: Request was cancelled');
        } else {
          console.error('ChatInterface: Error sending message:', error);
        }
      } finally {
        setIsLoading(false);
        setIsAIResponding(false);
        abortControllerRef.current = null;
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

  const handleDiff = (command: string) => {
    setDiffCommand(command);
    setShowDiff(true);
  };

  return (
    <div className="flex flex-col h-full" ref={chatContainerRef}>
      <div className="flex-grow overflow-y-auto space-y-4 pb-24">
        {isBackupInProgress && (
          <div className="bg-yellow-100 p-2 rounded">
            Backup in progress...
          </div>
        )}
        <ChatMessages 
          systemMessages={systemMessages} 
          messages={messages} 
          onDiff={handleDiff}
        />
        <div ref={chatEndRef} />
      </div>
      <div 
        ref={inputContainerRef}
        className="fixed bottom-0 bg-gray-100 pb-6 z-10"
        style={{ width: '100%' }}
      >
        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          handleCancel={handleCancel}
          isLoading={isLoading}
          isAIResponding={isAIResponding}
        />
      </div>
      {showDiff && (
        <DiffScreen
          command={diffCommand}
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;
