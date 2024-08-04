import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseCommand } from '@/utils/commandParser';
import { PencilIcon } from '@heroicons/react/24/solid';
import EditCodePopup from './EditCodePopup';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface FormattedMessageProps {
  content: string;
  onDiff: (filePath: string, newContent: string) => void;
  role: 'user' | 'assistant';
  isComplete: boolean;
  onEditCommand: (oldCommand: string, newCommand: string) => void;
  messageIndex: number;
  projectDir: string;
}

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: React.ReactNode;
  isNewFile: boolean;
  setIsNewFile: (isNew: boolean) => void;
  isRestored: boolean;
  setIsRestored: (isRestored: boolean) => void;
  isComplete: boolean;
  setExecutionResult: (id: string, result: string) => void;
  handleDiffClick: (filePath: string, newContent: string) => void;
  handleRestore: (filePath: string, originalContent: string) => Promise<void>;
  executionResults: Record<string, string>;
  originalFileContents: Record<string, string>;
  setOriginalFileContent: (key: string, content: string) => void;
  generateId: () => string;
  codeBlockIds: Record<number, string>;
  onEditCommand: (oldCommand: string, newCommand: string) => void;
  messageIndex: number;
  getPreviousLine: (nodeIndex: number) => string;
  fetchFileContent: (filePath: string) => Promise<string | false>;
  maxWidth: number;
  projectDir: string;
  executingBlockId: string | null;
  setExecutingBlockId: React.Dispatch<React.SetStateAction<string | null>>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
}

