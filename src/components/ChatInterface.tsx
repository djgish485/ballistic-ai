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
  setIsStarted: (isStarted: boolean) => void;
}

interface ErrorDetails {
  message: string;
  type?: string;
  details?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  projectDir, 
  isStarted, 
  hasBackup, 
  onStart, 
  onRestore, 
  systemMessages,
  setIsStarted
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
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
  const [diffFilePath, setDiffFilePath] = useState('');
  const [diffNewContent, setDiffNewContent] = useState('');
  const isAutoScrolling = useRef(false);
  const messageLogFileNameRef = useRef<string>('');
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);

  useEffect(() => {
    if (isStarted && messages.length === 0) {
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

  useEffect(() => {
    messageLogFileNameRef.current = `message_log_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const getCurrentApiType = (): 'Claude 3.5 Sonnet' | 'GPT-4o' => {
    const selectedAPIKeyType = sessionStorage.getItem('selectedAPIKeyType');
    return selectedAPIKeyType === 'OpenAI' ? 'GPT-4o' : 'Claude 3.5 Sonnet';
  };

  const saveMessageLog = async () => {
    try {
      const response = await fetch('/api/save-message-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir, messages: messagesRef.current, fileName: messageLogFileNameRef.current }),
      });

      if (!response.ok) {
        throw new Error('Failed to save message log');
      }
    } catch (error) {
      console.error('Error saving message log:', error);
    }
  };

  const initiateChat = async () => {
    setIsLoading(true);
    setIsAIResponding(true);
    setErrorDetails(null);

    try {
      setIsBackupInProgress(true);
      const backupResponse = await fetch('/api/project-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir }),
      });
      if (backupResponse.ok) {
        setIsBackupInProgress(false);
      } else {
        setIsBackupInProgress(false);
      }

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

      await processStreamResponse(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled
      } else {
        console.error('Error starting chat:', error);
        setErrorDetails({
          message: 'An error occurred while initiating the chat',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
        setIsStarted(false);  // Reset to show the "Start" button again
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
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Unknown error occurred');
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let currentContent = '';

    setMessages((prev) => {
      const newMessages = [...prev, { 
        role: 'assistant', 
        content: '', 
        isComplete: false,
        apiType: getCurrentApiType()
      }];
      messagesRef.current = newMessages;
      return newMessages;
    });

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
                messagesRef.current = newMessages;
                return newMessages;
              });
            } else if (data.conversationHistory) {
              const newMessages = data.conversationHistory.map((msg: Message) => ({ 
                ...msg, 
                isComplete: true,
                apiType: getCurrentApiType()
              }));
              setMessages(newMessages);
              messagesRef.current = newMessages;
              return;
            }
          } catch (error) {
            console.error('Error parsing JSON:', error);
          }
        }
      }
    }
    
    setMessages((prev) => {
      const newMessages = [...prev];
      newMessages[newMessages.length - 1] = {
        ...newMessages[newMessages.length - 1],
        isComplete: true,
      };
      messagesRef.current = newMessages;
      return newMessages;
    });

    await saveMessageLog();
  };

  const handleSend = async (images: File[]) => {
    if (input.trim() || images.length > 0) {
      const userMessage: Message = {
        role: 'user',
        content: input,
        images,
        isComplete: true,
        apiType: getCurrentApiType(),
      };

      // Immediately add the user message to the chat interface
      setMessages(prev => [...prev, userMessage]);
      messagesRef.current = [...messagesRef.current, userMessage];

      setInput('');
      setIsLoading(true);
      setIsAIResponding(true);
      setErrorDetails(null);

      try {
        abortControllerRef.current = new AbortController();

        const formData = new FormData();
        formData.append('projectDir', projectDir);
        formData.append('message', userMessage.content);
        formData.append('isInitial', 'false');
        formData.append('conversationHistory', JSON.stringify(messagesRef.current));
        formData.append('selectedAPIKeyIndex', sessionStorage.getItem('selectedAPIKeyIndex') || '');

        messagesRef.current.forEach((msg, msgIndex) => {
          msg.images?.forEach((image, imgIndex) => {
            formData.append(`image_${msgIndex}_${imgIndex}`, image);
          });
        });

        const response = await fetch('/api/chat-with-images', {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        await processStreamResponse(response);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was cancelled
        } else {
          console.error('Error sending message:', error);
          let errorMessage = 'An error occurred while processing the chat with images';
          let errorType = '';
          let errorDetails = '';

          if (error instanceof Error) {
            errorMessage = error.message;
            if (error.message.includes('Claude API request failed')) {
              const match = error.message.match(/\{.*\}/);
              if (match) {
                try {
                  const errorObj = JSON.parse(match[0]);
                  errorType = errorObj.error?.type || '';
                  errorDetails = errorObj.error?.message || '';
                } catch (parseError) {
                  console.error('Error parsing error message:', parseError);
                }
              }
            }
          }

          setErrorDetails({
            message: errorMessage,
            type: errorType,
            details: errorDetails
          });
          // Simulate edit message action
          handleEditMessage(messagesRef.current.length - 1, userMessage.content);
        }
      } finally {
        setIsLoading(false);
        setIsAIResponding(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleEditMessage = (index: number, newContent: string) => {
    setMessages((prevMessages) => {
      // Remove all messages from the edited message onwards
      const newMessages = prevMessages.slice(0, index);
      messagesRef.current = newMessages;
      return newMessages;
    });

    // Set the input to the edited message content
    setInput(newContent);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsAIResponding(false);
      setIsLoading(false);
    }
  };

  const handleDiff = (filePath: string, newContent: string) => {
    setDiffFilePath(filePath);
    setDiffNewContent(newContent);
    setShowDiff(true);
  };

  const handleEditCommand = useCallback((oldCommand: string, newCommand: string) => {
    setMessages(prevMessages => {
      const newMessages = prevMessages.map(message => {
        if (message.role === 'assistant') {
          const updatedContent = message.content.replace(oldCommand, newCommand);
          return { ...message, content: updatedContent };
        }
        return message;
      });
      messagesRef.current = newMessages;
      return newMessages;
    });
  }, []);

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
          onEditMessage={handleEditMessage}
          onEditCommand={handleEditCommand}
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
          filePath={diffFilePath}
          newContent={diffNewContent}
          onClose={() => setShowDiff(false)}
        />
      )}
      {errorDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Error</h2>
            <p className="mb-2"><strong>Message:</strong> {errorDetails.message}</p>
            {errorDetails.type && <p className="mb-2"><strong>Type:</strong> {errorDetails.type}</p>}
            {errorDetails.details && (
              <div className="mb-2">
                <strong>Details:</strong>
                <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                  {errorDetails.details}
                </pre>
              </div>
            )}
            <button 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => setErrorDetails(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;