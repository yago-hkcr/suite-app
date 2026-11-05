import { FormEvent, useEffect, useState } from 'react';
import { supabase, supabaseConfigured, setStorageUser } from './utils/supabase';
import App from './App';
import { LockKeyhole, Sparkles } from 'lucide-react';

export function AuthGate() {
  const [session, setSession] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const next = data.session;
      if (next) {
        setStorageUser(next.user.id);
        const { data: records } = await supabase!.from('app_data').select('storage_key,value').eq('user_id', next.user.id);
        if (alive) for (const row of records || []) localStorage.setItem(`suite_apps_${next.user.id}_${row.storage_key}`, JSON.stringify(row.value));
      }
      if (alive) { setSession(next); setReady(true); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!next) { setStorageUser(null); setSession(null); }
      else { setStorageUser(next.user.id); setSession(next); }
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setNotice('');
    const result = register
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setNotice(result.error.message);
    else if (register && !result.data.session) setNotice('Confira seu e-mail para confirmar a conta.');
  };

  if (!supabaseConfigured) return <div className="min-h-screen bg-slate-950 text-white grid place-items-center p-6"><div className="max-w-lg rounded-2xl border border-amber-500/30 bg-slate-900 p-6"><h1 className="text-xl font-bold">Configuração necessária para acesso privado</h1><p className="mt-3 text-sm text-slate-300">Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel e aplique a migração em <code>supabase/migrations</code>. O login é obrigatório para garantir que cada pessoa veja apenas os próprios arquivos.</p></div></div>;
  if (!ready) return <div className="min-h-screen bg-slate-950 grid place-items-center text-slate-300">Carregando sua área segura…</div>;
  if (session) return <App key={session.user.id} userEmail={session.user.email || ''} onSignOut={() => supabase!.auth.signOut()} />;
  return <main className="min-h-screen bg-slate-950 grid place-items-center p-4 text-slate-100"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600"><Sparkles /></div><h1 className="text-2xl font-bold">Suíte app's</h1><p className="mt-2 text-sm text-slate-400">{register ? 'Crie sua conta privada.' : 'Entre para acessar seus arquivos.'} Seus dados ficam separados dos demais usuários.</p>
    <label className="mt-6 block text-sm">E-mail<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-indigo-500" /></label>
    <label className="mt-4 block text-sm">Senha<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-indigo-500" /></label>
    {notice && <p className="mt-4 text-sm text-amber-300">{notice}</p>}<button disabled={busy} className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold hover:bg-indigo-500 disabled:opacity-50">{busy?'Aguarde…':register?'Criar conta':'Entrar'}</button>
    <button type="button" onClick={()=>{setRegister(!register);setNotice('');}} className="mt-4 w-full text-sm text-slate-400 hover:text-white">{register?'Já tenho conta':'Criar uma conta'}</button><div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500"><LockKeyhole size={14}/> Área privada por conta</div>
  </form></main>;
}
