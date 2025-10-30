import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Bot, User, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function GuidelineChatbot() {
  // Generate a unique session ID for conversation memory
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('guideline-chat-session-id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('guideline-chat-session-id', newId);
    return newId;
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Hello! I\'m Bolt Bot, your mortgage guideline assistant. I can help you with loan guidelines, requirements, and compliance questions. How can I assist you today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('guideline-chat', {
        body: { 
          message: inputMessage,
          sessionId: sessionId
        }
      });

      if (error) throw error;

      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response || 'I apologize, but I could not generate a response.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error calling guideline chat:', error);
      toast.error('Failed to get response from guideline assistant');
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Bolt Bot
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Your intelligent mortgage guideline assistant
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Online and ready to help</span>
          </div>
        </div>

        {/* Chat Container */}
        <Card className="max-w-3xl mx-auto shadow-lg border-2 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-primary" />
              Chat with Bolt Bot
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Chat Messages Area */}
            <ScrollArea className="h-[500px] px-4 py-6">
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 animate-fade-in ${
                      message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={`flex-shrink-0 p-2.5 rounded-full ${
                      message.sender === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary'
                    }`}>
                      {message.sender === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div className={`group max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      <span className="text-xs opacity-0 group-hover:opacity-70 transition-opacity mt-1 block">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex items-start gap-3 animate-fade-in">
                    <div className="flex-shrink-0 p-2.5 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted text-foreground rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground mr-2">Bolt is thinking</span>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input Section */}
            <div className="border-t bg-muted/30 p-4 space-y-4">
              {/* Quick Questions */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Questions</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputMessage("What are the DTI requirements for conventional loans?")}
                    disabled={isLoading}
                    className="text-xs hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
                  >
                    DTI Requirements
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputMessage("What documentation is needed for self-employed borrowers?")}
                    disabled={isLoading}
                    className="text-xs hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
                  >
                    Self-Employed Docs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputMessage("What are the minimum credit score requirements?")}
                    disabled={isLoading}
                    className="text-xs hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
                  >
                    Credit Score
                  </Button>
                </div>
              </div>

              {/* Input Area */}
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about loan guidelines, requirements, or compliance..."
                  className="flex-1 bg-background"
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}