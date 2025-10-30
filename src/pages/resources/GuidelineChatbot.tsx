import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Zap, Mic, MessageSquare, Trash2, Plus, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ConversationHistory {
  id: string;
  session_id: string;
  title: string;
  last_message_at: string;
  messages: ChatMessage[];
}

export default function GuidelineChatbot() {
  const [sessionId, setSessionId] = useState<string>("");
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
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize session ID and load conversation history
  useEffect(() => {
    const storedSessionId = localStorage.getItem('guideline-chat-session-id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      setCurrentConversationId(storedSessionId);
    } else {
      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);
      setCurrentConversationId(newSessionId);
      localStorage.setItem('guideline-chat-session-id', newSessionId);
    }
    loadConversationHistory();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation history from database
  const loadConversationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      if (data) {
        setConversationHistory(data.map(conv => ({
          id: conv.id,
          session_id: conv.session_id,
          title: conv.title || 'New Conversation',
          last_message_at: conv.last_message_at || '',
          messages: (conv.messages as unknown as ChatMessage[]) || []
        })));
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  // Save conversation to database
  const saveConversation = async (msgs: ChatMessage[]) => {
    if (msgs.length <= 1) return; // Don't save if only welcome message

    const title = msgs.find(m => m.sender === 'user')?.content.slice(0, 50) || 'New Conversation';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('conversation_history')
        .upsert([{
          session_id: sessionId,
          title,
          last_message_at: new Date().toISOString(),
          messages: msgs as any,
          user_id: user?.id || null
        }], {
          onConflict: 'session_id'
        });

      if (error) throw error;
      
      await loadConversationHistory();
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  // Load a conversation
  const loadConversation = (conversation: ConversationHistory) => {
    setSessionId(conversation.session_id);
    setCurrentConversationId(conversation.id);
    // Convert timestamp strings/numbers back to Date objects
    const messagesWithDates = conversation.messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
    }));
    setMessages(messagesWithDates);
    localStorage.setItem('guideline-chat-session-id', conversation.session_id);
    setShowHistorySidebar(false);
  };

  // Start new chat
  const startNewChat = () => {
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    setCurrentConversationId(newSessionId);
    setMessages([
      {
        id: '1',
        content: 'Hello! I\'m Bolt Bot, your mortgage guideline assistant. I can help you with loan guidelines, requirements, and compliance questions. How can I assist you today?',
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
    localStorage.setItem('guideline-chat-session-id', newSessionId);
    setShowHistorySidebar(false);
  };

  // Delete conversation
  const deleteConversation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversation_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Conversation deleted');
      await loadConversationHistory();

      // If we deleted the current conversation, start a new one
      if (currentConversationId === id) {
        startNewChat();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          throw new Error('Failed to convert audio to base64');
        }

        const { data, error } = await supabase.functions.invoke('voice-transcribe', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        if (data?.text) {
          setInputMessage(data.text);
          toast.success('Voice transcribed successfully!');
        } else {
          throw new Error('No transcription returned');
        }
      };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast.error('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

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
      
      const updatedMessages = [...messages, userMessage, botResponse];
      setMessages(updatedMessages);
      
      // Save conversation after bot responds
      await saveConversation(updatedMessages);
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

  const HistorySidebar = () => (
    <div className="h-full flex flex-col bg-card border-r">
      <div className="p-4 border-b">
        <Button 
          onClick={startNewChat}
          className="w-full justify-start gap-2"
          variant="default"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {conversationHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No conversation history yet
            </p>
          ) : (
            conversationHistory.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer hover:bg-accent ${
                  currentConversationId === conv.id ? 'bg-accent border-primary' : ''
                }`}
                onClick={() => loadConversation(conv)}
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <MessageSquare className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conv.last_message_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 border-r">
        <HistorySidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Mobile Sidebar Trigger */}
        <div className="lg:hidden p-4 border-b bg-card/50 backdrop-blur-sm">
          <Sheet open={showHistorySidebar} onOpenChange={setShowHistorySidebar}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat History
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Chat History</SheetTitle>
              </SheetHeader>
              <HistorySidebar />
            </SheetContent>
          </Sheet>
        </div>

        {/* Header */}
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-8 space-y-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Bolt Bot
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Your AI-powered mortgage guideline assistant
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span>Online</span>
            </div>
          </div>

          {/* Chat Container */}
          <Card className="shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
            {/* Messages Area */}
            <ScrollArea className="h-[650px] p-6">
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
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

            {/* Input Area */}
            <CardContent className="p-6 border-t border-border/50 bg-card/50 backdrop-blur-sm space-y-4">
              {/* Quick Questions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage("What are the DTI requirements for conventional loans?")}
                  disabled={isLoading}
                  className="text-xs hover:bg-accent transition-all"
                >
                  DTI Requirements
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage("What documentation is needed for self-employed borrowers?")}
                  disabled={isLoading}
                  className="text-xs hover:bg-accent transition-all"
                >
                  Self-Employed Docs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage("What are the minimum credit score requirements?")}
                  disabled={isLoading}
                  className="text-xs hover:bg-accent transition-all"
                >
                  Credit Score
                </Button>
              </div>

              {/* Transcription Status */}
              {isTranscribing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Transcribing audio...</span>
                </div>
              )}

              {/* Input Field */}
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about mortgage guidelines..."
                  disabled={isLoading || isTranscribing}
                  className="flex-1 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary transition-all"
                />
                <Button 
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading || isTranscribing}
                  size="icon"
                  variant={isRecording ? "destructive" : "outline"}
                  className={`transition-all shadow-lg hover:shadow-xl ${
                    isRecording ? 'animate-pulse' : ''
                  }`}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim() || isTranscribing}
                  size="icon"
                  className="bg-primary hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
