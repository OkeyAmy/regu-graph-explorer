import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Copy, Loader2, FileText, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRegulationStore } from '@/store/regulationStore';
import { geminiChatService, ChatMessage, DocumentContext } from '@/services/geminiChatService';
import { cn } from '@/lib/utils';

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasDocument, setHasDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { rawDocumentContent, documentData, selectedNodeId, getChatContext } = useRegulationStore();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Set document context when raw document content changes
  useEffect(() => {
    if (rawDocumentContent.content && rawDocumentContent.fileType) {
      try {
        const documentContext: DocumentContext = {
          content: rawDocumentContent.content,
          type: rawDocumentContent.fileType,
          fileName: rawDocumentContent.fileName
        };
        
        geminiChatService.setDocumentContext(documentContext);
        setHasDocument(true);
        setError(null);
        
        // Add a welcome message
        const welcomeMessage: ChatMessage = {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `Document "${rawDocumentContent.fileName || 'Document'}" has been uploaded and is ready for analysis. You can now ask me questions about this document.`,
          timestamp: new Date(),
          context: {
            documentType: rawDocumentContent.fileType,
            fileName: rawDocumentContent.fileName
          }
        };
        
        setMessages(prev => [...prev, welcomeMessage]);
      } catch (err) {
        console.error('Error setting document context:', err);
        setError('Failed to initialize document analysis. Please try uploading the document again.');
        setHasDocument(false);
      }
    } else {
      geminiChatService.clearDocumentContext();
      setHasDocument(false);
      setError(null);
    }
  }, [rawDocumentContent]);

  // Add context when a node is selected
  useEffect(() => {
    if (selectedNodeId && documentData && hasDocument) {
      const context = getChatContext(selectedNodeId);
      if (context) {
        const contextMessage: ChatMessage = {
          id: `context-${Date.now()}`,
          role: 'assistant',
          content: `Added to context: "${context.nodeTitle || context.nodeId}"`,
          timestamp: new Date(),
          context: {
            documentType: rawDocumentContent.fileType || 'unknown',
            fileName: rawDocumentContent.fileName
          }
        };
        setMessages(prev => [...prev, contextMessage]);
      }
    }
  }, [selectedNodeId, documentData, getChatContext, rawDocumentContent, hasDocument]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !hasDocument) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      context: {
        documentType: rawDocumentContent.fileType || 'unknown',
        fileName: rawDocumentContent.fileName
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Send message to Gemini AI
      const aiResponse = await geminiChatService.sendMessage(input.trim());
      
      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        context: {
          documentType: rawDocumentContent.fileType || 'unknown',
          fileName: rawDocumentContent.fileName
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
        context: {
          documentType: rawDocumentContent.fileType || 'unknown',
          fileName: rawDocumentContent.fileName
        }
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setError('Failed to get AI response. Please try again.');
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

  const getDocumentSummary = async () => {
    if (!hasDocument || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const summary = await geminiChatService.getDocumentSummary();
      
      const summaryMessage: ChatMessage = {
        id: `summary-${Date.now()}`,
        role: 'assistant',
        content: `**Document Summary:**\n\n${summary}`,
        timestamp: new Date(),
        context: {
          documentType: rawDocumentContent.fileType || 'unknown',
          fileName: rawDocumentContent.fileName
        }
      };
      
      setMessages(prev => [...prev, summaryMessage]);
    } catch (error) {
      console.error('Error getting summary:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I couldn't generate a summary: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
        context: {
          documentType: rawDocumentContent.fileType || 'unknown',
          fileName: rawDocumentContent.fileName
        }
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setError('Failed to generate document summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
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
          {hasDocument 
            ? `Analyzing: ${rawDocumentContent.fileName || 'Document'}`
            : 'Upload a document to start chatting with AI'
          }
        </p>
        {hasDocument && (
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={getDocumentSummary}
              disabled={isLoading}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Get Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              disabled={isLoading}
              className="px-3"
            >
              Clear Chat
            </Button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mx-4 mt-4 border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              {hasDocument ? (
                <>
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                    Start by asking questions about the uploaded document or click sections to add context.
                  </p>
                  <p className="text-xs mt-2 text-muted-foreground">
                    You can ask about regulations, cross-references, or any specific content in the document.
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    Upload a document first to start chatting with AI about its content.
                  </p>
                  <p className="text-xs mt-2 text-muted-foreground">
                    Supported formats: PDF, HTML, TXT, and URLs
                  </p>
                </>
              )}
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
                    <strong>Context:</strong> {message.context.fileName || message.context.documentType}
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
                  <span>AI is analyzing your document...</span>
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
            placeholder={hasDocument ? "Ask about this document..." : "Upload a document first..."}
            disabled={isLoading || !hasDocument}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading || !hasDocument}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {!hasDocument && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Upload a document to enable AI chat
          </p>
        )}
        {hasDocument && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Ask questions about regulations, cross-references, or any content in the document
          </p>
        )}
      </div>
    </div>
  );
}