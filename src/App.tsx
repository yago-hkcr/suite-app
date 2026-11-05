import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FileText,
  Database,
  Code2,
  Paintbrush,
  Menu,
  X,
  HardDrive,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { AppId } from './types';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { SpreadsheetApp } from './components/spreadsheet/SpreadsheetApp';
import { DocumentApp } from './components/docs/DocumentApp';
import { DatabaseApp } from './components/database/DatabaseApp';
import { CodeEditorApp } from './components/code/CodeEditorApp';
import { PaintApp } from './components/paint/PaintApp';
import { Assistant } from './components/Assistant';

export default function App({ userEmail, onSignOut }: { userEmail: string; onSignOut: () => void }) {
  const [activeApp, setActiveApp] = useState<AppId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const apply = (event: Event) => {
      const action = (event as CustomEvent).detail;
      const app = action?.type === 'spreadsheet' ? 'spreadsheet'
        : action?.type === 'document' ? 'documents'
        : action?.type === 'code' ? 'code'
        : action?.type === 'sql' ? 'database' : null;
      if (!app) return;
      setActiveApp(app);
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('suite:apply-ai-action', { detail: action })), 180);
    };
    window.addEventListener('suite:ai-action', apply);
    return () => window.removeEventListener('suite:ai-action', apply);
  }, []);

  const navigationItems = [
    {
      id: 'dashboard' as AppId,
      name: 'Painel Geral',
      icon: LayoutDashboard,
      color: 'text-indigo-400',
      activeBg: 'bg-indigo-600/10 text-indigo-400 border-indigo-500/40',
    },
    {
      id: 'spreadsheet' as AppId,
      name: 'Planilhas',
      icon: FileSpreadsheet,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-600/10 text-emerald-400 border-emerald-500/40',
    },
    {
      id: 'documents' as AppId,
      name: 'Documentos',
      icon: FileText,
      color: 'text-blue-400',
      activeBg: 'bg-blue-600/10 text-blue-400 border-blue-500/40',
    },
    {
      id: 'database' as AppId,
      name: 'Banco de Dados',
      icon: Database,
      color: 'text-purple-400',
      activeBg: 'bg-purple-600/10 text-purple-400 border-purple-500/40',
    },
    {
      id: 'code' as AppId,
      name: 'Editor de Código',
      icon: Code2,
      color: 'text-amber-400',
      activeBg: 'bg-amber-600/10 text-amber-400 border-amber-500/40',
    },
    {
      id: 'paint' as AppId,
      name: 'Paint & Desenho',
      icon: Paintbrush,
      color: 'text-pink-400',
      activeBg: 'bg-pink-600/10 text-pink-400 border-pink-500/40',
    },
  ];

  return (
    <div className="app-shell flex h-screen w-full min-w-0 bg-[#0B0F17] text-slate-100 overflow-hidden font-sans">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-40">
        <button
          onClick={() => setActiveApp('dashboard')}
          className="font-bold text-base tracking-tight text-white flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
            S
          </div>
          <span>Suíte app's</span>
        </button>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900/95 md:bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Wordmark */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <button
              onClick={() => {
                setActiveApp('dashboard');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md group-hover:scale-105 transition-transform">
                S
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-slate-100 block group-hover:text-white">
                  Suíte app's
                </span>
                <span className="text-[10px] text-slate-500 block">Tudo em um no navegador</span>
              </div>
            </button>
          </div>

          {/* Nav List */}
          <nav className="p-3 space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeApp === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveApp(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                    isActive
                      ? `${item.activeBg} font-bold shadow-sm`
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? item.color : 'text-slate-500'}`} />
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] leading-tight">Armazenamento local persistente</span>
          </div>
          <div className="min-w-0 truncate text-[10px] text-slate-500" title={userEmail}>{userEmail}</div>
          <button onClick={onSignOut} className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-white"><LogOut className="h-3.5 w-3.5"/> Sair da conta</button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Main App Workspace */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col h-full overflow-hidden pt-14 md:pt-0">
        {activeApp === 'dashboard' && <DashboardOverview onSelectApp={setActiveApp} />}
        {activeApp === 'spreadsheet' && <SpreadsheetApp />}
        {activeApp === 'documents' && <DocumentApp />}
        {activeApp === 'database' && <DatabaseApp />}
        {activeApp === 'code' && <CodeEditorApp />}
        {activeApp === 'paint' && <PaintApp />}
      </main>
      <Assistant />
    </div>
  );
}
