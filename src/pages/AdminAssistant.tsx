import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Send, Copy, ExternalLink, Plus, FileText, User, Phone, Mail, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    citations?: Array<{ source: string; url?: string; type: string }>;
    quickActions?: Array<{ label: string; action: string; data?: any }>;
    secretValue?: string;
  };
  created_at: string;
}

interface Session {
  id: string;
  title: string;
  created_at: string;
}

const SecretConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  secretKey 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  secretKey: string; 
}) => {
  const [confirmText, setConfirmText] = useState('');
  
  const handleConfirm = () => {
    if (confirmText === 'APPROVE') {
      onConfirm();
      setConfirmText('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-warning" />
            Access Sensitive Data
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You are requesting access to sensitive data: <strong>{secretKey}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Type <strong>APPROVE</strong> to confirm access:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type APPROVE"
            className="font-mono"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleConfirm}
              disabled={confirmText !== 'APPROVE'}
              className="bg-warning hover:bg-warning/90"
            >
              Confirm Access
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const QuickActionButton = ({ action, onAction }: { action: any; onAction: (action: any) => void }) => {
  const getIcon = () => {
    switch (action.action) {
      case 'copy_phone':
      case 'copy_email':
        return <Copy className="h-3 w-3" />;
      case 'open_record':
        return <ExternalLink className="h-3 w-3" />;
      case 'create_task':
        return <Plus className="h-3 w-3" />;
      case 'add_note':
        return <FileText className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Button 
      size="sm" 
      variant="outline" 
      onClick={() => onAction(action)}
      className="h-6 text-xs px-2"
    >
      {getIcon()}
      {action.label}
    </Button>
  );
};

export default function AdminAssistant() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [pendingSecretRequest, setPendingSecretRequest] = useState<{ key: string; sessionId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession);
    }
  }, [currentSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from('assistant_chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading sessions:', error);
      return;
    }

    setSessions(data || []);
    if (data && data.length > 0 && !currentSession) {
      setCurrentSession(data[0].id);
    }
  };

  const loadMessages = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('assistant_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data?.map(msg => ({
      ...msg,
      role: msg.role as 'user' | 'assistant',
      metadata: msg.metadata as any
    })) || []);
  };

  const createNewSession = async () => {
    const { data, error } = await supabase
      .from('assistant_chat_sessions')
      .insert([{
        user_id: (await supabase.auth.getUser()).data.user?.id,
        title: 'New Chat'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      toast({ title: 'Error', description: 'Failed to create new chat session', variant: 'destructive' });
      return;
    }

    await loadSessions();
    setCurrentSession(data.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentSession) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: newMessage.trim(),
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      // Save user message
      await supabase.from('assistant_messages').insert([{
        session_id: currentSession,
        role: 'user',
        content: userMessage.content
      }]);

      // Call assistant endpoint
      const response = await supabase.functions.invoke('assistant-chat', {
        body: {
          message: userMessage.content,
          sessionId: currentSession
        }
      });

      if (response.error) {
        throw response.error;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        metadata: response.data.metadata,
        created_at: new Date().toISOString()
      };

      // Save assistant message
      await supabase.from('assistant_messages').insert([{
        session_id: currentSession,
        role: 'assistant',
        content: assistantMessage.content,
        metadata: assistantMessage.metadata || {}
      }]);

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: any) => {
    switch (action.action) {
      case 'copy_phone':
      case 'copy_email':
        await navigator.clipboard.writeText(action.data);
        toast({ title: 'Copied', description: `${action.data} copied to clipboard` });
        break;
      case 'open_record':
        window.open(action.data.url, '_blank');
        break;
      case 'create_task':
      case 'add_note':
        toast({ title: 'Feature Coming Soon', description: 'Quick actions will be available soon' });
        break;
    }
  };

  const handleSecretRequest = (secretKey: string) => {
    setPendingSecretRequest({ key: secretKey, sessionId: currentSession! });
    setShowSecretModal(true);
  };

  const confirmSecretAccess = async () => {
    if (!pendingSecretRequest) return;

    try {
      const response = await supabase.functions.invoke('assistant-get-secret', {
        body: {
          secretKey: pendingSecretRequest.key,
          sessionId: pendingSecretRequest.sessionId
        }
      });

      if (response.error) {
        throw response.error;
      }

      // Create a message with the masked secret
      const secretMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Secret value for ${pendingSecretRequest.key}:`,
        metadata: {
          secretValue: response.data.maskedValue
        },
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, secretMessage]);
    } catch (error) {
      console.error('Error getting secret:', error);
      toast({ title: 'Error', description: 'Failed to retrieve secret', variant: 'destructive' });
    } finally {
      setPendingSecretRequest(null);
    }
  };

  const copySecret = async (secretValue: string) => {
    await navigator.clipboard.writeText(secretValue);
    toast({ title: 'Copied', description: 'Secret copied to clipboard' });
  };

  return (
    <div className="flex h-screen bg-gradient-subtle">
      {/* Sessions Sidebar */}
      <div className="w-64 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">MortgageBolt Assistant</h2>
          </div>
          <Button onClick={createNewSession} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setCurrentSession(session.id)}
                className={`w-full text-left p-2 rounded text-sm hover:bg-accent transition-colors ${
                  currentSession === session.id ? 'bg-accent' : ''
                }`}
              >
                <div className="font-medium truncate">{session.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(session.created_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentSession ? (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'assistant' && (
                      <Avatar className="h-8 w-8 bg-primary">
                        <AvatarFallback>
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[70%] ${message.role === 'user' ? 'order-first' : ''}`}>
                      <Card className={message.role === 'user' ? 'bg-primary text-primary-foreground' : ''}>
                        <CardContent className="p-3">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          
                          {/* Secret value display */}
                          {message.metadata?.secretValue && (
                            <div className="mt-3 p-2 bg-muted rounded border">
                              <div className="flex items-center justify-between">
                                <code className="text-xs font-mono">{message.metadata.secretValue}</code>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => copySecret(message.metadata!.secretValue!)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {/* Citations */}
                          {message.metadata?.citations && message.metadata.citations.length > 0 && (
                            <div className="mt-3 space-y-1">
                              <div className="text-xs font-medium">Sources:</div>
                              {message.metadata.citations.map((citation, index) => (
                                <Badge key={index} variant="secondary" className="text-xs mr-1">
                                  {citation.source}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {/* Quick Actions */}
                          {message.metadata?.quickActions && message.metadata.quickActions.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {message.metadata.quickActions.map((action, index) => (
                                <QuickActionButton 
                                  key={index} 
                                  action={action} 
                                  onAction={handleQuickAction} 
                                />
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    {message.role === 'user' && (
                      <Avatar className="h-8 w-8 bg-secondary">
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 bg-primary">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border p-4">
              <div className="max-w-4xl mx-auto flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ask about leads, contacts, tasks, or any CRM data..."
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={isLoading}
                />
                <Button onClick={sendMessage} disabled={isLoading || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  MortgageBolt Assistant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Get instant answers about your CRM data. Ask about leads, contacts, tasks, documents, and more.
                </p>
                <Button onClick={createNewSession} className="w-full">
                  Start New Chat
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Secret Confirmation Modal */}
      <SecretConfirmationModal
        isOpen={showSecretModal}
        onClose={() => setShowSecretModal(false)}
        onConfirm={confirmSecretAccess}
        secretKey={pendingSecretRequest?.key || ''}
      />
    </div>
  );
}