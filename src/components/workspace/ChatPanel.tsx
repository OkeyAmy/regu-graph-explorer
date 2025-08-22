import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useRegulationStore } from '@/store/regulationStore';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    nodeId: string;
    nodeTitle: string;
    nodeText: string;
  };
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { selectedNodeId, documentData, getChatContext } = useRegulationStore();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Add context when a node is selected
  useEffect(() => {
    if (selectedNodeId && documentData) {
      const context = getChatContext(selectedNodeId);
      if (context) {
        const contextMessage: Message = {
          id: `context-${Date.now()}`,
          role: 'assistant',
          content: `Added to context: "${context.nodeTitle || context.nodeId}"`,
          timestamp: new Date(),
          context: {
            nodeId: selectedNodeId,
            nodeTitle: context.nodeTitle || '',
            nodeText: context.nodeText || ''
          }
        };
        setMessages(prev => [...prev, contextMessage]);
      }
    }
  }, [selectedNodeId, documentData, getChatContext]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate AI response for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `I understand you're asking about: "${userMessage.content}". Based on the document context, I can help you analyze the regulation. What specific aspect would you like me to focus on?`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Document Assistant</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Ask questions about the document or click sections to add context
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                Start by selecting a section from the document outline or ask a question about the regulation.
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <Card className={cn(
                "max-w-[80%] p-3",
                message.role === 'user' 
                  ? "bg-primary text-primary-foreground" 
                  : message.context 
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800"
                    : "bg-muted"
              )}>
                {message.context && (
                  <div className="text-xs text-muted-foreground mb-2 p-2 bg-background/50 rounded">
                    <strong>Context:</strong> {message.context.nodeTitle}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                    onClick={() => copyMessage(message.content)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <Card className="bg-muted p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about this regulation..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}