import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token || !process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) return res.status(401).json({ error: 'Entre na sua conta para usar a IA.' });
  const auth = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: { user }, error } = await auth.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt || prompt.length > 12000) return res.status(400).json({ error: 'Escreva um pedido de até 12 mil caracteres.' });
  if (!process.env.GOOGLE_AI_API_KEY) return res.status(503).json({ error: 'A IA ainda não foi ativada pelo administrador.' });
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });
    const contents = `Você é o assistente da Suíte app's. Responda sempre em português brasileiro. Entregue resultado útil, direto e correto. Quando pedirem para criar um documento Word/texto/relatório, gere conteúdo com títulos em Markdown e inclua action como {"type":"document","title":"...","content":"..."}. Quando pedirem uma planilha, gere action como {"type":"spreadsheet","title":"...","headers":["..."],"rows":[["..."]]}. Quando pedirem código, script ou página web, escolha a linguagem entre javascript, python, html, sql, lua e inclua action {"type":"code","language":"javascript","title":"...","content":"..."}. Para uma consulta SQL ou estrutura de banco, use action {"type":"sql","content":"..."}; ela será colocada no editor para revisão, sem executar automaticamente. Para pedidos gerais, use action null. Não invente que realizou operações fora do app. Retorne somente JSON válido no formato {"reply":"...","action":null}. Pedido do usuário: ${prompt}`;
    let result;
    let lastError: any;
    for (const model of ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash']) {
      try {
        result = await ai.models.generateContent({ model, contents, config: { responseMimeType: 'application/json' } });
        break;
      } catch (error: any) {
        lastError = error;
        const status = Number(error?.status || error?.code || 0);
        if (status !== 429 && status < 500) throw error;
        console.warn(`Gemini model ${model} unavailable (${status || 'unknown'}); trying fallback.`);
      }
    }
    if (!result) throw lastError || new Error('All Gemini models are unavailable.');
    const raw = result.text || '{}';
    const parsed = JSON.parse(raw);
    let action: any = null;
    if (parsed.action?.type === 'document' && typeof parsed.action.content === 'string') {
      action = { type: 'document', title: String(parsed.action.title || 'Documento criado pela IA').slice(0, 120), content: parsed.action.content.slice(0, 40000) };
    } else if (parsed.action?.type === 'spreadsheet' && Array.isArray(parsed.action.headers) && Array.isArray(parsed.action.rows)) {
      const headers = parsed.action.headers.filter((x: unknown) => typeof x === 'string').slice(0, 26);
      const rows = parsed.action.rows.slice(0, 500).filter(Array.isArray).map((row: unknown[]) => row.slice(0, headers.length).map((cell) => String(cell ?? '').slice(0, 500)));
      if (headers.length) action = { type: 'spreadsheet', title: String(parsed.action.title || 'Planilha criada pela IA').slice(0, 120), headers, rows };
    } else if (parsed.action?.type === 'code' && ['javascript', 'python', 'html', 'sql', 'lua'].includes(parsed.action.language) && typeof parsed.action.content === 'string') {
      action = { type: 'code', language: parsed.action.language, title: String(parsed.action.title || 'Código criado pela IA').slice(0, 120), content: parsed.action.content.slice(0, 40000) };
    } else if (parsed.action?.type === 'sql' && typeof parsed.action.content === 'string') {
      action = { type: 'sql', content: parsed.action.content.slice(0, 12000) };
    }
    return res.status(200).json({ reply: String(parsed.reply || 'Não consegui gerar uma resposta.').slice(0, 12000), action });
  } catch (e) {
    console.error('AI request failed', e);
    const status = Number((e as any)?.status || (e as any)?.code || 0);
    if (status === 429 || status >= 500) return res.status(503).json({ error: 'Os modelos de IA estão ocupados agora. Tente novamente em alguns segundos.' });
    return res.status(502).json({ error: 'Não foi possível gerar a resposta. Tente novamente.' });
  }
}
