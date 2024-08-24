'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  showRestoreAlert: boolean;
  setShowRestoreAlert: (show: boolean) => void;
  isDynamicContext: boolean;
  updateFileList: () => void;
  setIsDynamicContext: (isDynamic: boolean) => void;
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
  setIsStarted,
  showRestoreAlert,
  setShowRestoreAlert,
  isDynamicContext,
  updateFileList,
  setIsDynamicContext
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
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
  const [initialMessage, setInitialMessage] = useState<string>('');
  const [isDynamicContextBuilding, setIsDynamicContextBuilding] = useState(false);
  const [dynamicContextFileCount, setDynamicContextFileCount] = useState<number | null>(null);
  const [showDynamicContextPrompt, setShowDynamicContextPrompt] = useState(false);
  const [showDynamicContextEnabledAlert, setShowDynamicContextEnabledAlert] = useState(false);

  useEffect(() => {
    const fetchInitialMessage = async () => {
      try {
        const response = await fetch('/initial_welcome_message.txt');
        const text = await response.text();
        setInitialMessage(text);
      } catch (error) {
        console.error('Error fetching initial message:', error);
      }
    };
    fetchInitialMessage();
  }, []);

  useEffect(() => {
    if (isStarted && messages.length === 0) {
      checkProjectSize();
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

  const checkProjectSize = async () => {
    try {
      const response = await fetch(`/api/list-files?projectDir=${encodeURIComponent(projectDir)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch file list');
      }
      const data = await response.json();
      const projectContentFile = data.files.find((file: any) => file.name === 'project-content.txt');
      if (projectContentFile && projectContentFile.size > 250 * 1024 && !isDynamicContext) {
        setShowDynamicContextPrompt(true);
      } else {
        initiateChat();
      }
    } catch (error) {
      console.error('Error checking project size:', error);
      initiateChat(); // Proceed with chat if there's an error
    }
  };

  const handleDynamicContextPrompt = async (enable: boolean) => {
    setShowDynamicContextPrompt(false);
    if (enable) {
      try {
        const response = await fetch('/api/save-dynamic-context', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectDir, isDynamicContext: true }),
        });

        if (!response.ok) {
          throw new Error('Failed to save Dynamic Context preference');
        }

        setIsDynamicContext(true);
        setIsStarted(false); // Reset start button
        setShowDynamicContextEnabledAlert(true);
      } catch (error) {
        console.error('Error saving Dynamic Context preference:', error);
        // Handle error (e.g., show an error message to the user)
      }
    } else {
      initiateChat();
    }
  };

  const initiateChat = async () => {
    setIsLoading(true);
    setIsAIResponding(true);
    setErrorDetails(null);
    setIsAddingFiles(true);

    try {
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

      setIsAddingFiles(false);

      const dynamicContextFiles = response.headers.get('X-Dynamic-Context-Files');
      let contextFileCount = null;
      if (dynamicContextFiles) {
        contextFileCount = parseInt(dynamicContextFiles, 10);
        setDynamicContextFileCount(contextFileCount);
      }

      const contextFiles = response.headers.get('X-Context-Files');
      let parsedContextFiles: string[] = [];
      if (contextFiles) {
        parsedContextFiles = JSON.parse(contextFiles);
      }

      await processStreamResponse(response, contextFileCount, parsedContextFiles);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled
      } else {
        console.error('Error starting chat:', error);
        setErrorDetails({
          message: 'An error occurred while initiating the chat',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
        setIsStarted(false);
      }
    } finally {
      setIsLoading(false);
      setIsAIResponding(false);
      setIsAddingFiles(false);
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

  const processStreamResponse = async (response: Response, contextFileCount: number | null, contextFiles: string[]) => {
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
      const newMessages: Message[] = [...prev, { 
        role: 'assistant', 
        content: '', 
        isComplete: false,
        apiType: getCurrentApiType(),
        dynamicContextFileCount: contextFileCount,
        contextFiles: contextFiles
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
        if (line.trim() === 'data: [DONE]') continue;
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
                apiType: getCurrentApiType(),
                dynamicContextFileCount: contextFileCount,
                contextFiles: contextFiles
              }));
              setMessages(newMessages);
              messagesRef.current = newMessages;
              return;
            }
          } catch (error) {
            // Error parsing JSON, but we'll silently ignore it
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

      setMessages(prev => [...prev, userMessage]);
      messagesRef.current = [...messagesRef.current, userMessage];

      setInput('');
      setIsLoading(true);
      setIsAIResponding(true);
      setErrorDetails(null);

      try {
        abortControllerRef.current = new AbortController();

        if (isDynamicContext) {
          setIsDynamicContextBuilding(true);
          setDynamicContextFileCount(null);
        }

        const formData = new FormData();
        formData.append('projectDir', projectDir);
        formData.append('message', userMessage.content);
        formData.append('isInitial', 'false');
        formData.append('conversationHistory', JSON.stringify(messagesRef.current));
        formData.append('selectedAPIKeyIndex', sessionStorage.getItem('selectedAPIKeyIndex') || '');
        formData.append('isDynamicContext', isDynamicContext.toString());

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

        setIsDynamicContextBuilding(false);
        
        const dynamicContextFiles = response.headers.get('X-Dynamic-Context-Files');
        let contextFileCount = null;
        if (dynamicContextFiles) {
          contextFileCount = parseInt(dynamicContextFiles, 10);
          setDynamicContextFileCount(contextFileCount);
        }

        const contextFiles = response.headers.get('X-Context-Files');
        let parsedContextFiles: string[] = [];
        if (contextFiles) {
          parsedContextFiles = JSON.parse(contextFiles);
        }

        await processStreamResponse(response, contextFileCount, parsedContextFiles);

        // Update file list after dynamic context is built
        if (isDynamicContext) {
          updateFileList();
        }
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
          handleEditMessage(messagesRef.current.length - 1, userMessage.content);
        }
      } finally {
        setIsLoading(false);
        setIsAIResponding(false);
        setIsDynamicContextBuilding(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleEditMessage = (index: number, newContent: string) => {
    if (isAIResponding) {
      handleCancel();
    }

    setMessages((prevMessages) => {
      const newMessages = prevMessages.slice(0, index);
      messagesRef.current = newMessages;
      return newMessages;
    });

    setInput(newContent);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsAIResponding(false);
      setIsLoading(false);
      setIsDynamicContextBuilding(false);
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

  const handleRestoreAlertClose = () => {
    setShowRestoreAlert(false);
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-full" ref={chatContainerRef}>
      <div className="flex-grow overflow-y-auto space-y-4 pb-24">
        {isBackupInProgress && (
          <div className="bg-yellow-100 dark:bg-yellow-800 p-2 rounded">
            Backup in progress...
          </div>
        )}
        {isAddingFiles && (
          <div className="bg-yellow-100 dark:bg-yellow-800 p-2 rounded">
            Adding files to context...
          </div>
        )}
        {!isStarted && initialMessage && (
          <div className="bg-blue-100 dark:bg-darkMessageBox p-4 rounded">
            <div className="whitespace-pre-wrap dark:text-darkText">{initialMessage}</div>
          </div>
        )}
        <ChatMessages 
          systemMessages={systemMessages.filter(msg => msg.type !== 'restore')} 
          messages={messages} 
          onDiff={handleDiff}
          onEditMessage={handleEditMessage}
          onEditCommand={handleEditCommand}
          projectDir={projectDir}
          dynamicContextFileCount={dynamicContextFileCount}
        />
        {isDynamicContextBuilding && (
          <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded">
            Dynamic context being built...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div 
        ref={inputContainerRef}
        className="fixed bottom-0 bg-gray-100 dark:bg-gray-800 pb-6 z-10"
        style={{ width: '100%' }}
      >
        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          handleCancel={handleCancel}
          isLoading={isLoading}
          isAIResponding={isAIResponding}
          disabled={!isStarted}
        />
      </div>
      {showDiff && (
        <DiffScreen
          filePath={diffFilePath}
          newContent={diffNewContent}
          onClose={() => setShowDiff(false)}
          projectDir={projectDir}
        />
      )}
      {errorDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-darkBox p-6 rounded-lg shadow-lg max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4 dark:text-darkText">Error</h2>
            <p className="mb-2 dark:text-darkText"><strong>Message:</strong> {errorDetails.message}</p>
            {errorDetails.type && <p className="mb-2 dark:text-darkText"><strong>Type:</strong> {errorDetails.type}</p>}
            {errorDetails.details && (
              <div className="mb-2">
                <strong className="dark:text-darkText">Details:</strong>
                <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1 overflow-x-auto dark:text-gray-200">
                  {errorDetails.details}
                </pre>
              </div>
            )}
            <button 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              onClick={() => setErrorDetails(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {showRestoreAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-darkBox p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 dark:text-darkText">Restore Successful</h2>
            <p className="mb-4 dark:text-darkText">Project has been restored successfully.</p>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              onClick={handleRestoreAlertClose}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {showDynamicContextPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-darkBox p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 dark:text-darkText">Large Project Detected</h2>
            <p className="mb-4 dark:text-darkText">
              The project content is larger than 250 KB. Would you like to enable Dynamic Context to optimize performance?
            </p>
            <div className="flex justify-end space-x-4">
              <button 
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                onClick={() => handleDynamicContextPrompt(false)}
              >
                No, proceed normally
              </button>
              <button 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                onClick={() => handleDynamicContextPrompt(true)}
              >
                Yes, enable Dynamic Context
              </button>
            </div>
          </div>
        </div>
      )}
      {showDynamicContextEnabledAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-darkBox p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 dark:text-darkText">Dynamic Context Enabled</h2>
            <p className="mb-4 dark:text-darkText">
              Dynamic context has been enabled. Click Start again to begin.
            </p>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              onClick={() => setShowDynamicContextEnabledAlert(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;