import { useState, useRef, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { X } from 'lucide-react';

export interface ConsoleMessage {
  type: 'user' | 'assistant' | 'system' | 'error' | 'tool' | 'mcp';
  content: string;
  timestamp?: Date;
  isError?: boolean;
  metadata?: {
    requestTime?: number;
    toolName?: string;
    responsePreview?: string;
  };
}

interface ConsoleProps {
  isVisible: boolean;
  onToggle: () => void;
  onSendMessage: (message: string) => Promise<string>;
  className?: string;
}

export interface ConsoleRef {
  addMessage: (message: ConsoleMessage) => void;
  focus: () => void;
  clear: () => void;
}

const Console = forwardRef<ConsoleRef, ConsoleProps>(({
  isVisible,
  onToggle,
  onSendMessage,
  className = ''
}, ref) => {
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 });
  
  // Tactical positioning with dragging
  const [position, setPosition] = useState({ x: 16, y: window.innerHeight - 320 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const consoleRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    addMessage: (message: ConsoleMessage) => {
      setMessages(prev => {
        const newMessage = { ...message, timestamp: new Date() };
        const updated = [...prev, newMessage];
        return updated.slice(-100);
      });
      setTimeout(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      }, 100);
    },
    focus: () => {
      inputRef.current?.focus();
    },
    clear: () => {
      setMessages([]);
    }
  }));

  // Dragging functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only allow dragging from the header, excluding buttons
    if (e.target instanceof HTMLElement) {
      // Don't drag on buttons
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        return;
      }
      
      // Only drag if clicking on the header area
      if (e.target === dragRef.current || dragRef.current?.contains(e.target as Node)) {
        setIsDragging(true);
        const rect = consoleRef.current?.getBoundingClientRect();
        if (rect) {
          setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          });
        }
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newPos = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      
      // Keep within bounds
      const maxX = window.innerWidth - 480;
      const maxY = window.innerHeight - 280;
      
      setPosition({
        x: Math.max(16, Math.min(newPos.x, maxX)),
        y: Math.max(16, Math.min(newPos.y, maxY))
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Command history navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  }, [commandHistory, historyIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setHistoryIndex(-1);

    // Track input tokens (rough estimate)
    const inputTokens = Math.ceil(userMessage.length / 4);
    setTokenUsage(prev => ({ ...prev, input: prev.input + inputTokens }));

    // Add to command history
    setCommandHistory(prev => [...prev, userMessage].slice(-50));

    // Handle built-in commands
    if (userMessage.toLowerCase() === 'clear') {
      setMessages([]);
      setTokenUsage({ input: 0, output: 0 });
      setIsLoading(false);
      return;
    }

    if (userMessage.toLowerCase() === 'help') {
      const helpMessage = 'Neron Chat commands: clear, help, status. Ask questions about the graph.';
      setMessages(prev => [...prev, {
        type: 'system',
        content: helpMessage,
        timestamp: new Date()
      }]);
      const outputTokens = Math.ceil(helpMessage.length / 4);
      setTokenUsage(prev => ({ ...prev, output: prev.output + outputTokens }));
      setIsLoading(false);
      return;
    }

    setMessages(prev => [...prev, {
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    try {
      const response = await onSendMessage(userMessage);
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
      // Track output tokens
      const outputTokens = Math.ceil(response.length / 4);
      setTokenUsage(prev => ({ ...prev, output: prev.output + outputTokens }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'UNKNOWN ERROR';
      setMessages(prev => [...prev, {
        type: 'error',
        content: errorMessage,
        timestamp: new Date(),
        isError: true
      }]);
      const outputTokens = Math.ceil(errorMessage.length / 4);
      setTokenUsage(prev => ({ ...prev, output: prev.output + outputTokens }));
    } finally {
      setIsLoading(false);
    }
  };

  const getMessageTypeColor = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'user': return 'tactical-text-secondary';
      case 'assistant': return 'tactical-text-primary';
      case 'system': return 'tactical-text-accent';
      case 'error': return 'text-red-400';
      case 'tool': return 'tactical-text-secondary';
      case 'mcp': return 'tactical-text-primary';
      default: return 'tactical-text';
    }
  };

  const getMessagePrefix = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'user': return 'USER';
      case 'assistant': return 'AI';
      case 'system': return 'SYS';
      case 'error': return 'ERR';
      case 'tool': return 'TOOL';
      case 'mcp': return 'MCP';
      default: return 'MSG';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={consoleRef}
      className={`tactical-console ${isDragging ? 'tactical-dragging' : ''} ${className}`}
      style={{
        left: position.x,
        top: position.y
      }}
    >
      {/* Header */}
      <div
        ref={dragRef}
        className="tactical-console-header tactical-no-select"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="tactical-text tactical-text-primary">
            NERON CHAT
          </span>
          <span className="tactical-text tactical-text-dim tactical-text-xs">
            {tokenUsage.input + tokenUsage.output}T
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMessages([])}
            className="tactical-button tactical-text-xs px-2 py-1"
            title="Clear Console"
          >
            CLR
          </button>
          <button
            onClick={onToggle}
            className="tactical-button tactical-text-xs px-2 py-1"
            title="Close Console"
          >
            <X size={8} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="tactical-console-content">
        {messages.length === 0 && (
          <div className="text-center tactical-text-dim py-4">
            <div className="tactical-text-sm">Neron Chat Ready</div>
            <div className="tactical-text-xs mt-1">Type 'help' for commands</div>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div key={index} className="tactical-console-message">
            <div className="tactical-console-message-type">
              {getMessagePrefix(message.type)}
            </div>
            <div className={`tactical-console-message-content ${getMessageTypeColor(message.type)}`}>
              {message.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="tactical-console-message">
            <div className="tactical-console-message-type">
              AI
            </div>
            <div className="tactical-console-message-content tactical-text-primary">
              PROCESSING...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="tactical-console-input">
        <div className="tactical-console-prompt">
          &gt;
        </div>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="enter command..."
          disabled={isLoading}
          className="tactical-console-input input"
          autoComplete="off"
        />
        {isLoading && (
          <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin"></div>
        )}
      </form>
    </div>
  );
});

Console.displayName = 'Console';

export default Console; 