import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Bot, User, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function GuidelineChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Hello! I\'m your mortgage guideline assistant. I can help you with loan guidelines, requirements, and compliance questions. How can I assist you today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    // Simulate API call to chatbase.co
    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but the chatbase.co integration is not yet configured. This feature will be available once the API integration is set up. Please provide your chatbase.co API credentials to enable this functionality.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Guideline Chatbot</h1>
        <p className="text-muted-foreground">Get instant answers to mortgage guideline questions</p>
      </div>

      <Alert>
        <ExternalLink className="h-4 w-4" />
        <AlertDescription>
          This chatbot will be powered by chatbase.co. Please configure your API credentials to enable the AI assistant functionality.
        </AlertDescription>
      </Alert>

      <Card className="bg-gradient-card shadow-soft h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2 text-primary" />
            Mortgage Guidelines Assistant
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 border rounded-lg bg-background/50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className={`p-2 rounded-full ${
                  message.sender === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted text-foreground'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-secondary text-secondary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted text-foreground p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about loan guidelines, requirements, or compliance..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputMessage.trim() || isLoading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Questions */}
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("What are the DTI requirements for conventional loans?")}
                disabled={isLoading}
              >
                DTI Requirements
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("What documentation is needed for self-employed borrowers?")}
                disabled={isLoading}
              >
                Self-Employed Docs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("What are the minimum credit score requirements?")}
                disabled={isLoading}
              >
                Credit Score
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Notice */}
      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>API Integration Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              To enable the AI chatbot functionality, you'll need to:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Create an account at <a href="https://chatbase.co" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">chatbase.co</a></li>
              <li>Train your chatbot with mortgage guidelines and documentation</li>
              <li>Obtain your API credentials</li>
              <li>Configure the integration in your project settings</li>
            </ol>
            <Button variant="outline" asChild>
              <a href="https://chatbase.co" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Chatbase.co
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}