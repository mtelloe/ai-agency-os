import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callClaudeStream } from '@/lib/ai/claude';
import { buildAgentSystemPrompt } from '@/lib/ai/prompts/agent-system';

function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function POST(request: NextRequest) {
  try {
    const { agentId, conversationId, message, visitorInfo } = await request.json();

    if (!agentId || !message) {
      return new Response(JSON.stringify({ error: 'agentId y message son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getPublicClient();

    // Get agent config
    const { data: agent } = await db
      .from('agentes')
      .select('*')
      .eq('id', agentId)
      .eq('estado', 'activo')
      .single();

    if (!agent) {
      return new Response(JSON.stringify({ error: 'Agente no encontrado o no activo' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get or create conversation
    let convoId = conversationId;
    let previousMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (convoId) {
      const { data: convo } = await db
        .from('conversaciones')
        .select('messages')
        .eq('id', convoId)
        .single();

      if (convo) {
        previousMessages = (convo.messages || []).map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      }
    } else {
      const { data: newConvo } = await db
        .from('conversaciones')
        .insert({
          agente_id: agentId,
          visitor_name: visitorInfo?.name,
          visitor_email: visitorInfo?.email,
          visitor_phone: visitorInfo?.phone,
          canal: visitorInfo?.canal || 'web_widget',
          messages: [],
        })
        .select('id')
        .single();

      convoId = newConvo?.id;
    }

    // Build system prompt
    const systemPrompt = agent.system_prompt || buildAgentSystemPrompt({
      nombre: agent.nombre,
      businessContext: agent.business_context || '',
      tono: agent.tono || 'profesional',
      welcomeMessage: agent.welcome_message || '',
      qualificationQuestions: agent.qualification_questions || [],
      ctaAction: agent.cta_action || 'Contactar con el equipo',
      fallbackMessage: agent.fallback_message,
      handoffMessage: agent.handoff_message,
      knowledge: agent.knowledge || '',
      restricciones: agent.restricciones || '',
    });

    // Add new user message
    const messages = [...previousMessages, { role: 'user' as const, content: message }];

    // Stream response
    const stream = await callClaudeStream(systemPrompt, messages);

    let fullResponse = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullResponse += event.delta.text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }

        // Save conversation with all messages
        const now = new Date().toISOString();
        const updatedMessages = [
          ...previousMessages.map((m) => ({ ...m, timestamp: '' })),
          { role: 'user', content: message, timestamp: now },
          { role: 'assistant', content: fullResponse, timestamp: now },
        ];

        if (convoId) {
          await db
            .from('conversaciones')
            .update({
              messages: updatedMessages,
              updated_at: now,
            })
            .eq('id', convoId);
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: convoId })}\n\n`));
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Agent chat error:', error);
    return new Response(JSON.stringify({ error: 'Error en el chat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
