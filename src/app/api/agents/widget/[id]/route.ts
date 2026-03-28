import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;
  const db = getPublicClient();

  const { data: agent } = await db
    .from('agentes')
    .select('nombre, welcome_message, widget_config')
    .eq('id', agentId)
    .eq('estado', 'activo')
    .single();

  if (!agent) {
    return new Response('// Agent not found', {
      status: 404,
      headers: { 'Content-Type': 'application/javascript' },
    });
  }

  const name = agent.nombre || 'Asistente';
  const welcome = agent.welcome_message || '¡Hola! ¿En qué puedo ayudarte?';
  const config = agent.widget_config || {};
  const color = config.primaryColor || '#6366f1';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

  const js = `(function(){
  if(window.__agentWidgetLoaded) return;
  window.__agentWidgetLoaded = true;

  var AGENT_ID = ${JSON.stringify(agentId)};
  var AGENT_NAME = ${JSON.stringify(name)};
  var WELCOME = ${JSON.stringify(welcome)};
  var COLOR = ${JSON.stringify(color)};
  var API = ${JSON.stringify(appUrl)};
  var convoId = null;
  var visitorInfo = null;

  /* ---- helpers ---- */
  function esc(s){ var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  function injectStyles(){
    var s = document.createElement('style');
    s.textContent = \`
      #aw-bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:\${COLOR};color:#fff;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:99999;transition:transform .2s}
      #aw-bubble:hover{transform:scale(1.1)}
      #aw-bubble svg{width:28px;height:28px;fill:#fff}
      #aw-panel{position:fixed;bottom:90px;right:20px;width:380px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 110px);border-radius:16px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
      #aw-header{background:\${COLOR};color:#fff;padding:16px;display:flex;align-items:center;gap:10px}
      #aw-header span{font-weight:600;font-size:15px;flex:1}
      #aw-close{background:none;border:none;color:#fff;cursor:pointer;font-size:20px;padding:0 4px}
      #aw-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
      .aw-msg{max-width:80%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.45;word-wrap:break-word;white-space:pre-wrap}
      .aw-bot{background:#f0f0f0;color:#1a1a1a;align-self:flex-start;border-bottom-left-radius:4px}
      .aw-user{background:\${COLOR};color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
      #aw-form-area{padding:12px;border-top:1px solid #e5e5e5;display:flex;gap:8px}
      #aw-input{flex:1;border:1px solid #ddd;border-radius:10px;padding:10px 14px;font-size:14px;outline:none;resize:none;font-family:inherit;max-height:80px}
      #aw-input:focus{border-color:\${COLOR}}
      #aw-send{background:\${COLOR};color:#fff;border:none;border-radius:10px;padding:0 16px;cursor:pointer;font-size:14px;font-weight:600}
      #aw-send:disabled{opacity:.5;cursor:default}
      #aw-lead{padding:20px;display:flex;flex-direction:column;gap:12px}
      #aw-lead h3{margin:0;font-size:15px;color:#333}
      #aw-lead input{border:1px solid #ddd;border-radius:8px;padding:10px 12px;font-size:14px;outline:none;font-family:inherit}
      #aw-lead input:focus{border-color:\${COLOR}}
      #aw-lead button{background:\${COLOR};color:#fff;border:none;border-radius:8px;padding:10px;font-size:14px;font-weight:600;cursor:pointer}
      @media(max-width:480px){#aw-panel{bottom:0;right:0;width:100%;height:100%;max-width:100%;max-height:100%;border-radius:0}#aw-bubble{bottom:14px;right:14px;width:54px;height:54px}}
    \`;
    document.head.appendChild(s);
  }

  function build(){
    /* Bubble */
    var bubble = document.createElement('button');
    bubble.id = 'aw-bubble';
    bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
    bubble.onclick = toggle;
    document.body.appendChild(bubble);

    /* Panel */
    var panel = document.createElement('div');
    panel.id = 'aw-panel';
    panel.innerHTML =
      '<div id="aw-header"><span>'+esc(AGENT_NAME)+'</span><button id="aw-close">&times;</button></div>' +
      '<div id="aw-messages"></div>' +
      '<div id="aw-lead">' +
        '<h3>Antes de empezar, \\xbfc\\xf3mo te llamas?</h3>' +
        '<input id="aw-lname" placeholder="Tu nombre" />' +
        '<input id="aw-lemail" placeholder="Tu email" type="email" />' +
        '<button id="aw-lstart">Iniciar chat</button>' +
      '</div>' +
      '<div id="aw-form-area" style="display:none">' +
        '<textarea id="aw-input" rows="1" placeholder="Escribe un mensaje..."></textarea>' +
        '<button id="aw-send">Enviar</button>' +
      '</div>';
    document.body.appendChild(panel);

    document.getElementById('aw-close').onclick = toggle;
    document.getElementById('aw-lstart').onclick = startChat;
    document.getElementById('aw-send').onclick = sendMsg;
    document.getElementById('aw-input').addEventListener('keydown', function(e){
      if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMsg(); }
    });
  }

  function toggle(){
    var p = document.getElementById('aw-panel');
    p.style.display = p.style.display === 'flex' ? 'none' : 'flex';
  }

  function startChat(){
    var n = document.getElementById('aw-lname').value.trim();
    var e = document.getElementById('aw-lemail').value.trim();
    if(!n){ document.getElementById('aw-lname').focus(); return; }
    visitorInfo = { name: n, email: e };
    document.getElementById('aw-lead').style.display = 'none';
    document.getElementById('aw-form-area').style.display = 'flex';
    addMsg(WELCOME, 'bot');
    document.getElementById('aw-input').focus();
  }

  function addMsg(text, who){
    var msgs = document.getElementById('aw-messages');
    var d = document.createElement('div');
    d.className = 'aw-msg ' + (who==='bot' ? 'aw-bot' : 'aw-user');
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function sendMsg(){
    var inp = document.getElementById('aw-input');
    var text = inp.value.trim();
    if(!text) return;
    inp.value = '';
    addMsg(text, 'user');

    var btn = document.getElementById('aw-send');
    btn.disabled = true;
    var botEl = addMsg('...', 'bot');

    fetch(API + '/api/agents/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: AGENT_ID, conversationId: convoId, message: text, visitorInfo: visitorInfo })
    }).then(function(res){
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buf = '';
      botEl.textContent = '';

      function read(){
        reader.read().then(function(r){
          if(r.done){ btn.disabled = false; return; }
          buf += decoder.decode(r.value, {stream:true});
          var lines = buf.split('\\n');
          buf = lines.pop();
          for(var i=0;i<lines.length;i++){
            var line = lines[i].trim();
            if(!line.startsWith('data: ')) continue;
            try{
              var d = JSON.parse(line.slice(6));
              if(d.text) botEl.textContent += d.text;
              if(d.conversationId) convoId = d.conversationId;
            }catch(e){}
          }
          document.getElementById('aw-messages').scrollTop = document.getElementById('aw-messages').scrollHeight;
          read();
        });
      }
      read();
    }).catch(function(){
      botEl.textContent = 'Error al conectar. Intenta de nuevo.';
      btn.disabled = false;
    });
  }

  /* ---- init ---- */
  injectStyles();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();`;

  return new Response(js, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
