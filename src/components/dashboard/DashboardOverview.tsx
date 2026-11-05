import React, { useRef, useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Database,
  Code2,
  Paintbrush,
  Sparkles,
  ArrowRight,
  HardDrive,
  Download,
  Upload,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { AppId } from '../../types';
import { exportEntireSuiteBackup, importEntireSuiteBackup, getStorageUsage } from '../../utils/storage';

interface DashboardProps {
  onSelectApp: (appId: AppId) => void;
}

export const DashboardOverview: React.FC<DashboardProps> = ({ onSelectApp }) => {
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storageInfo = getStorageUsage();

  const handleDownloadBackup = () => {
    const json = exportEntireSuiteBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suite_apps_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupStatus('Backup exportado com sucesso!');
    setTimeout(() => setBackupStatus(null), 3000);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const ok = importEntireSuiteBackup(content);
      if (ok) {
        setBackupStatus('Dados restaurados com sucesso! Recarregando...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert('Falha ao restaurar o backup. O arquivo selecionado é inválido.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const apps = [
    {
      id: 'spreadsheet' as AppId,
      title: 'Planilhas',
      subtitle: 'Estilo Excel com fórmulas e dados',
      description: 'Células editáveis, recálculo em tempo real de fórmulas (SOMA, MÉDIA, MÍNIMO, MÁXIMO, CONTAR, SE), formatação monetária e exportação XLSX/CSV.',
      icon: FileSpreadsheet,
      accent: 'emerald',
      bgColor: 'hover:border-emerald-500/50 group-hover:bg-emerald-500/10 text-emerald-400',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
      badge: 'Fórmulas + XLSX',
    },
    {
      id: 'documents' as AppId,
      title: 'Documentos',
      subtitle: 'Editor rico de textos e artigos',
      description: 'Editor WYSIWYG com títulos H1-H3, negrito, itálico, listas, tabelas personalizadas, contagem de palavras e exportação para HTML e PDF via impressão.',
      icon: FileText,
      accent: 'blue',
      bgColor: 'hover:border-blue-500/50 group-hover:bg-blue-500/10 text-blue-400',
      badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-500/30',
      badge: 'WYSIWYG + PDF',
    },
    {
      id: 'database' as AppId,
      title: 'Banco de Dados',
      subtitle: 'Motor SQL relacional puro no navegador',
      description: 'Executor SQL completo sem servidor: crie tabelas, insira dados, execute consultas avançadas com JOIN, GROUP BY e visualize schemas com exportação de dados.',
      icon: Database,
      accent: 'purple',
      bgColor: 'hover:border-purple-500/50 group-hover:bg-purple-500/10 text-purple-400',
      badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-500/30',
      badge: 'SQL Nativo + Schema',
    },
    {
      id: 'code' as AppId,
      title: 'Editor de Código',
      subtitle: 'JavaScript, Python, HTML/CSS, SQL e Lua',
      description: 'Ambiente de desenvolvimento com execução ao vivo no navegador, terminal com captura de logs/erros e visualizador interativo em tempo real para HTML e CSS.',
      icon: Code2,
      accent: 'amber',
      bgColor: 'hover:border-amber-500/50 group-hover:bg-amber-500/10 text-amber-400',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-500/30',
      badge: 'Multi-linguagem + Terminal',
    },
    {
      id: 'paint' as AppId,
      title: 'Paint & Desenho',
      subtitle: 'Criação visual e ilustrações',
      description: 'Tela de pintura matricial com pincel de espessura variável, borracha, formas geométricas, preenchimento por balde de tinta, texto e exportação PNG/JPEG.',
      icon: Paintbrush,
      accent: 'pink',
      bgColor: 'hover:border-pink-500/50 group-hover:bg-pink-500/10 text-pink-400',
      badgeColor: 'text-pink-400 bg-pink-950/60 border-pink-500/30',
      badge: 'Canvas + Formas + Balde',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 md:p-10 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Hero */}
        <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-8 md:p-10 overflow-hidden shadow-2xl">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>100% no navegador · Sem instalação · Sem login</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Suíte app's
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              O ecossistema completo de produtividade e desenvolvimento direto no seu navegador.
              Todas as ferramentas funcionam com motores de computação reais, salvando seu trabalho automaticamente na sua máquina.
            </p>
          </div>
        </div>

        {/* Application Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Aplicativos Integrados</h2>
              <p className="text-xs text-slate-500">Escolha uma ferramenta abaixo para começar</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app) => {
              const Icon = app.icon;
              return (
                <div
                  key={app.id}
                  onClick={() => onSelectApp(app.id)}
                  className={`group p-6 rounded-xl bg-slate-900/60 border border-slate-800/80 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${app.bgColor} flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center transition-colors">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border ${app.badgeColor}`}>
                        {app.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-100 mb-1 group-hover:text-white transition-colors">
                      {app.title}
                    </h3>
                    <div className="text-xs font-medium text-slate-400 mb-3">{app.subtitle}</div>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {app.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-white">
                    <span>Abrir aplicativo</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Access to Recent Work */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => onSelectApp('spreadsheet')}
            className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 cursor-pointer flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                  Última Planilha Ativa
                </div>
                <div className="text-xs text-slate-500">
                  Orçamento Financeiro · 35 linhas × 16 colunas
                </div>
              </div>
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-emerald-400 flex items-center gap-1">
              Continuar <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            onClick={() => onSelectApp('documents')}
            className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-blue-500/40 cursor-pointer flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-950/50 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200 group-hover:text-blue-300 transition-colors">
                  Último Documento Ativo
                </div>
                <div className="text-xs text-slate-500">
                  Proposta de Projeto - Suíte App · Formatado
                </div>
              </div>
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-blue-400 flex items-center gap-1">
              Continuar <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Local Storage & Suite Management Box */}
        <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-200">Armazenamento Local Contínuo</div>
              <div className="text-xs text-slate-500">
                Seus arquivos ficam salvos com segurança no armazenamento do navegador ({storageInfo.usedKb} KB utilizados).
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
              title="Restaurar backup com todas as planilhas, documentos e códigos"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar Backup</span>
            </button>

            <button
              onClick={handleDownloadBackup}
              className="px-3 py-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/30 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              title="Baixar cópia de segurança de todos os seus dados em um único arquivo JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Backup Completo</span>
            </button>
          </div>
        </div>

        {backupStatus && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{backupStatus}</span>
          </div>
        )}
      </div>
    </div>
  );
};
