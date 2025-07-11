import { useState, useRef, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { X, Terminal } from 'lucide-react';

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

    // Add to command history
    setCommandHistory(prev => [...prev, userMessage].slice(-50));

    // Handle built-in commands
    if (userMessage.toLowerCase() === 'clear') {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    if (userMessage.toLowerCase() === 'help') {
      setMessages(prev => [...prev, {
        type: 'system',
        content: 'TACTICAL CONSOLE COMMANDS: clear, help, status. Ask questions about the graph.',
        timestamp: new Date()
      }]);
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
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: error instanceof Error ? error.message : 'UNKNOWN ERROR',
        timestamp: new Date(),
        isError: true
      }]);
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!isVisible) return null;

  return (
    <div
      ref={consoleRef}
      className={`tactical-console ${isDragging ? 'tactical-dragging' : ''} ${className}`}
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        ref={dragRef}
        className="tactical-console-header tactical-no-select"
      >
        <div className="flex items-center gap-2">
          <Terminal size={12} className="tactical-text-primary" />
          <span className="tactical-text tactical-text-primary">
            TACTICAL CONSOLE
          </span>
          <span className="tactical-text tactical-text-dim tactical-text-xs">
            [{messages.length}]
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
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="tactical-console-content">
        {messages.length === 0 && (
          <div className="text-center tactical-text-dim py-8">
            <Terminal size={24} className="mx-auto mb-2 opacity-50" />
            <div className="tactical-text-sm">TACTICAL CONSOLE READY</div>
            <div className="tactical-text-xs mt-1">TYPE 'HELP' FOR COMMANDS</div>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div key={index} className="tactical-console-message">
            <div className="tactical-console-message-time">
              {message.timestamp ? formatTime(message.timestamp) : ''}
            </div>
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
            <div className="tactical-console-message-time">
              {formatTime(new Date())}
            </div>
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
          placeholder="ENTER COMMAND..."
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