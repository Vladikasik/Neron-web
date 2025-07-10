import { useState, useRef, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { X, Terminal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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

  
  // Enhanced positioning with better defaults
  const [position, setPosition] = useState({ x: 24, y: window.innerHeight - 320 });
  const [size, setSize] = useState({ width: 480, height: 280 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const consoleRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    addMessage: (message: ConsoleMessage) => {
      setMessages(prev => {
        const newMessage = { ...message, timestamp: new Date() };
        const updated = [...prev, newMessage];
        // Keep only last 100 messages for performance
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

  // Keep console within bounds
  const keepInBounds = useCallback((newPos: { x: number; y: number }, newSize: { width: number; height: number }) => {
    const maxX = window.innerWidth - newSize.width;
    const maxY = window.innerHeight - newSize.height;
    
    return {
      x: Math.max(8, Math.min(newPos.x, maxX)),
      y: Math.max(8, Math.min(newPos.y, maxY))
    };
  }, []);

  // Enhanced drag handlers
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
    if (isDragging && !isResizing) {
      const newPos = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      setPosition(keepInBounds(newPos, size));
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newSize = {
        width: Math.max(320, resizeStart.width + deltaX),
        height: Math.max(160, resizeStart.height + deltaY)
      };
      
      setSize(newSize);
      setPosition(prev => keepInBounds(prev, newSize));
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, keepInBounds, size]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
    e.preventDefault();
    e.stopPropagation();
  }, [size]);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Enhanced command history navigation
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
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Basic autocomplete for common commands
      const commonCommands = ['help', 'clear', 'status', 'nodes', 'connections', 'layers'];
      const matches = commonCommands.filter(cmd => cmd.startsWith(input.toLowerCase()));
      if (matches.length === 1) {
        setInput(matches[0]);
      }
    }
  }, [commandHistory, historyIndex, input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setHistoryIndex(-1);

    // Add to command history
    setCommandHistory(prev => {
      const updated = [...prev, userMessage];
      return updated.slice(-50); // Keep last 50 commands
    });

    // Handle built-in commands
    if (userMessage.toLowerCase() === 'clear') {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    if (userMessage.toLowerCase() === 'help') {
      setMessages(prev => [...prev, {
        type: 'system',
        content: 'Available commands: clear, help, status. Or ask questions about the graph.',
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
        content: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getMessageTypeInfo = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'user': 
        return { color: 'text-blue-400', icon: '❯', prefix: 'USER' };
      case 'assistant': 
        return { color: 'text-primary', icon: '●', prefix: 'AI' };
      case 'system': 
        return { color: 'text-warning', icon: '◦', prefix: 'SYS' };
      case 'error': 
        return { color: 'text-destructive', icon: '✗', prefix: 'ERR' };
      case 'tool': 
        return { color: 'text-info', icon: '⚡', prefix: 'TOOL' };
      case 'mcp': 
        return { color: 'text-primary', icon: '🔗', prefix: 'MCP' };
      default: 
        return { color: 'text-muted-foreground', icon: '◦', prefix: 'MSG' };
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

  const getMessagePreview = (content: string, maxLength: number = 80) => {
    return content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
  };

  if (!isVisible) return null;

  return (
    <Card
      ref={consoleRef}
      className={cn(
        'fixed z-50 matrix-terminal border-primary/30 shadow-xl shadow-primary/20',
        'backdrop-blur-md transition-all duration-300',
        isDragging && 'cursor-grabbing select-none',
        isResizing && 'select-none',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        minWidth: 320,
        minHeight: 160
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Enhanced Header */}
      <div
        ref={dragRef}
        className="flex items-center justify-between p-matrix-sm bg-accent/20 border-b border-primary/20 cursor-move"
      >
        <div className="flex items-center gap-matrix-xs">
          <Terminal size={12} className="text-primary matrix-text-glow" />
          <span className="text-matrix-sm font-matrix-semibold text-primary matrix-text-glow">
            NEURAL CONSOLE
          </span>
          <Badge variant="outline" className="text-matrix-2xs px-1 py-0 border-primary/30">
            {messages.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-matrix-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessages([])}
            className="btn-matrix h-5 w-5 p-0 hover:bg-warning/30"
            title="Clear Console"
          >
            <span className="text-matrix-2xs text-warning">CLR</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="btn-matrix h-5 w-5 p-0 hover:bg-destructive/30"
            title="Close Console"
          >
            <X size={8} className="text-destructive" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea 
        className="flex-1 p-matrix-sm"
        style={{ height: size.height - 100 }}
      >
            <div ref={messagesRef} className="space-y-matrix-xs">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground/60 text-matrix-xs py-matrix-lg">
                  <Terminal size={16} className="mx-auto mb-matrix-xs opacity-50" />
                  <div>Neural Console Ready</div>
                  <div className="text-matrix-2xs">Type 'help' for commands</div>
                </div>
              )}
              
              {messages.map((message, index) => {
                const typeInfo = getMessageTypeInfo(message.type);
                return (
                  <div key={index} className="group">
                    <div className="flex items-start gap-matrix-xs">
                      <div className="flex items-center gap-matrix-xs min-w-0 flex-shrink-0">
                        <span className="text-primary/40 text-matrix-2xs font-mono min-w-[45px]">
                          {message.timestamp ? formatTime(message.timestamp) : ''}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-matrix-2xs px-1 py-0 border-0",
                            message.type === 'error' && "bg-destructive/20 text-destructive",
                            message.type === 'system' && "bg-warning/20 text-warning",
                            message.type === 'user' && "bg-info/20 text-info",
                            message.type === 'assistant' && "bg-primary/20 text-primary"
                          )}
                        >
                          {typeInfo.prefix}
                        </Badge>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={cn(
                          'text-matrix-xs leading-relaxed break-words font-mono',
                          typeInfo.color
                        )}>
                          {message.type === 'system' || message.type === 'error' ? 
                            getMessagePreview(message.content, 120) : 
                            message.content
                          }
                        </div>
                        {message.metadata && (
                          <div className="text-matrix-2xs text-muted-foreground/60 mt-1">
                            {message.metadata.requestTime && `⏱️ ${message.metadata.requestTime}ms`}
                            {message.metadata.toolName && ` • 🔧 ${message.metadata.toolName}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {isLoading && (
                <div className="flex items-center gap-matrix-xs">
                  <span className="text-primary/40 text-matrix-2xs font-mono min-w-[45px]">
                    {formatTime(new Date())}
                  </span>
                  <Badge variant="outline" className="text-matrix-2xs px-1 py-0 bg-primary/20 text-primary border-0">
                    AI
                  </Badge>
                  <div className="flex items-center gap-1">
                    <span className="text-matrix-xs text-primary animate-pulse">Processing</span>
                    <div className="flex gap-0.5">
                      <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator className="border-primary/20" />

          {/* Enhanced Input */}
          <form onSubmit={handleSubmit} className="p-matrix-sm bg-background/50">
            <div className="flex items-center gap-matrix-xs">
              <div className="flex items-center gap-matrix-xs text-primary">
                <span className="text-matrix-sm font-matrix-bold font-mono">❯</span>
                {commandHistory.length > 0 && (
                  <Badge variant="outline" className="text-matrix-2xs px-1 py-0 border-primary/30">
                    {commandHistory.length}
                  </Badge>
                )}
              </div>
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command or ask a question..."
                disabled={isLoading}
                className={cn(
                  "flex-1 bg-transparent border-none text-matrix-sm font-mono",
                  "placeholder-primary/40 focus:ring-0 focus:ring-offset-0 p-0 h-auto",
                  "focus:placeholder-primary/60 text-primary matrix-text-glow"
                )}
                style={{ 
                  caretColor: 'hsl(145 100% 55%)',
                  color: 'hsl(145 100% 55%)'
                }}
                autoComplete="off"
              />
              {isLoading && (
                <div className="w-4 h-4 border border-primary/30 border-t-primary rounded-full animate-spin"></div>
              )}
            </div>
            {input && (
              <div className="text-matrix-2xs text-muted-foreground/60 mt-1">
                ↑/↓ for history • Tab for autocomplete • Enter to send
              </div>
            )}
          </form>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-60 hover:opacity-100 transition-opacity"
        onMouseDown={handleResizeStart}
      >
        <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-primary/60"></div>
      </div>
    </Card>
  );
});

Console.displayName = 'Console';

export default Console; 