const CodeBlock: React.FC<CodeBlockProps> = React.memo(({ 
  node, 
  inline, 
  className, 
  children, 
  isNewFile,
  setIsNewFile,
  isRestored,
  setIsRestored,
  isComplete,
  setExecutionResult,
  handleDiffClick,
  handleRestore,
  executionResults,
  originalFileContents,
  setOriginalFileContent,
  generateId,
  codeBlockIds,
  onEditCommand,
  messageIndex,
  getPreviousLine,
  fetchFileContent,
  maxWidth,
  projectDir,
  executingBlockId,
  setExecutingBlockId,
  abortControllerRef,
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [canRestore, setCanRestore] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);
  const componentId = useRef(`CodeBlock-${Math.random().toString(36).substr(2, 9)}`);

  const nodeIndex = node.position?.start.line ?? Math.random();
  const id = codeBlockIds[nodeIndex] || generateId();
  if (!codeBlockIds[nodeIndex]) {
    codeBlockIds[nodeIndex] = id;
  }

  const isExecuting = executingBlockId === id;

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = (newContent: string) => {
    setIsEditing(false);
    onEditCommand(String(children), newContent);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  if (inline) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  } else {
    const previousLine = getPreviousLine(nodeIndex);
    const { filePath, newContent } = useMemo(() => parseCommand(String(children), previousLine), [children, previousLine]);

    const handleRestoreClick = async () => {
      if (filePath) {
        const key = `${messageIndex}-${id}`;
        const originalContent = originalFileContents[key];
        if (originalContent) {
          await handleRestore(filePath, originalContent);
          setIsRestored(true);
          setCanRestore(false);
        }
      }
    };

    const handleWrite = async () => {
      if (filePath && newContent !== null) {
        try {
          const key = `${messageIndex}-${id}`;
          let isNewlyCreated = false;
          if (!originalFileContents[key]) {
            const originalContent = await fetchFileContent(filePath);
            if (originalContent === false) {
              isNewlyCreated = true;
              setIsNewFile(true);
            } else {
              setOriginalFileContent(key, originalContent);
            }
          }

          const truncationPatterns = [
            /Rest of the file remains unchanged\.\.\./i,
            /# Rest of the script contents\.\.\./i,
            /\/\/ Rest of the function\.\.\./i,
            /\/\/ \.\.\. \(previous code remains unchanged\)/i,
            /\/\/ \.\.\. \(rest of the function remains unchanged\)/i,
            /\/\/ \.\.\. \(rest of the file remains unchanged\)/i,
            /\/\/ \.\.\. \(rest of the \w+ function remains unchanged\)/i,
            /\/\/ \.\.\. \(rest of the component code remains unchanged\)/i,
            /# Rest of the file content remains unchanged/i,
            /# \.\.\. \(rest of the file content remains unchanged\)/i
          ];

          const isTruncated = truncationPatterns.some(pattern => pattern.test(newContent));

          if (isTruncated) {
            const confirmMessage = `The code appears to be truncated. Would you like to proceed?\n\nRemind the AI to show the full file when making modifications.`;
            if (!window.confirm(confirmMessage)) {
              return;
            }
          }

          const response = await fetch('/api/write-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, content: newContent }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to write file');
          }
          
          setExecutionResult(id, `File ${filePath} ${isNewlyCreated ? 'created' : 'updated'} successfully.`);
          setCanRestore(true);
          
          if (isNewlyCreated) {
            setIsNewFile(true);
          }
        } catch (error) {
          setExecutionResult(id, `Error updating file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      setIsRestored(false);
    };

    const handleUndo = async () => {
      if (filePath) {
        try {
          const response = await fetch('/api/delete-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath }),
          });
          if (!response.ok) throw new Error('Failed to delete file');
          
          alert(`File ${filePath} deleted successfully.`);

          setIsNewFile(false);
          setIsRestored(true);
        } catch (error) {
          alert(`Error deleting file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    };

    const handleExecute = async () => {
      setExecutingBlockId(id);
      setExecutionResult(id, 'Waiting on response...');

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/execute-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: String(children), projectDir }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to execute code');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get response reader');
        }

        let result = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = new TextDecoder().decode(value);
          result += chunk;
          setExecutionResult(id, result);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setExecutionResult(id, 'Execution cancelled');
        } else {
          setExecutionResult(id, `Error executing code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } finally {
        setExecutingBlockId(null);
        abortControllerRef.current = null;
      }
      setIsRestored(false);
    };

    const handleCancelExecution = useCallback(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, [abortControllerRef]);

    useEffect(() => {
      const key = `${messageIndex}-${id}`;
      if (originalFileContents[key]) {
        setCanRestore(true);
      }
    }, [originalFileContents, messageIndex, id]);

    const language = className ? className.replace(/language-/, '') : 'text';

    return (
      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="overflow-x-auto" style={{ maxWidth: `${maxWidth}px` }}>
          <SyntaxHighlighter
            language={language}
            style={vs}
            customStyle={{
              backgroundColor: 'transparent',
              padding: '1rem',
              borderRadius: '0.5rem',
              width: `${maxWidth}px`,
            }}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
        {!isEditing && isHovered && (
          <div className="absolute top-2 right-2">
            <div className="p-1 rounded transition-colors duration-200 group hover:bg-blue-500">
              <PencilIcon
                className="h-6 w-6 text-gray-500 group-hover:text-white cursor-pointer"
                onClick={handleEditClick}
              />
            </div>
          </div>
        )}
        <EditCodePopup
          isOpen={isEditing}
          onClose={handleCancelClick}
          initialContent={String(children)}
          onSave={handleSaveClick}
        />
        {isComplete && !isEditing && (
          <>
            <div className="mt-2 space-x-2">
              {filePath ? (
                <>
                  <button
                    onClick={handleWrite}
                    className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Write
                  </button>
                  {newContent !== null && (
                    <button
                      onClick={() => handleDiffClick(filePath, newContent)}
                      className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Diff
                    </button>
                  )}
                  {isNewFile && (
                    <button
                      onClick={handleUndo}
                      className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Undo (Delete File)
                    </button>
                  )}
                  {canRestore && !isRestored && (
                    <button
                      onClick={handleRestoreClick}
                      className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Restore
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={handleExecute}
                    className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    disabled={isExecuting}
                  >
                    {isExecuting ? 'Executing...' : 'Execute'}
                  </button>
                  {isExecuting && (
                    <button
                      onClick={handleCancelExecution}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Cancel
                    </button>
                  )}
                </>
              )}
            </div>
            {!isRestored && executionResults[id] && (
              <div className="mt-2 bg-gray-100 p-2 rounded">
                <pre className="whitespace-pre-wrap overflow-x-auto">
                  {executionResults[id]}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
});

const FormattedMessage: React.FC<FormattedMessageProps> = React.memo(({ content, onDiff, role, isComplete, onEditCommand, messageIndex, projectDir }) => {
  const [executionResults, setExecutionResults] = useState<Record<string, string>>({});
  const [codeBlockIds] = useState<Record<number, string>>({});
  const [originalFileContents, setOriginalFileContents] = useState<Record<string, string>>({});
  const [newFiles, setNewFiles] = useState<Record<string, boolean>>({});
  const [restoredBlocks, setRestoredBlocks] = useState<Record<string, boolean>>({});
  const [maxWidth, setMaxWidth] = useState(0);
  const [executingBlockId, setExecutingBlockId] = useState<string | null>(null);
  const [, forceUpdate] = useState({});
  const mainColumnRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateId = useCallback(() => `code-${Math.random().toString(36).substr(2, 9)}`, []);

  const fetchFileContent = useCallback(async (filePath: string): Promise<string | false> => {
    const response = await fetch('/api/read-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return false;
      }
      throw new Error('Failed to fetch file content');
    }

    const data = await response.json();
    return data.content;
  }, []);

  const setExecutionResult = useCallback((id: string, result: string) => {
    setExecutionResults(prev => ({ ...prev, [id]: result }));
  }, []);

  const setOriginalFileContent = useCallback((key: string, content: string) => {
    setOriginalFileContents(prev => ({ ...prev, [key]: content }));
  }, []);

  const handleRestore = useCallback(async (filePath: string, originalContent: string) => {
    try {
      const response = await fetch('/api/restore-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content: originalContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to restore original content');
      }

      alert('File restored successfully');
    } catch (error) {
      alert('Failed to restore file content');
    }
  }, []);

  const handleDiffClick = useCallback((filePath: string, newContent: string) => {
    onDiff(filePath, newContent);
  }, [onDiff]);

  const getPreviousLine = useCallback((nodeIndex: number) => {
    const lines = content.split('\n');
    return lines[nodeIndex - 2] || '';
  }, [content]);

  const setIsNewFile = useCallback((filePath: string, isNew: boolean) => {
    setNewFiles(prev => ({ ...prev, [filePath]: isNew }));
  }, []);

  const updateMaxWidth = useCallback(() => {
    const windowWidth = window.innerWidth;
    const mainColumnWidth = mainColumnRef.current?.offsetWidth || 0;
    const newMaxWidth = Math.min(windowWidth * 0.9, mainColumnWidth);
    setMaxWidth(newMaxWidth);
    forceUpdate({});
  }, []);

  useEffect(() => {
    updateMaxWidth();
    window.addEventListener('resize', updateMaxWidth);

    return () => {
      window.removeEventListener('resize', updateMaxWidth);
    };
  }, [updateMaxWidth]);

  const memoizedCodeBlock = useMemo(() => {
    return (props: any) => {
      const { filePath } = parseCommand(String(props.children), getPreviousLine(props.node.position?.start.line));
      const isNewFile = filePath ? newFiles[filePath] || false : false;
      const blockId = `${messageIndex}-${props.node.position?.start.line}`;
      return (
        <CodeBlock
          {...props}
          isComplete={isComplete}
          setExecutionResult={setExecutionResult}
          handleDiffClick={handleDiffClick}
          handleRestore={handleRestore}
          executionResults={executionResults}
          originalFileContents={originalFileContents}
          setOriginalFileContent={setOriginalFileContent}
          generateId={generateId}
          codeBlockIds={codeBlockIds}
          onEditCommand={onEditCommand}
          messageIndex={messageIndex}
          getPreviousLine={getPreviousLine}
          fetchFileContent={fetchFileContent}
          isNewFile={isNewFile}
          setIsNewFile={(isNew: boolean) => filePath && setIsNewFile(filePath, isNew)}
          isRestored={restoredBlocks[blockId] || false}
          setIsRestored={(isRestored: boolean) => setRestoredBlocks(prev => ({ ...prev, [blockId]: isRestored }))}
          maxWidth={maxWidth}
          projectDir={projectDir}
          executingBlockId={executingBlockId}
          setExecutingBlockId={setExecutingBlockId}
          abortControllerRef={abortControllerRef}
        />
      );
    };
  }, [isComplete, setExecutionResult, handleDiffClick, handleRestore, executionResults, originalFileContents, setOriginalFileContent, generateId, codeBlockIds, onEditCommand, messageIndex, getPreviousLine, fetchFileContent, newFiles, setIsNewFile, restoredBlocks, maxWidth, projectDir, executingBlockId, setExecutingBlockId]);

  if (role === 'user') {
    return <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>;
  }

  return (
    <div ref={mainColumnRef}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h4>{children}</h4>,
          code: memoizedCodeBlock,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content &&
         prevProps.role === nextProps.role &&
         prevProps.isComplete === nextProps.isComplete &&
         prevProps.messageIndex === nextProps.messageIndex &&
         prevProps.projectDir === nextProps.projectDir;
});

FormattedMessage.displayName = 'FormattedMessage';

export default FormattedMessage;