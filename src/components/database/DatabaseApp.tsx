import React, { useState, useEffect, useMemo, useRef } from 'react';
import alasql from 'alasql';
import {
  Database,
  Play,
  RotateCcw,
  Download,
  Table as TableIcon,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Search,
  Code2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { QueryHistoryItem } from '../../types';
import { loadFromStorage, saveToStorage } from '../../utils/storage';

interface TableColumnInfo {
  name: string;
  type: string;
  isPk?: boolean;
}

interface TableSchemaInfo {
  name: string;
  rowCount: number;
  columns: TableColumnInfo[];
}

const SAMPLE_DATABASE_SEEDS = `
-- Criação de tabelas
CREATE TABLE IF NOT EXISTS clientes (
  id INT PRIMARY KEY,
  nome STRING,
  email STRING,
  cidade STRING,
  saldo DECIMAL
);

CREATE TABLE IF NOT EXISTS categorias (
  id INT PRIMARY KEY,
  nome STRING
);

CREATE TABLE IF NOT EXISTS produtos (
  id INT PRIMARY KEY,
  nome STRING,
  categoria_id INT,
  preco DECIMAL,
  estoque INT
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INT PRIMARY KEY,
  cliente_id INT,
  data STRING,
  valor_total DECIMAL,
  status STRING
);

-- Inserção de dados iniciais
INSERT INTO clientes VALUES 
  (1, 'Mariana Silva', 'mariana@email.com', 'São Paulo', 4500.00),
  (2, 'Carlos Oliveira', 'carlos.dev@email.com', 'Rio de Janeiro', 3200.50),
  (3, 'Beatriz Souza', 'beatriz@tech.com', 'Belo Horizonte', 8900.00),
  (4, 'Rafael Mendes', 'rafael@empresa.com', 'Curitiba', 1500.20),
  (5, 'Fernanda Lima', 'fernanda@design.com', 'Porto Alegre', 6100.00);

INSERT INTO categorias VALUES
  (1, 'Eletrônicos'),
  (2, 'Acessórios'),
  (3, 'Mobiliário');

INSERT INTO produtos VALUES
  (101, 'Monitor UltraWide 29"', 1, 1499.90, 15),
  (102, 'Teclado Mecânico RGB', 2, 389.00, 42),
  (103, 'Mouse Ergonômico Sem Fio', 2, 219.50, 60),
  (104, 'Cadeira Ergonômica Pro', 3, 1250.00, 8),
  (105, 'Mesa Regulável Elétrica', 3, 2400.00, 5),
  (106, 'Headset Noise Cancelling', 1, 899.00, 20);

INSERT INTO pedidos VALUES
  (1001, 1, '2026-10-12', 1719.40, 'Entregue'),
  (1002, 3, '2026-10-14', 3650.00, 'Entregue'),
  (1003, 2, '2026-10-18', 219.50, 'Enviado'),
  (1004, 5, '2026-10-25', 1250.00, 'Processando'),
  (1005, 1, '2026-11-01', 389.00, 'Processando');
`;

const PRESET_QUERIES = [
  {
    title: 'Listar Todos os Clientes',
    sql: 'SELECT id, nome, email, cidade, saldo FROM clientes ORDER BY saldo DESC;',
  },
  {
    title: 'Produtos com Categoria (JOIN)',
    sql: `SELECT 
  p.id, 
  p.nome AS produto, 
  c.nome AS categoria, 
  p.preco, 
  p.estoque,
  (p.preco * p.estoque) AS valor_estoque_total
FROM produtos p
JOIN categorias c ON p.categoria_id = c.id
ORDER BY valor_estoque_total DESC;`,
  },
  {
    title: 'Pedidos por Cliente com Total Gasto',
    sql: `SELECT 
  c.nome AS cliente, 
  c.cidade,
  COUNT(p.id) AS total_pedidos, 
  SUM(p.valor_total) AS total_gasto
FROM clientes c
LEFT JOIN pedidos p ON c.id = p.cliente_id
GROUP BY c.id, c.nome, c.cidade
ORDER BY total_gasto DESC;`,
  },
  {
    title: 'Inserir Novo Pedido',
    sql: `INSERT INTO pedidos VALUES (1006, 2, '2026-11-04', 1499.90, 'Processando');\nSELECT * FROM pedidos ORDER BY id DESC;`,
  },
];

export const DatabaseApp: React.FC = () => {
  const [queryInput, setQueryInput] = useState<string>(PRESET_QUERIES[1].sql);
  const [results, setResults] = useState<unknown[] | null>(null);
  const [executionStats, setExecutionStats] = useState<{
    durationMs: number;
    rowCount: number;
    timestamp: number;
    error?: string;
  } | null>(null);

  const [history, setHistory] = useState<QueryHistoryItem[]>(() => {
    return loadFromStorage<QueryHistoryItem[]>('db_query_history', []);
  });

  const [schemaTables, setSchemaTables] = useState<TableSchemaInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showNewTableModal, setShowNewTableModal] = useState<boolean>(false);
  const [newTableName, setNewTableName] = useState<string>('');
  const [newTableCols, setNewTableCols] = useState<{ name: string; type: string }[]>([
    { name: 'id', type: 'INT' },
    { name: 'nome', type: 'STRING' },
  ]);

  // Initialize DB on component mount
  useEffect(() => {
    initDatabase();
  }, []);

  const refreshSchema = () => {
    try {
      const tables: TableSchemaInfo[] = [];
      const alaTables = (alasql as any).tables;
      for (const tName in alaTables) {
        if (Object.prototype.hasOwnProperty.call(alaTables, tName)) {
          // Count rows
          const rows = alasql(`SELECT COUNT(*) as cnt FROM ${tName}`) as Array<{ cnt: number }>;
          const rowCount = rows?.[0]?.cnt || 0;
          
          // Get sample row to infer columns or table metadata
          const sample = alasql(`SELECT * FROM ${tName} LIMIT 1`) as Array<Record<string, unknown>>;
          const columns: TableColumnInfo[] = [];
          if (sample && sample[0]) {
            for (const colKey of Object.keys(sample[0])) {
              const val = sample[0][colKey];
              let colType: string = typeof val;
              if (colType === 'number') colType = Number.isInteger(val) ? 'INTEGER' : 'DECIMAL';
              else if (colType === 'string') colType = 'VARCHAR';
              else if (colType === 'boolean') colType = 'BOOLEAN';
              columns.push({ name: colKey, type: colType.toUpperCase(), isPk: colKey.toLowerCase() === 'id' });
            }
          }
          tables.push({ name: tName, rowCount, columns });
        }
      }
      setSchemaTables(tables);
    } catch (err) {
      console.error('Erro ao atualizar schema:', err);
    }
  };

  const initDatabase = (forceReset = false) => {
    try {
      if (forceReset) {
        alasql('DROP ALL TABLES');
      }
      alasql(SAMPLE_DATABASE_SEEDS);
      refreshSchema();
      // Execute default query
      runQuery(PRESET_QUERIES[1].sql);
    } catch (err) {
      console.error('Erro ao inicializar banco de dados:', err);
    }
  };

  const runQuery = (sqlToRun: string) => {
    const start = performance.now();
    try {
      // Split multiple statements if any
      const res = alasql(sqlToRun);
      const end = performance.now();
      const durationMs = Math.round((end - start) * 100) / 100;

      // Alasql might return an array of arrays if multiple statements
      const finalRows = Array.isArray(res) && Array.isArray(res[res.length - 1])
        ? res[res.length - 1]
        : Array.isArray(res)
        ? res
        : typeof res === 'number'
        ? [{ affectedRows: res }]
        : [{ result: String(res) }];

      setResults(finalRows);
      setExecutionStats({
        durationMs,
        rowCount: Array.isArray(finalRows) ? finalRows.length : 1,
        timestamp: Date.now(),
      });

      // Add to history
      const newHistoryItem: QueryHistoryItem = {
        id: 'hist-' + Date.now(),
        query: sqlToRun.trim(),
        timestamp: Date.now(),
        durationMs,
        rowCount: Array.isArray(finalRows) ? finalRows.length : 1,
        status: 'success',
      };
      setHistory((prev) => {
        const next = [newHistoryItem, ...prev.slice(0, 25)];
        saveToStorage('db_query_history', next);
        return next;
      });

      refreshSchema();
    } catch (err: unknown) {
      const end = performance.now();
      const durationMs = Math.round((end - start) * 100) / 100;
      const errMsg = err instanceof Error ? err.message : String(err);

      setResults(null);
      setExecutionStats({
        durationMs,
        rowCount: 0,
        timestamp: Date.now(),
        error: errMsg,
      });

      const newHistoryItem: QueryHistoryItem = {
        id: 'hist-' + Date.now(),
        query: sqlToRun.trim(),
        timestamp: Date.now(),
        durationMs,
        rowCount: 0,
        status: 'error',
        errorMessage: errMsg,
      };
      setHistory((prev) => {
        const next = [newHistoryItem, ...prev.slice(0, 25)];
        saveToStorage('db_query_history', next);
        return next;
      });
    }
  };

  const handleExecute = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryInput.trim()) return;
    runQuery(queryInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  // Export query results
  const handleExportCSV = () => {
    if (!results || results.length === 0) return;
    try {
      const keys = Object.keys(results[0] as object);
      const csvRows = [
        keys.join(','),
        ...results.map((row: any) =>
          keys.map((k) => JSON.stringify(row[k] ?? '')).join(',')
        ),
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consulta_sql_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Falha ao exportar CSV:', err);
    }
  };

  const handleExportJSON = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consulta_sql_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered rows for client search
  const filteredResults = useMemo(() => {
    if (!results) return null;
    if (!searchTerm.trim()) return results;
    const lower = searchTerm.toLowerCase();
    return results.filter((row: any) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(lower))
    );
  }, [results, searchTerm]);

  // Drop table
  const handleDropTable = (tableName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a tabela "${tableName}" e todos os seus registros?`)) {
      runQuery(`DROP TABLE ${tableName};`);
    }
  };

  // Export as SQL
  const handleExportSQL = () => {
    if (!results || results.length === 0) return;
    const sample = results[0] as Record<string, unknown>;
    const cols = Object.keys(sample);
    let sql = `-- Exportação SQL - Suíte app's\n`;
    sql += `-- Data: ${new Date().toLocaleString('pt-BR')}\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS dados_exportados (\n`;
    sql += cols.map((c) => `  ${c} TEXT`).join(',\n');
    sql += `\n);\n\n`;

    results.forEach((row: any) => {
      const vals = cols.map((c) => {
        const v = row[c];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return v;
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      sql += `INSERT INTO dados_exportados (${cols.join(', ')}) VALUES (${vals.join(', ')});\n`;
    });

    const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dados_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [sidebarTab, setSidebarTab] = useState<'schema' | 'history'>('schema');

  // Create Table wizard
  const handleCreateTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    const colsSql = newTableCols
      .map((c, i) => `${c.name} ${c.type}${i === 0 ? ' PRIMARY KEY' : ''}`)
      .join(', ');
    const createSql = `CREATE TABLE ${newTableName.trim()} (${colsSql});`;
    runQuery(createSql);
    setShowNewTableModal(false);
    setNewTableName('');
    setQueryInput(`SELECT * FROM ${newTableName.trim()};`);
  };

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 select-none">
      {/* Left Sidebar: Schema Explorer & Presets */}
      <div className="w-64 min-w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col shrink-0">
        {/* Sidebar Tabs */}
        <div className="flex border-b border-slate-800 text-xs font-semibold shrink-0">
          <button
            onClick={() => setSidebarTab('schema')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              sidebarTab === 'schema'
                ? 'border-purple-500 text-purple-300 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span>Tabelas</span>
          </button>
          <button
            onClick={() => setSidebarTab('history')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              sidebarTab === 'history'
                ? 'border-purple-500 text-purple-300 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Histórico ({history.length})</span>
          </button>
        </div>

        {sidebarTab === 'schema' ? (
          <>
            <div className="p-2 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-500">Schema Relacional</span>
              <button
                onClick={() => setShowNewTableModal(true)}
                className="px-2 py-0.5 text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 rounded flex items-center gap-1 border border-purple-500/20"
                title="Criar nova tabela"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Tabela</span>
              </button>
            </div>

            {/* Tables list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {schemaTables.map((t) => (
                <div
                  key={t.name}
                  className="p-2 rounded bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/40 transition-colors"
                >
                  <div
                    onClick={() => {
                      const sql = `SELECT * FROM ${t.name} LIMIT 50;`;
                      setQueryInput(sql);
                      runQuery(sql);
                    }}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-purple-300 group-hover:text-purple-200 truncate">
                      <TableIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded font-mono">
                        {t.rowCount} lins
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDropTable(t.name);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title={`Excluir tabela ${t.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Columns */}
                  {t.columns.length > 0 && (
                    <div className="mt-1.5 pl-3 border-l border-slate-800 space-y-0.5">
                      {t.columns.map((c) => (
                        <div key={c.name} className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span className={c.isPk ? 'text-amber-400 font-bold' : ''}>
                            {c.name} {c.isPk && '★'}
                          </span>
                          <span className="text-[9px] text-slate-600 uppercase">{c.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Preset Queries Section */}
              <div className="pt-3">
                <div className="px-1 text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Consultas de Exemplo</span>
                </div>
                <div className="space-y-1">
                  {PRESET_QUERIES.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQueryInput(p.sql);
                        runQuery(p.sql);
                      }}
                      className="w-full text-left p-2 rounded text-xs text-slate-300 hover:text-purple-300 hover:bg-slate-800/60 transition-colors truncate block"
                    >
                      <div className="font-medium truncate">{p.title}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* History View */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-500">Histórico de Execuções</span>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    setHistory([]);
                    saveToStorage('db_query_history', []);
                  }}
                  className="text-slate-500 hover:text-rose-400 text-[11px]"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {history.length > 0 ? (
                history.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => {
                      setQueryInput(h.query);
                      runQuery(h.query);
                    }}
                    className="p-2 rounded bg-slate-950/70 border border-slate-800 hover:border-purple-500/50 cursor-pointer transition-all"
                  >
                    <div className="font-mono text-xs text-purple-200 line-clamp-2 mb-1">
                      {h.query}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className={h.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>
                        {h.status === 'success' ? `${h.rowCount} lins` : 'Erro'}
                      </span>
                      <span>{h.durationMs}ms</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  Nenhuma consulta no histórico ainda.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Database reset button */}
        <div className="p-2 border-t border-slate-800 shrink-0">
          <button
            onClick={() => {
              if (window.confirm('Restaurar banco de dados original com dados de exemplo?')) {
                initDatabase(true);
              }
            }}
            className="w-full py-1.5 px-2 text-xs text-slate-400 hover:text-purple-300 hover:bg-slate-800/80 rounded flex items-center justify-center gap-1.5 transition-colors border border-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Base</span>
          </button>
        </div>
      </div>

      {/* Main Query Editor & Results Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor Box */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/40 flex flex-col shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Editor SQL</span>
              <span className="text-[11px] text-slate-500 font-mono">Pressione Ctrl+Enter para executar</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQueryInput('')}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Limpar
              </button>
              <button
                onClick={handleExecute}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Executar SQL</span>
              </button>
            </div>
          </div>

          <textarea
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            placeholder="Escreva consultas SQL aqui (SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, JOIN, GROUP BY...)"
            className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg p-3 text-xs font-mono text-purple-200 focus:outline-none resize-none leading-relaxed"
            spellCheck={false}
          />

          {/* Execution Bar */}
          {executionStats && (
            <div className="mt-2 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                {executionStats.error ? (
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Erro: {executionStats.error}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sucesso: {executionStats.rowCount} linha(s) retornada(s)</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{executionStats.durationMs} ms</span>
              </div>
            </div>
          )}
        </div>

        {/* Results Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Grade de Resultados</span>
            {filteredResults && (
              <span className="text-slate-500 font-mono">({filteredResults.length} registros)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar resultados..."
                className="pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-purple-500 w-44 font-sans"
              />
            </div>

            <button
              onClick={handleExportCSV}
              disabled={!results || results.length === 0}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded flex items-center gap-1 transition-colors"
              title="Exportar dados como CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleExportJSON}
              disabled={!results || results.length === 0}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded flex items-center gap-1 transition-colors"
              title="Exportar dados como JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>

            <button
              onClick={handleExportSQL}
              disabled={!results || results.length === 0}
              className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 disabled:opacity-50 text-purple-300 rounded flex items-center gap-1 transition-colors shadow-sm"
              title="Exportar dados como script SQL INSERT"
            >
              <Download className="w-3.5 h-3.5" />
              <span>SQL</span>
            </button>
          </div>
        </div>

        {/* Table Results Viewport */}
        <div className="flex-1 overflow-auto bg-slate-950">
          {filteredResults && filteredResults.length > 0 ? (
            <table className="w-full border-collapse text-xs font-mono">
              <thead>
                <tr className="sticky top-0 bg-slate-900 text-slate-300 border-b border-slate-800 shadow-sm z-10">
                  <th className="w-10 px-2 py-2 text-center text-slate-500 border-r border-slate-800">#</th>
                  {Object.keys(filteredResults[0] as object).map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-semibold border-r border-slate-800">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((row: any, rIdx) => (
                  <tr key={rIdx} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                    <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-800/60 select-none">
                      {rIdx + 1}
                    </td>
                    {Object.keys(filteredResults[0] as object).map((col) => (
                      <td
                        key={col}
                        className="px-3 py-1.5 border-r border-slate-800/60 text-slate-300 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs"
                      >
                        {row[col] === null || row[col] === undefined
                          ? <span className="text-slate-600 italic">null</span>
                          : typeof row[col] === 'boolean'
                          ? <span className="text-amber-400">{String(row[col])}</span>
                          : typeof row[col] === 'number'
                          ? <span className="text-emerald-400 tabular-nums">{row[col]}</span>
                          : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
              <TableIcon className="w-12 h-12 stroke-[1.5] mb-3 text-slate-700" />
              <p className="text-sm font-medium text-slate-400 mb-1">Nenhum resultado para exibir</p>
              <p className="text-xs text-slate-600 max-w-md">
                Execute uma consulta SQL acima para visualizar dados relacionais, criar novas tabelas ou manipular registros no navegador.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Visual Table Creator */}
      {showNewTableModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" />
              <span>Criar Nova Tabela SQL</span>
            </h3>

            <form onSubmit={handleCreateTableSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Nome da Tabela</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: tarefas, fornecedores..."
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded px-3 py-1.5 text-xs text-slate-200 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-2">Colunas</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {newTableCols.map((col, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Nome da coluna"
                        value={col.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTableCols((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, name: val } : c))
                          );
                        }}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 outline-none font-mono"
                      />
                      <select
                        value={col.type}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTableCols((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, type: val } : c))
                          );
                        }}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none font-mono"
                      >
                        <option value="INT">INT (ID)</option>
                        <option value="STRING">STRING</option>
                        <option value="DECIMAL">DECIMAL</option>
                        <option value="BOOLEAN">BOOLEAN</option>
                        <option value="DATE">DATE</option>
                      </select>
                      {newTableCols.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewTableCols((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setNewTableCols((prev) => [...prev, { name: '', type: 'STRING' }])}
                  className="mt-2 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar coluna</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTableModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg"
                >
                  Criar Tabela
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
