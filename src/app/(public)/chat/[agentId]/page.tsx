'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const { agentId } = useParams() as { [key: string]: string };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('Asistente');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadAgent() {
      const { data } = await supabase
        .from('agentes')
        .select('nombre, welcome_message, widget_config')
        .eq('id', agentId)
        .single();

      if (data) {
        setAgentName(data.nombre);
        setWelcomeMessage(data.welcome_message || '');
        setPrimaryColor(data.widget_config?.primaryColor || '#6366f1');
        if (data.welcome_message) {
          setMessages([{ role: 'assistant', content: data.welcome_message }]);
        }
      }
    }
    loadAgent();
  }, [agentId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          conversationId,
          message: userMessage,
        }),
      });

      if (!res.ok) throw new Error('Error');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                assistantMessage += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
                  return updated;
                });
              }
              if (data.conversationId) {
                setConversationId(data.conversationId);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Lo siento, ha ocurrido un error. Inténtalo de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b flex items-center px-4 gap-3" style={{ backgroundColor: primaryColor + '10' }}>
        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium">{agentName}</p>
          <p className="text-xs text-muted-foreground">En línea</p>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: primaryColor }}>
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted rounded-bl-md'
              )}>
                {msg.content || <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {msg.role === 'user' && (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto flex gap-2">
          <Input
            placeholder="Escribe un mensaje..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !input.trim()} style={{ backgroundColor: primaryColor }}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
