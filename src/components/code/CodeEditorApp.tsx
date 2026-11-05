import React, { useState, useEffect, useRef } from 'react';
import alasql from 'alasql';
import {
  Code2,
  Play,
  RotateCcw,
  Copy,
  Trash2,
  FileCode,
  Terminal as TerminalIcon,
  Eye,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { loadFromStorage, saveToStorage } from '../../utils/storage';

type Language = 'javascript' | 'python' | 'html' | 'sql' | 'lua';

interface CodeFile {
  id: string;
  title: string;
  language: Language;
  code: string;
}

interface LogEntry {
  id: string;
  type: 'stdout' | 'stderr' | 'info' | 'warn';
  message: string;
  timestamp: number;
}

const DEFAULT_SNIPPETS: Record<Language, { title: string; code: string }> = {
  javascript: {
    title: 'algoritmos.js',
    code: `// Suíte app's - Executor JavaScript ES2026
console.log("Iniciando execução JavaScript no navegador...");

// 1. Algoritmo de Fibonacci
function fibonacci(n) {
  const seq = [0, 1];
  for (let i = 2; i < n; i++) {
    seq.push(seq[i - 1] + seq[i - 2]);
  }
  return seq;
}

const fib10 = fibonacci(10);
console.log("Sequência de Fibonacci (10 elementos):", fib10);

// 2. Processamento funcional de dados
const produtos = [
  { nome: "Teclado Mecânico", preco: 350, categoria: "Hardware" },
  { nome: "Mouse Gamer", preco: 180, categoria: "Hardware" },
  { nome: "Monitor 4K", preco: 2100, categoria: "Display" },
  { nome: "Cabo HDMI 2.1", preco: 45, categoria: "Cabos" }
];

const totalHardware = produtos
  .filter(p => p.categoria === "Hardware")
  .reduce((sum, p) => sum + p.preco, 0);

console.log("Total em produtos de Hardware: R$", totalHardware);

// 3. Teste assíncrono com Promise
async function simularRequisicao() {
  console.log("Simulando operação assíncrona...");
  return new Promise(resolve => {
    setTimeout(() => {
      resolve("Operação assíncrona finalizada com sucesso!");
    }, 400);
  });
}

simularRequisicao().then(msg => console.log(msg));
`,
  },
  python: {
    title: 'analise.py',
    code: `# Suíte app's - Executor Python 3
print("=== Análise de Dados em Python ===")

# Lista de pontuações de usuários
pontuacoes = [85, 92, 78, 90, 88, 76, 95, 89, 100, 82]

media = sum(pontuacoes) / len(pontuacoes)
maior = max(pontuacoes)
menor = min(pontuacoes)

print(f"Total de registros: {len(pontuacoes)}")
print(f"Média das pontuações: {media:.2f}")
print(f"Maior nota: {maior} | Menor nota: {menor}")

# List comprehension: notas acima de 88
destaques = [nota for nota in pontuacoes if nota >= 90]
print(f"Notas de excelência (>= 90): {destaques}")

# Dicionário com contagem
status = {
    "Aprovados": len([p for p in pontuacoes if p >= 70]),
    "Reprovados": len([p for p in pontuacoes if p < 70])
}
print("Estatísticas finais:", status)
`,
  },
  html: {
    title: 'preview.html',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 32px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    h1 {
      margin-top: 0;
      font-size: 24px;
      background: linear-gradient(135deg, #60a5fa, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
    }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover {
      background: #2563eb;
      transform: translateY(-2px);
    }
    .counter {
      font-size: 28px;
      font-weight: bold;
      color: #38bdf8;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Pré-visualização Viva</h1>
    <p>Este painel renderiza HTML, CSS e JavaScript diretamente no navegador em tempo real!</p>
    <div class="counter" id="counter">0</div>
    <button onclick="incrementar()">Contar Clique</button>
  </div>

  <script>
    let count = 0;
    function incrementar() {
      count++;
      document.getElementById('counter').innerText = count;
    }
  </script>
</body>
</html>
`,
  },
  sql: {
    title: 'queries.sql',
    code: `-- Consultas SQL integradas ao banco em memória
SELECT 
  'Suíte Apps' AS plataforma,
  100 AS funcionalidade_percent,
  'Navegador' AS ambiente;

-- Consulta agregada de exemplo
SELECT 
  'Desenvolvedor' AS cargo,
  COUNT(*) AS qtd_total,
  AVG(4500) AS media_salarial;
`,
  },
  lua: {
    title: 'script.lua',
    code: `-- Script Lua no navegador
print("=== Olá do Ambiente Lua 5.3 ===")

function calcular_fatorial(n)
  if n == 0 then
    return 1
  else
    return n * calcular_fatorial(n - 1)
  end
end

for i = 1, 6 do
  print(string.format("Fatorial de %d = %d", i, calcular_fatorial(i)))
end

-- Tabela e dicionário em Lua
usuario = {
  nome = "Lucas",
  nivel = 42,
  habilidades = {"JavaScript", "Python", "Lua", "SQL"}
}

print("Usuário: " .. usuario.nome .. " (Nível " .. usuario.nivel .. ")")
`,
  },
};

export const CodeEditorApp: React.FC = () => {
  const [currentLang, setCurrentLang] = useState<Language>('javascript');
  const [code, setCode] = useState<string>(() => {
    return loadFromStorage<string>('code_js_content', DEFAULT_SNIPPETS.javascript.code);
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [previewHtml, setPreviewHtml] = useState<string>(DEFAULT_SNIPPETS.html.code);
  const [viewMode, setViewMode] = useState<'terminal' | 'preview'>('terminal');
  const [fontSize, setFontSize] = useState<number>(12);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const isSwitchingLangRef = useRef<boolean>(false);

  // Switch language
  const handleLanguageChange = (lang: Language) => {
    if (lang === currentLang) return;
    // Save current code
    saveToStorage(`code_${currentLang}_content`, code);

    isSwitchingLangRef.current = true;
    setCurrentLang(lang);
    let loaded = loadFromStorage<string>(`code_${lang}_content`, DEFAULT_SNIPPETS[lang].code);
    if (lang === 'sql') {
      if (loaded.startsWith('//') || loaded.includes('fibonacci')) {
        loaded = DEFAULT_SNIPPETS.sql.code;
      }
      let needsSave = false;
      if (loaded.includes("'Suíte app's'")) {
        loaded = loaded.replace(/'Suíte app's'/g, "'Suíte Apps'");
        needsSave = true;
      }
      if (/\bAS\s+total\b/i.test(loaded)) {
        loaded = loaded.replace(/\bAS\s+total\b/gi, 'AS qtd_total');
        needsSave = true;
      }
      if (needsSave) {
        saveToStorage('code_sql_content', loaded);
      }
    }
    setCode(loaded);
    if (lang === 'html') {
      setViewMode('preview');
      setPreviewHtml(loaded);
    } else {
      setViewMode('terminal');
    }
  };

  useEffect(() => {
    const applyAiCode = (event: Event) => {
      const action = (event as CustomEvent<{ language?: Language; content?: string }>).detail;
      if (!action?.content || !action.language || !Object.prototype.hasOwnProperty.call(DEFAULT_SNIPPETS, action.language)) return;
      handleLanguageChange(action.language);
      setCode(action.content);
      saveToStorage(`code_${action.language}_content`, action.content);
      setLogs([]);
    };
    window.addEventListener('suite:apply-ai-action', applyAiCode);
    return () => window.removeEventListener('suite:apply-ai-action', applyAiCode);
  }, [currentLang, code]);

  // Auto-save code on change
  useEffect(() => {
    if (isSwitchingLangRef.current) {
      isSwitchingLangRef.current = false;
      return;
    }
    saveToStorage(`code_${currentLang}_content`, code);
    if (currentLang === 'html') {
      setPreviewHtml(code);
    }
  }, [code]);

  // Scroll to bottom of terminal when logs change
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: 'log-' + Math.random().toString(36).slice(2),
        type,
        message,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleClearTerminal = () => {
    setLogs([]);
    setExecutionTimeMs(null);
  };

  // Run Code
  const handleRunCode = async () => {
    setIsRunning(true);
    setLogs([]);
    const start = performance.now();

    try {
      if (currentLang === 'javascript') {
        await runJavaScript(code);
      } else if (currentLang === 'python') {
        await runPython(code);
      } else if (currentLang === 'sql') {
        runSQL(code);
      } else if (currentLang === 'lua') {
        await runLua(code);
      } else if (currentLang === 'html') {
        setPreviewHtml(code);
        setViewMode('preview');
        addLog('info', 'Pré-visualização HTML atualizada no painel.');
      }
      const end = performance.now();
      setExecutionTimeMs(Math.round((end - start) * 100) / 100);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog('stderr', errMsg);
      const end = performance.now();
      setExecutionTimeMs(Math.round((end - start) * 100) / 100);
    } finally {
      setIsRunning(false);
    }
  };

  // JavaScript execution
  const runJavaScript = async (source: string) => {
    // Intercept console functions
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    const serialize = (args: unknown[]) =>
      args
        .map((a) => {
          if (typeof a === 'object' && a !== null) {
            try {
              return JSON.stringify(a, null, 2);
            } catch {
              return String(a);
            }
          }
          return String(a);
        })
        .join(' ');

    console.log = (...args) => addLog('stdout', serialize(args));
    console.info = (...args) => addLog('info', serialize(args));
    console.warn = (...args) => addLog('warn', serialize(args));
    console.error = (...args) => addLog('stderr', serialize(args));

    try {
      // Async wrapper
      const asyncFn = new Function(`
        return (async () => {
          ${source}
        })();
      `);
      await asyncFn();
    } finally {
      console.log = originalLog;
      console.info = originalInfo;
      console.warn = originalWarn;
      console.error = originalError;
    }
  };

  // Python execution (Pyodide WebAssembly with pure JS fallback parser if network offline)
  const runPython = async (source: string) => {
    addLog('info', '[Python 3] Interpretando código no navegador...');
    
    // Check if Pyodide is already on window
    if ((window as any).loadPyodide) {
      try {
        if (!(window as any)._pyodideInstance) {
          addLog('info', 'Inicializando runtime Pyodide WebAssembly...');
          (window as any)._pyodideInstance = await (window as any).loadPyodide();
        }
        const py = (window as any)._pyodideInstance;
        py.setStdout({ batched: (msg: string) => addLog('stdout', msg) });
        py.setStderr({ batched: (msg: string) => addLog('stderr', msg) });
        await py.runPythonAsync(source);
        return;
      } catch (err: any) {
        addLog('stderr', err.message || String(err));
        return;
      }
    }

    // Try dynamic loading Pyodide from CDN
    try {
      if (!document.getElementById('pyodide-script')) {
        addLog('info', 'Carregando Pyodide via CDN...');
        const script = document.createElement('script');
        script.id = 'pyodide-script';
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(() => reject(new Error('Tempo limite de rede')), 5000);
        });
      }

      if ((window as any).loadPyodide) {
        const py = await (window as any).loadPyodide();
        (window as any)._pyodideInstance = py;
        py.setStdout({ batched: (msg: string) => addLog('stdout', msg) });
        py.setStderr({ batched: (msg: string) => addLog('stderr', msg) });
        await py.runPythonAsync(source);
        return;
      }
    } catch {
      // Offline fallback: Simulated Python 3 line evaluator for print and basic math
      addLog('info', '[Modo Offline] Executando emulador Python integrado...');
      const lines = source.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('print(') && trimmed.endsWith(')')) {
          const inner = trimmed.slice(6, -1);
          try {
            // Strip python string formatting or evaluate expressions
            const sanitized = inner.replace(/f(["'])/, '$1');
            const evalResult = Function(`"use strict"; try { return (${sanitized}); } catch { return ${JSON.stringify(inner)}; }`)();
            addLog('stdout', typeof evalResult === 'object' ? JSON.stringify(evalResult, null, 2) : String(evalResult));
          } catch {
            addLog('stdout', inner);
          }
        }
      }
    }
  };

  const renderSqlResultSet = (res: any) => {
    if (Array.isArray(res)) {
      if (res.length > 0 && typeof res[0] === 'object' && !Array.isArray(res[0])) {
        const keys = Object.keys(res[0]);
        addLog('stdout', '┌─ ' + keys.join(' ─┬─ ') + ' ─┐');
        res.forEach((row: any) => {
          const vals = keys.map((k) => String(row[k] ?? 'null'));
          addLog('stdout', '│  ' + vals.join('  │  ') + '  │');
        });
        addLog('stdout', '└─ ' + keys.map((k) => '─'.repeat(Math.max(4, k.length))).join('─┴─') + ' ─┘');
      } else {
        addLog('stdout', JSON.stringify(res, null, 2));
      }
    } else {
      addLog('stdout', String(res));
    }
  };

  // SQL execution
  const runSQL = (source: string) => {
    let sanitizedSource = source.replace(/'Suíte app's'/g, "'Suíte Apps'");
    sanitizedSource = sanitizedSource.replace(/\bAS\s+total\b/gi, 'AS qtd_total');
    const res = alasql(sanitizedSource);
    if (Array.isArray(res) && res.length > 0 && Array.isArray(res[0])) {
      res.forEach((batch, idx) => {
        if (res.length > 1) {
          addLog('info', `[Resultado #${idx + 1}]`);
        }
        renderSqlResultSet(batch);
      });
    } else {
      renderSqlResultSet(res);
    }
  };

  // Real Lua 5.3 execution via Fengari Web
  const runLua = async (source: string) => {
    addLog('info', '[Lua 5.3] Executando com máquina virtual Fengari no navegador...');
    try {
      const fengari = await import('fengari-web');
      const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;
      const L = lauxlib.luaL_newstate();
      lualib.luaL_openlibs(L);

      // Register print callback
      lua.lua_register(L, to_luastring('print'), (state: any) => {
        const n = lua.lua_gettop(state);
        const parts: string[] = [];
        for (let i = 1; i <= n; i++) {
          parts.push(to_jsstring(lauxlib.luaL_tolstring(state, i)));
          lua.lua_pop(state, 1);
        }
        addLog('stdout', parts.join('   '));
        return 0;
      });

      const status = lauxlib.luaL_dostring(L, to_luastring(source));
      if (status !== lua.LUA_OK) {
        const err = to_jsstring(lua.lua_tostring(L, -1));
        addLog('stderr', err || 'Erro na execução Lua');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog('stderr', `Erro ao executar Lua: ${errMsg}`);
    }
  };

  // Tab key indents in code editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunCode();
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetSnippet = () => {
    if (window.confirm('Restaurar o código de exemplo padrão desta linguagem?')) {
      setCode(DEFAULT_SNIPPETS[currentLang].code);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Code2 className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['javascript', 'python', 'html', 'sql', 'lua'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  currentLang === lang
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {currentLang === 'html' && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 mr-2">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  viewMode === 'preview' ? 'bg-slate-800 text-amber-400' : 'text-slate-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Visualizar</span>
              </button>
              <button
                onClick={() => setViewMode('terminal')}
                className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  viewMode === 'terminal' ? 'bg-slate-800 text-amber-400' : 'text-slate-400'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                <span>Terminal</span>
              </button>
            </div>
          )}

          <button
            onClick={handleResetSnippet}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Restaurar código de exemplo padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopyCode}
            className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? 'Executando...' : 'Executar'}</span>
          </button>
        </div>
      </div>

      {/* Editor & Output Split Screen */}
      <div className="code-workspace flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Code Editor Pane */}
        <div className="code-editor-pane flex-1 min-h-0 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 min-w-0">
          <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900/60 border-b border-slate-800 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-3">
              <span>{DEFAULT_SNIPPETS[currentLang].title}</span>
              <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
                <button
                  onClick={() => setFontSize((s) => Math.max(10, s - 1))}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300"
                  title="Diminuir fonte"
                >
                  A-
                </button>
                <span className="text-[10px] text-slate-500 w-6 text-center">{fontSize}px</span>
                <button
                  onClick={() => setFontSize((s) => Math.min(20, s + 1))}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300"
                  title="Aumentar fonte"
                >
                  A+
                </button>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">Atalho: Ctrl+Enter para rodar</span>
          </div>
          <div className="flex-1 relative bg-[#0d1117] overflow-hidden flex">
            {/* Line numbers */}
            <div
              className="w-10 py-3 bg-[#0d1117] border-r border-slate-800/60 text-right pr-2 text-slate-600 font-mono select-none"
              style={{ fontSize: `${fontSize}px`, lineHeight: `${Math.round(fontSize * 1.6)}px` }}
            >
              {code.split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            {/* Editor textarea */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 p-3 bg-transparent text-slate-200 font-mono outline-none resize-none overflow-auto"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: `${Math.round(fontSize * 1.6)}px`,
                tabSize: 2,
              }}
            />
          </div>
        </div>

        {/* Output Pane (Terminal or HTML Live Preview) */}
        <div className="code-output-pane w-full h-[38%] min-h-40 md:h-auto md:w-[45%] flex flex-col bg-slate-950 shrink-0 min-h-0">
          <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900/60 border-b border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-slate-300">
                {viewMode === 'preview' ? 'Visualizador HTML / CSS' : 'Terminal Integrado'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {executionTimeMs !== null && (
                <span className="text-slate-500 text-[11px] font-mono">{executionTimeMs} ms</span>
              )}
              {viewMode === 'terminal' && (
                <button
                  onClick={handleClearTerminal}
                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Limpar terminal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Terminal / Live View Content */}
          <div className="flex-1 overflow-auto bg-black/90 p-4 font-mono text-xs text-slate-300">
            {viewMode === 'preview' ? (
              <iframe
                title="Preview ao vivo"
                srcDoc={previewHtml}
                className="w-full h-full bg-slate-900 rounded border border-slate-800"
                sandbox="allow-scripts"
              />
            ) : logs.length > 0 ? (
              <div className="space-y-1.5">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`whitespace-pre-wrap leading-relaxed ${
                      log.type === 'stderr'
                        ? 'text-rose-400 bg-rose-950/20 px-2 py-1 rounded border-l-2 border-rose-500'
                        : log.type === 'warn'
                        ? 'text-amber-400'
                        : log.type === 'info'
                        ? 'text-cyan-400'
                        : 'text-slate-200'
                    }`}
                  >
                    {log.message}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center">
                <TerminalIcon className="w-8 h-8 stroke-[1.5] mb-2" />
                <p>Nenhuma saída gerada ainda.</p>
                <p className="text-[11px] text-slate-700">Clique em "Executar" para rodar o código.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
