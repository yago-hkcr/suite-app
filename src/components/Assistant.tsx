import { FormEvent, useState } from 'react';
import { Bot, LoaderCircle, Send, X } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { getStorageUser } from '../utils/supabase';

type AIAction =
  | { type: 'document'; title: string; content: string }
  | { type: 'spreadsheet'; title: string; headers: string[]; rows: unknown[][] }
  | { type: 'code'; title: string; language: string; content: string }
  | { type: 'sql'; content: string };
export function Assistant() {
  const [open,setOpen]=useState(false); const [prompt,setPrompt]=useState(''); const [busy,setBusy]=useState(false); const [messages,setMessages]=useState<{role:string;text:string}[]>([]);
  const consentKey=`suite_ai_consent_${getStorageUser()||'guest'}`;
  const [consented,setConsented]=useState(()=>localStorage.getItem(consentKey)==='yes');
  async function send(e: FormEvent) {
    e.preventDefault(); const question=prompt.trim(); if(!question||busy) return;
    const session=await supabase?.auth.getSession(); const token=session?.data.session?.access_token;
    if(!token) { setMessages(m=>[...m,{role:'assistant',text:'Sua sessão expirou. Entre novamente.'}]); return; }
    setPrompt(''); setMessages(m=>[...m,{role:'user',text:question}]); setBusy(true);
    try {
      const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({prompt:question})});
      const payload=await response.json(); if(!response.ok) throw new Error(payload.error||'Não foi possível obter resposta.');
      setMessages(m=>[...m,{role:'assistant',text:payload.reply}]);
      if(payload.action && ['document','spreadsheet','code','sql'].includes(payload.action.type)) window.dispatchEvent(new CustomEvent('suite:ai-action',{detail:payload.action as AIAction}));
    } catch(err) { setMessages(m=>[...m,{role:'assistant',text:err instanceof Error?err.message:'Falha ao falar com a IA.'}]); }
    finally { setBusy(false); }
  }
  return <>
    <button onClick={()=>setOpen(true)} className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-xl hover:bg-indigo-500"><Bot size={18}/> IA gratuita</button>
    {open&&<section className="fixed bottom-20 right-3 z-50 flex h-[min(680px,calc(100dvh-6rem))] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3"><div><strong className="flex items-center gap-2"><Bot size={18} className="text-indigo-400"/> Assistente IA</strong><p className="mt-1 text-[11px] text-slate-400">Cria documentos, planilhas, código e consultas SQL.</p></div><button onClick={()=>setOpen(false)} aria-label="Fechar"><X size={18}/></button></header>
      {!consented?<div className="m-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm"><strong>Antes de começar</strong><p className="mt-2 text-slate-300">Seus pedidos serão enviados ao Google Gemini para gerar respostas. No plano gratuito, o Google pode usar esses dados para melhorar os produtos. Não envie senhas ou informações sensíveis.</p><button onClick={()=>{localStorage.setItem(consentKey,'yes');setConsented(true);}} className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 font-semibold">Concordo e continuar</button></div>:<>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.length===0&&<p className="rounded-xl bg-slate-900 p-3 text-sm text-slate-300">Peça uma explicação, documento Word, planilha, código ou consulta SQL. O pedido é enviado ao Google Gemini para gerar a resposta.</p>}{messages.map((m,i)=><div key={i} className={`max-w-[92%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${m.role==='user'?'ml-auto bg-indigo-600 text-white':'bg-slate-800 text-slate-200'}`}>{m.text}</div>)}{busy&&<div className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="animate-spin" size={16}/> Preparando sua resposta…</div>}</div>
      <form onSubmit={send} className="flex gap-2 border-t border-slate-800 p-3"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={2} maxLength={12000} placeholder="O que você precisa fazer?" className="min-w-0 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm outline-none focus:border-indigo-500"/><button disabled={busy||!prompt.trim()} aria-label="Enviar pedido" className="self-end rounded-xl bg-indigo-600 p-3 disabled:opacity-40"><Send size={18}/></button></form></>}
    </section>}
  </>;
}
