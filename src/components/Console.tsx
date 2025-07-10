import { useState, useRef, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Minus, GripHorizontal, GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ConsoleMessage {
  type: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp?: Date;
  isError?: boolean;
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
  
  // Minimal size and positioning
  const [position, setPosition] = useState({ x: 8, y: window.innerHeight - 180 });
  const [size, setSize] = useState({ width: 280, height: 140 });
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
      setMessages(prev => [...prev, { ...message, timestamp: new Date() }]);
      setTimeout(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      }, 100);
    },
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  // Keep console within bounds
  const keepInBounds = useCallback((newPos: { x: number; y: number }, newSize: { width: number; height: number }) => {
    const maxX = window.innerWidth - newSize.width;
    const maxY = window.innerHeight - newSize.height;
    
    return {
      x: Math.max(0, Math.min(newPos.x, maxX)),
      y: Math.max(0, Math.min(newPos.y, maxY))
    };
  }, []);

  // Drag handlers
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
        width: Math.max(200, resizeStart.width + deltaX),
        height: Math.max(80, resizeStart.height + deltaY)
      };
      
      setSize(newSize);
      setPosition(prev => keepInBounds(prev, newSize));
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, keepInBounds, size]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Resize handlers
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

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

  const getMessageTypeColor = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'user': return 'text-blue-400';
      case 'assistant': return 'text-green-400';
      case 'system': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-muted-foreground';
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
    <Card
      ref={consoleRef}
      className={cn(
        'fixed z-40 bg-black/90 border-green-500/30 shadow-lg shadow-green-500/20',
        'backdrop-blur-sm matrix-card text-green-400 overflow-hidden',
        'transition-all duration-200',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        minWidth: 200,
        minHeight: 80
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Minimal Header */}
      <div
        ref={dragRef}
        className="flex items-center justify-between px-1 py-0.5 bg-green-500/10 border-b border-green-500/30 cursor-move"
      >
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 bg-green-400 rounded-full"></div>
          <span className="text-[9px] font-mono text-green-400">console</span>
        </div>
        
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-3 w-3 p-0 hover:bg-green-500/20 text-green-400"
          >
            <Minus size={8} />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesRef}
        className="flex-1 overflow-y-auto px-1 py-0.5 space-y-0.5 text-[9px] font-mono leading-tight"
        style={{ height: size.height - 60 }}
      >
        {messages.slice(-50).map((message, index) => (
          <div key={index} className="flex items-start gap-1">
            <span className="text-green-600/60 text-[8px] min-w-[40px]">
              {message.timestamp ? formatTime(message.timestamp) : ''}
            </span>
            <span className="text-green-600/40 text-[8px] min-w-[8px]">
              {message.type === 'user' ? '>' : message.type === 'system' ? '●' : '◦'}
            </span>
            <span className={cn('flex-1 break-words', getMessageTypeColor(message.type))}>
              {message.content}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-1">
            <span className="text-green-600/60 text-[8px] min-w-[40px]">
              {formatTime(new Date())}
            </span>
            <span className="text-green-600/40 text-[8px]">●</span>
            <span className="text-yellow-400 text-[9px] animate-pulse">processing...</span>
          </div>
        )}
      </div>

      {/* Minimal Input */}
      <form onSubmit={handleSubmit} className="border-t border-green-500/30 p-1">
        <div className="flex items-center gap-1">
          <span className="text-green-400 text-[9px] font-mono">{'>'}</span>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="command..."
            disabled={isLoading}
            className="flex-1 h-4 bg-transparent border-none text-[9px] font-mono text-green-400 placeholder-green-600/50 focus:ring-0 focus:ring-offset-0 p-0"
          />
        </div>
      </form>

      {/* Resize Handles */}
      <div
        className="absolute bottom-0 right-0 w-2 h-2 cursor-se-resize opacity-30 hover:opacity-60 transition-opacity"
        onMouseDown={handleResizeStart}
      >
        <GripVertical size={8} className="text-green-400" />
      </div>
      
      <div
        className="absolute bottom-0 right-2 left-2 h-1 cursor-s-resize opacity-20 hover:opacity-40 transition-opacity flex justify-center"
        onMouseDown={handleResizeStart}
      >
        <GripHorizontal size={6} className="text-green-400" />
      </div>
    </Card>
  );
});

Console.displayName = 'Console';

export default Console; 