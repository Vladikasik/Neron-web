import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { X, Minimize2, Send, Copy, Terminal, Bot, User, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConsoleMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'mcp_tool' | 'error';
  content: string;
  timestamp: Date;
  toolName?: string;
  isError?: boolean;
  metadata?: Record<string, unknown>;
}

interface ConsoleProps {
  isVisible: boolean;
  onToggle: () => void;
  onSendMessage?: (message: string) => Promise<string>;
  className?: string;
}

export interface ConsoleRef {
  addMessage: (message: Omit<ConsoleMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  focus: () => void;
}

const Console = forwardRef<ConsoleRef, ConsoleProps>(({
  isVisible,
  onToggle,
  onSendMessage,
  className
}, ref) => {
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const consoleRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    addMessage: (message: Omit<ConsoleMessage, 'id' | 'timestamp'>) => {
      const newMessage: ConsoleMessage = {
        ...message,
        id: Date.now().toString() + Math.random().toString(36),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
    },
    clearMessages: () => {
      setMessages([]);
    },
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Update position when window resizes
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 400),
        y: Math.min(prev.y, window.innerHeight - 200)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse handlers for dragging
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
      setPosition({
        x: Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 400)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 200))
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

  const handleSendMessage = async () => {
    if (!input.trim() || !onSendMessage || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: userMsgId,
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    try {
      // Send message and get response
      const response = await onSendMessage(userMessage);

      // Add assistant response
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
    } catch (error) {
      // Add error message
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'error',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getMessageIcon = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'user': return <User size={14} className="matrix-text" />;
      case 'assistant': return <Bot size={14} className="matrix-text" />;
      case 'system': return <Terminal size={14} className="matrix-text" />;
      case 'mcp_tool': return <CheckCircle size={14} className="text-blue-400" />;
      case 'error': return <AlertCircle size={14} className="text-red-400" />;
      default: return <Terminal size={14} className="matrix-text" />;
    }
  };

  const getMessageClass = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'user': return 'bg-primary/10 border-primary/20';
      case 'assistant': return 'bg-accent/10 border-accent/20';
      case 'system': return 'bg-muted/10 border-muted/20';
      case 'mcp_tool': return 'bg-blue-500/10 border-blue-500/20';
      case 'error': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-accent/5 border-accent/10';
    }
  };

  if (!isVisible) return null;

  if (isMinimized) {
    return (
      <div
        ref={consoleRef}
        className={cn(
          "fixed z-40 rounded-lg shadow-lg",
          "w-48 p-2 cursor-move",
          className
        )}
        style={{ 
          left: position.x, 
          top: position.y,
          backgroundColor: '#000',
          borderColor: '#00ff41',
          border: '1px solid #00ff41',
          color: '#00ff41'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="matrix-text" />
            <span className="text-sm font-medium matrix-text">Console</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 hover:bg-accent rounded matrix-text"
            >
              <Terminal size={12} />
            </button>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-accent rounded matrix-text"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={consoleRef}
      className={cn(
        "fixed z-40 rounded-lg shadow-xl",
        "w-96 h-80 max-w-[90vw] max-h-[60vh] flex flex-col",
        isDragging && "select-none",
        className
      )}
      style={{ 
        left: position.x, 
        top: position.y,
        backgroundColor: '#000',
        borderColor: '#00ff41',
        border: '1px solid #00ff41',
        color: '#00ff41'
      }}
    >
      {/* Header */}
      <div
        ref={dragRef}
        className="flex items-center justify-between p-3 border-b matrix-border cursor-move bg-accent/5"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Terminal size={16} className="matrix-text" />
          <h3 className="font-semibold matrix-text">Console</h3>
          <span className="text-xs text-muted-foreground">
            {messages.length} messages
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMessages([])}
            className="p-1 hover:bg-accent rounded matrix-text text-xs"
          >
            Clear
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-accent rounded matrix-text"
          >
            <Minimize2 size={14} />
          </button>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-accent rounded matrix-text"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 text-sm"
      >
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Terminal size={32} className="mx-auto mb-2 opacity-50" />
            <p>Console ready. Send a message to get started.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "p-3 rounded border",
                getMessageClass(message.type)
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {getMessageIcon(message.type)}
                  <span className="text-xs font-medium text-muted-foreground">
                    {message.type}
                    {message.toolName && ` (${message.toolName})`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={10} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(message.content)}
                    className="p-0.5 hover:bg-accent rounded"
                  >
                    <Copy size={10} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {message.content}
              </pre>
              {message.metadata && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    Metadata
                  </summary>
                  <pre className="text-xs text-muted-foreground mt-1">
                    {JSON.stringify(message.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="p-3 rounded border bg-accent/5 border-accent/10">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-matrix-green border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">AI is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t matrix-border">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Send a message to AI..."
            className="flex-1 px-3 py-2 bg-background border matrix-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
});

Console.displayName = 'Console';

export default Console; 