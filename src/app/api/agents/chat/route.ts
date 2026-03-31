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

    // Limit message length to prevent abuse
    if (typeof message !== 'string' || message.length > 10000) {
      return new Response(JSON.stringify({ error: 'El mensaje es demasiado largo (máximo 10.000 caracteres)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getPublicClient();

    // Solo seleccionamos los campos necesarios para construir la respuesta.
    // Evitamos exponer datos internos innecesariamente en memoria del servidor.
    const { data: agent } = await db
      .from('agentes')
      .select(
        'id, nombre, system_prompt, business_context, tono, welcome_message, qualification_questions, cta_action, fallback_message, handoff_message, knowledge, restricciones'
      )
      .eq('id', agentId)
      .eq('estado', 'activo')
      .single();

    if (!agent) {
      return new Response(JSON.stringify({ error: 'Agente no encontrado o no activo' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate agentId format (UUID) to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(agentId)) {
      return new Response(JSON.stringify({ error: 'Formato de agentId inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get or create conversation
    let convoId = conversationId;
    let previousMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (convoId) {
      // Validate conversationId format if provided
      if (!uuidRegex.test(convoId)) {
        return new Response(JSON.stringify({ error: 'Formato de conversationId inválido' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { data: convo } = await db
        .from('conversaciones')
        .select('messages')
        .eq('id', convoId)
        .single();

      if (convo) {
        // Limit conversation history to last 50 messages to prevent oversized context
        const allMessages = (convo.messages || []).map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
        previousMessages = allMessages.slice(-50);
      }
    } else {
      // Sanitize visitor info: truncate and strip HTML to prevent stored XSS
      const sanitize = (val: unknown, maxLen = 200): string | undefined => {
        if (typeof val !== 'string') return undefined;
        return val.replace(/<[^>]*>/g, '').slice(0, maxLen) || undefined;
      };

      const { data: newConvo } = await db
        .from('conversaciones')
        .insert({
          agente_id: agentId,
          visitor_name: sanitize(visitorInfo?.name, 100),
          visitor_email: sanitize(visitorInfo?.email, 200),
          visitor_phone: sanitize(visitorInfo?.phone, 30),
          canal: sanitize(visitorInfo?.canal, 50) || 'web_widget',
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
