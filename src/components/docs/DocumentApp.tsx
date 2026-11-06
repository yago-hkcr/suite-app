import React, { useState, useEffect, useRef } from 'react';
import { Document as WordDocument, HeadingLevel, Packer, Paragraph } from 'docx';
import {
  FileText,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Download,
  Printer,
  Table as TableIcon,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  RemoveFormatting,
  Type,
  CheckSquare,
  FileCode,
  Sparkles,
  Link2,
  Image as ImageIcon,
  Palette,
  Highlighter,
  FileDown,
  Minus,
  Search,
  Replace,
  X,
} from 'lucide-react';
import { loadFromStorage, saveToStorage } from '../../utils/storage';
import { markdownToHtml, repairInlineMarkdownHtml } from '../../utils/markdownToHtml';

interface DocumentFile {
  id: string;
  title: string;
  contentHtml: string;
  updatedAt: number;
}

const DEFAULT_SAMPLE_DOC: DocumentFile = {
  id: 'doc-1',
  title: 'Proposta de Projeto - Suíte App',
  updatedAt: Date.now(),
  contentHtml: `
    <h1>Plano Estratégico & Escopo de Desenvolvimento</h1>
    <p>Bem-vindo ao <strong>Documentos</strong>, o processador de texto rico integrado da plataforma <em>Suíte app's</em>. Este editor funciona totalmente no navegador, sem necessidade de servidores externos ou instalação de plugins.</p>
    
    <h2>1. Objetivos do Ecossistema</h2>
    <p>O ecossistema foi projetado para unificar produtividade e computação técnica em um ambiente ágil, seguro e com salvamento automático persistente.</p>
    
    <ul>
      <li><strong>Planilhas:</strong> Motor com recálculo vetorial e fórmulas financeiras (SOMA, MÉDIA, SE).</li>
      <li><strong>Documentos:</strong> Editor WYSIWYG completo com exportação HTML, TXT e impressão para PDF.</li>
      <li><strong>Banco de Dados:</strong> Motor SQL relacional em memória com visualizador de schemas.</li>
      <li><strong>Editor de Código:</strong> Ambiente multi-linguagem (JavaScript, Python, SQL, Lua, HTML/CSS).</li>
      <li><strong>Paint Studio:</strong> Tela de desenho vetorial e matricial com preenchimento e exportação.</li>
    </ul>

    <h2>2. Tabela de Prazos e Marcos</h2>
    <p>Abaixo está o cronograma detalhado de entrega das fases:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background: rgba(59, 130, 246, 0.15); border-bottom: 2px solid rgba(59, 130, 246, 0.4);">
          <th style="padding: 8px 12px; text-align: left;">Fase</th>
          <th style="padding: 8px 12px; text-align: left;">Módulo</th>
          <th style="padding: 8px 12px; text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
          <td style="padding: 8px 12px;">Fase 1</td>
          <td style="padding: 8px 12px;">Núcleo de Planilhas e Fórmulas</td>
          <td style="padding: 8px 12px; text-align: center; color: #10B981;">Concluído</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
          <td style="padding: 8px 12px;">Fase 2</td>
          <td style="padding: 8px 12px;">Editor de Documentos e Relatórios</td>
          <td style="padding: 8px 12px; text-align: center; color: #10B981;">Concluído</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px;">Fase 3</td>
          <td style="padding: 8px 12px;">Consultas SQL e Executor de Código</td>
          <td style="padding: 8px 12px; text-align: center; color: #10B981;">Concluído</td>
        </tr>
      </tbody>
    </table>

    <blockquote>
      "A simplicidade é o último grau de sofisticação." — Leonardo da Vinci
    </blockquote>
    <p>Você pode editar livremente este documento, formatar textos, inserir novas tabelas e exportar para PDF ou arquivo HTML a qualquer momento.</p>
  `,
};

export const DocumentApp: React.FC = () => {
  const [docs, setDocs] = useState<DocumentFile[]>(() => {
    const storedDocs = loadFromStorage<DocumentFile[]>('documents_list', [DEFAULT_SAMPLE_DOC]);
    return storedDocs.map((doc) => ({ ...doc, contentHtml: repairInlineMarkdownHtml(doc.contentHtml) }));
  });

  const [activeDocId, setActiveDocId] = useState<string>(docs[0]?.id || 'doc-1');
  const [saveStatus, setSaveStatus] = useState<string>('Salvo');
  const editorRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);
  const [readingTimeMin, setReadingTimeMin] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'a4' | 'full'>('a4');
  const [activeBlock, setActiveBlock] = useState<string>('p');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [isStrike, setIsStrike] = useState<boolean>(false);
  const savedSelectionRef = useRef<Range | null>(null);

  // Advanced options: Font family, Font size, Search & Replace
  const [selectedFont, setSelectedFont] = useState<string>('Plus Jakarta Sans');
  const [selectedFontSize, setSelectedFontSize] = useState<string>('16px');
  const [showDocSearch, setShowDocSearch] = useState<boolean>(false);
  const [docSearchTerm, setDocSearchTerm] = useState<string>('');
  const [docReplaceTerm, setDocReplaceTerm] = useState<string>('');
  const [docMatchCount, setDocMatchCount] = useState<number>(0);

  const activeDoc = docs.find((d) => d.id === activeDocId) || docs[0];

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedSelectionRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  };

  const updateActiveFormats = () => {
    saveSelection();
    try {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
      setIsStrike(document.queryCommandState('strikeThrough'));

      const sel = window.getSelection();
      if (sel && sel.anchorNode && editorRef.current) {
        let n: Node | null = sel.anchorNode;
        let detected = 'p';
        while (n && n !== editorRef.current) {
          const tag = (n as HTMLElement).tagName?.toLowerCase();
          if (['h1', 'h2', 'h3', 'blockquote', 'p'].includes(tag || '')) {
            detected = tag;
            break;
          }
          n = n.parentNode;
        }
        setActiveBlock(detected);
      }
    } catch {
      // Ignore
    }
  };

  // Update editor innerHTML when active doc changes
  useEffect(() => {
    if (editorRef.current && activeDoc) {
      if (editorRef.current.innerHTML !== activeDoc.contentHtml) {
        editorRef.current.innerHTML = activeDoc.contentHtml;
        updateCounts(editorRef.current.innerText || '');
      }
    }
  }, [activeDocId]);

  // Debounced auto-save
  useEffect(() => {
    setSaveStatus('Salvando...');
    const timer = setTimeout(() => {
      saveToStorage('documents_list', docs);
      setSaveStatus('Salvo no navegador');
    }, 400);
    return () => clearTimeout(timer);
  }, [docs]);

  useEffect(() => {
    const applyAiDocument = (event: Event) => {
      const action = (event as CustomEvent<{ title?: string; content?: string }>).detail;
      if (!action?.content) return;
      const contentHtml = markdownToHtml(action.content);
      const id = `doc-${Date.now()}`;
      setDocs((prev) => [...prev, { id, title: action.title || 'Documento criado pela IA', contentHtml, updatedAt: Date.now() }]);
      setActiveDocId(id);
    };
    window.addEventListener('suite:apply-ai-action', applyAiDocument);
    return () => window.removeEventListener('suite:apply-ai-action', applyAiDocument);
  }, []);

  const updateCounts = (text: string) => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    setWordCount(words);
    setCharCount(chars);
    setReadingTimeMin(Math.max(1, Math.ceil(words / 200)));
  };

  const handleContentInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText || '';
    updateCounts(text);

    setDocs((prev) =>
      prev.map((doc) =>
        doc.id === activeDocId
          ? {
              ...doc,
              contentHtml: html,
              updatedAt: Date.now(),
            }
          : doc
      )
    );
  };

  // Rich Text Commands
  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
    }
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      handleContentInput();
    }
    updateActiveFormats();
  };

  // Heading and Block Formatter (H1, H2, H3, P, Blockquote)
  const applyFormatBlock = (tag: 'h1' | 'h2' | 'h3' | 'p' | 'blockquote') => {
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
    }

    let success = false;
    try {
      success = document.execCommand('formatBlock', false, `<${tag}>`);
    } catch {
      success = false;
    }

    if (!success) {
      try {
        success = document.execCommand('formatBlock', false, tag);
      } catch {
        success = false;
      }
    }

    // Direct DOM element conversion fallback if execCommand was a no-op
    const sel = window.getSelection();
    if (sel && sel.anchorNode && editorRef.current) {
      let node: Node | null = sel.anchorNode;
      while (
        node &&
        node !== editorRef.current &&
        !['P', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'DIV'].includes(
          (node as HTMLElement).tagName || ''
        )
      ) {
        node = node.parentNode;
      }

      if (node && node !== editorRef.current && node.parentNode) {
        const currentTag = (node as HTMLElement).tagName?.toLowerCase();
        if (currentTag !== tag) {
          const replacement = document.createElement(tag);
          while (node.firstChild) {
            replacement.appendChild(node.firstChild);
          }
          node.parentNode.replaceChild(replacement, node);
          const newRange = document.createRange();
          newRange.selectNodeContents(replacement);
          newRange.collapse(false);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
    }

    setActiveBlock(tag);
    handleContentInput();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Insert Table
  const handleInsertTable = () => {
    saveSelection();
    const rows = prompt('Quantidade de linhas da tabela:', '3');
    const cols = prompt('Quantidade de colunas da tabela:', '3');
    const r = parseInt(rows || '0', 10);
    const c = parseInt(cols || '0', 10);
    if (r <= 0 || c <= 0) return;

    let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 12px 0;"><thead><tr>';
    for (let j = 0; j < c; j++) {
      tableHtml += `<th style="border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; background: rgba(255,255,255,0.06); text-align: left;">Cabeçalho ${j + 1}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';
    for (let i = 0; i < r; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < c; j++) {
        tableHtml += `<td style="border: 1px solid rgba(255,255,255,0.15); padding: 8px 12px;">Célula ${i + 1},${j + 1}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p></p>';
    execCmd('insertHTML', tableHtml);
  };

  // Export to HTML
  const handleExportHTML = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${activeDoc.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1 { font-size: 2.2em; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h2 { font-size: 1.6em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; }
    th { background: #f1f5f9; }
    blockquote { border-left: 4px solid #3b82f6; margin: 16px 0; padding: 8px 16px; background: #f8fafc; color: #475569; }
  </style>
</head>
<body>
  ${activeDoc.contentHtml}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.title.toLowerCase().replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as Plain Text / Markdown
  const handleExportTxt = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.title.toLowerCase().replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportWord = async () => {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(activeDoc.contentHtml, 'text/html');
    const paragraphs = Array.from(parsed.body.querySelectorAll('h1,h2,h3,p,li,blockquote,pre'))
      .map((node) => {
        const text = node.textContent?.trim() || '';
        const tag = node.tagName.toLowerCase();
        if (!text) return new Paragraph({ text: '' });
        if (tag === 'h1') return new Paragraph({ text, heading: HeadingLevel.HEADING_1 });
        if (tag === 'h2') return new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
        if (tag === 'h3') return new Paragraph({ text, heading: HeadingLevel.HEADING_3 });
        if (tag === 'li') return new Paragraph({ text: `• ${text}` });
        return new Paragraph({ text });
      });
    const doc = new WordDocument({ sections: [{ children: [new Paragraph({ text: activeDoc.title, heading: HeadingLevel.TITLE }), ...paragraphs] }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `${activeDoc.title.toLowerCase().replace(/[^a-z0-9]+/gi, '_')}.docx`; link.click();
    URL.revokeObjectURL(url);
  };

  // Insert Link
  const handleInsertLink = () => {
    saveSelection();
    const url = prompt('Digite a URL do link:', 'https://');
    if (url && url !== 'https://') {
      execCmd('createLink', url);
    }
  };

  // Insert Image URL
  const handleInsertImage = () => {
    saveSelection();
    const url = prompt('Cole a URL da imagem ou utilize um link web:', 'https://');
    if (url && url !== 'https://') {
      execCmd('insertImage', url);
    }
  };

  // Insert Horizontal Rule (Linha Divisória)
  const handleInsertHorizontalRule = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
    }
    document.execCommand('insertHorizontalRule', false, undefined);
    handleContentInput();
  };

  // Insert Interactive Checklist / Task item
  const handleInsertChecklist = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
    }
    const taskHtml = `<div class="task-item"><input type="checkbox" /> <span>Nova tarefa a realizar...</span></div><p><br></p>`;
    document.execCommand('insertHTML', false, taskHtml);
    handleContentInput();
  };

  // Insert Formatted Code Block
  const handleInsertCodeBlock = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
    }
    const codeHtml = `<pre><code>// Bloco de código\nfunction exemplo() {\n  return "Suíte app's";\n}</code></pre><p><br></p>`;
    document.execCommand('insertHTML', false, codeHtml);
    handleContentInput();
  };

  // Font Family handler
  const handleFontFamilyChange = (font: string) => {
    setSelectedFont(font);
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
    }
    document.execCommand('fontName', false, font);
    handleContentInput();
  };

  // Font Size handler
  const handleFontSizeChange = (size: string) => {
    setSelectedFontSize(size);
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
    }
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const span = document.createElement('span');
      span.style.fontSize = size;
      span.appendChild(sel.getRangeAt(0).extractContents());
      sel.getRangeAt(0).insertNode(span);
    } else {
      const sizeMap: Record<string, string> = {
        '12px': '1',
        '14px': '2',
        '16px': '3',
        '18px': '4',
        '20px': '5',
        '24px': '6',
        '32px': '7',
      };
      document.execCommand('fontSize', false, sizeMap[size] || '3');
    }
    handleContentInput();
  };

  // Search & Replace handlers for Document
  const handleDocSearchChange = (term: string) => {
    setDocSearchTerm(term);
    if (!term.trim() || !editorRef.current) {
      setDocMatchCount(0);
      return;
    }
    const text = editorRef.current.innerText || '';
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = text.match(regex);
    setDocMatchCount(matches ? matches.length : 0);
  };

  const handleDocReplaceAll = () => {
    if (!editorRef.current || !docSearchTerm) return;
    const regex = new RegExp(docSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    editorRef.current.innerHTML = editorRef.current.innerHTML.replace(regex, docReplaceTerm);
    handleContentInput();
    setDocMatchCount(0);
    setDocSearchTerm('');
  };

  // Print / PDF Export
  const handlePrintPDF = () => {
    window.print();
  };

  // Document Management
  const handleCreateNewDoc = () => {
    const id = 'doc-' + Date.now();
    const newDoc: DocumentFile = {
      id,
      title: `Novo Documento ${docs.length + 1}`,
      contentHtml: '<h1>Título do Documento</h1><p>Comece a escrever seu texto aqui...</p>',
      updatedAt: Date.now(),
    };
    setDocs((prev) => [...prev, newDoc]);
    setActiveDocId(id);
  };

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-slate-950 text-slate-100 select-none">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <input
              type="text"
              value={activeDoc.title}
              onChange={(e) => {
                const val = e.target.value;
                setDocs((prev) =>
                  prev.map((d) => (d.id === activeDocId ? { ...d, title: val } : d))
                );
              }}
              className="font-semibold text-sm bg-transparent border border-transparent hover:border-slate-700 focus:border-blue-500 rounded px-1.5 py-0.5 text-slate-100 focus:outline-none transition-colors"
            />
            <div className="text-xs text-slate-500 px-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>{saveStatus}</span>
              <span>·</span>
              <span>{wordCount} palavras</span>
              <span>·</span>
              <span>{charCount} caracteres</span>
              <span>·</span>
              <span>~{readingTimeMin} min de leitura</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          {/* View mode toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'a4' ? 'full' : 'a4')}
            className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            title="Alternar entre modo Página A4 e Largura Total"
          >
            {viewMode === 'a4' ? 'Modo Expandido' : 'Modo Folha A4'}
          </button>

          <button
            onClick={() => setShowDocSearch((v) => !v)}
            className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg flex items-center gap-1.5 transition-colors ${
              showDocSearch
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700'
            }`}
            title="Localizar e Substituir texto no documento"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Localizar</span>
          </button>

          <button
            onClick={handleExportHTML}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
            title="Exportar documento como HTML independente"
          >
            <Download className="w-3.5 h-3.5" />
            <span>HTML</span>
          </button>

          <button
            onClick={handleExportWord}
            className="px-2.5 py-1.5 text-xs font-medium text-blue-300 hover:text-white bg-blue-950/40 hover:bg-blue-900/40 border border-blue-500/30 rounded-lg flex items-center gap-1.5"
            title="Baixar documento no formato Microsoft Word"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Word</span>
          </button>

          <button
            onClick={handleExportTxt}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
            title="Exportar como arquivo de texto puro (.txt)"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>TXT</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="px-2.5 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-950/40 hover:bg-blue-900/40 border border-blue-500/30 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            title="Imprimir ou Salvar como PDF via navegador"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF / Imprimir</span>
          </button>
        </div>
      </div>

      {/* Formatting Ribbon */}
      <div className="flex flex-wrap items-center gap-1 px-4 py-1.5 border-b border-slate-800 bg-slate-900/50 text-xs shrink-0">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-slate-800">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('undo')}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('redo')}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Font Family & Size */}
        <div className="flex items-center gap-1.5 px-2 border-r border-slate-800">
          <select
            value={selectedFont}
            onChange={(e) => handleFontFamilyChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs rounded px-2 py-1 outline-none focus:border-blue-500 cursor-pointer"
            title="Família da Fonte"
          >
            <option value="'Plus Jakarta Sans', system-ui, sans-serif">Padrão (Sans)</option>
            <option value="Georgia, serif">Georgia (Serif)</option>
            <option value="'JetBrains Mono', monospace">Mono (Código)</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="Arial, sans-serif">Arial</option>
          </select>

          <select
            value={selectedFontSize}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs rounded px-1.5 py-1 outline-none focus:border-blue-500 cursor-pointer"
            title="Tamanho da Fonte"
          >
            <option value="12px">12px</option>
            <option value="14px">14px</option>
            <option value="16px">16px</option>
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
            <option value="32px">32px</option>
          </select>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-800">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormatBlock('h1')}
            className={`p-1.5 rounded transition-colors font-bold ${
              activeBlock === 'h1'
                ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500'
                : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'
            }`}
            title="Título Principal (H1)"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormatBlock('h2')}
            className={`p-1.5 rounded transition-colors font-bold ${
              activeBlock === 'h2'
                ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500'
                : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'
            }`}
            title="Subtítulo (H2)"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormatBlock('h3')}
            className={`p-1.5 rounded transition-colors font-bold ${
              activeBlock === 'h3'
                ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500'
                : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'
            }`}
            title="Seção (H3)"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormatBlock('p')}
            className={`px-2 py-1 rounded transition-colors font-medium ${
              activeBlock === 'p'
                ? 'bg-slate-800 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Parágrafo normal"
          >
            Texto
          </button>
        </div>

        {/* Text styling */}
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-800">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('bold')}
            className={`p-1.5 rounded transition-colors font-bold ${
              isBold ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500' : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'
            }`}
            title="Negrito (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('italic')}
            className={`p-1.5 rounded transition-colors italic ${
              isItalic ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500' : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'
            }`}
            title="Itálico (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('underline')}
            className={`p-1.5 rounded transition-colors underline ${
              isUnderline ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500' : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'
            }`}
            title="Sublinhado (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('strikeThrough')}
            className={`p-1.5 rounded transition-colors ${
              isStrike ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500' : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'
            }`}
            title="Tachado"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-800">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('justifyLeft')}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
            title="Alinhar à Esquerda"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('justifyCenter')}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
            title="Centralizar"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('justifyRight')}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
            title="Alinhar à Direita"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('justifyFull')}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
            title="Justificar"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lists, Tasks, Blocks & Quotes */}
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-800">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('insertUnorderedList')}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
            title="Lista com marcadores"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('insertOrderedList')}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
            title="Lista numerada"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertChecklist}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
            title="Inserir Lista de Tarefas / Checklist interativo"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertHorizontalRule}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
            title="Inserir Linha Divisória horizontal"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertCodeBlock}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
            title="Inserir Bloco de Código formatado"
          >
            <FileCode className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormatBlock('blockquote')}
            className={`p-1.5 rounded transition-colors ${
              activeBlock === 'blockquote'
                ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500'
                : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'
            }`}
            title="Citação"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertTable}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
            title="Inserir Tabela"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertLink}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
            title="Inserir Link (URL)"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertImage}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
            title="Inserir Imagem via URL"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Text and Highlight Color */}
        <div className="flex items-center gap-1.5 px-2 border-r border-slate-800">
          <label
            className="flex items-center gap-1 cursor-pointer"
            title="Cor do Texto Selecionado"
            onMouseDown={saveSelection}
          >
            <span className="text-[11px] font-bold text-slate-400">A</span>
            <input
              type="color"
              defaultValue="#F8FAFC"
              onChange={(e) => {
                restoreSelection();
                execCmd('foreColor', e.target.value);
              }}
              className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
            />
          </label>
          <label
            className="flex items-center gap-1 cursor-pointer"
            title="Marca-Texto / Destaque de Fundo"
            onMouseDown={saveSelection}
          >
            <Highlighter className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="color"
              defaultValue="#F59E0B"
              onChange={(e) => {
                restoreSelection();
                const ok = document.execCommand('hiliteColor', false, e.target.value);
                if (!ok) document.execCommand('backColor', false, e.target.value);
                handleContentInput();
                updateActiveFormats();
              }}
              className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
            />
          </label>
        </div>

        {/* Clear formatting */}
        <div className="flex items-center gap-0.5 pl-2">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd('removeFormat')}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
            title="Limpar formatação da seleção"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search & Replace Floating Banner */}
      {showDocSearch && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/95 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-slate-200">Localizar:</span>
          </div>
          <input
            type="text"
            placeholder="Pesquisar no texto..."
            value={docSearchTerm}
            onChange={(e) => handleDocSearchChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1 text-slate-100 placeholder-slate-500 outline-none text-xs w-44"
          />
          <div className="flex items-center gap-1.5 text-slate-400">
            <Replace className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-200">Substituir por:</span>
          </div>
          <input
            type="text"
            placeholder="Novo texto..."
            value={docReplaceTerm}
            onChange={(e) => setDocReplaceTerm(e.target.value)}
            className="bg-slate-800 border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1 text-slate-100 placeholder-slate-500 outline-none text-xs w-44"
          />
          <button
            onClick={handleDocReplaceAll}
            disabled={!docSearchTerm || docMatchCount === 0}
            className="px-2.5 py-1 text-xs font-medium bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Substituir todas as ocorrências encontradas no documento"
          >
            Substituir Tudo
          </button>
          <div className="text-slate-400 text-xs px-2">
            {docSearchTerm ? (
              <span>
                <strong className="text-slate-200">{docMatchCount}</strong> ocorrência(s)
              </span>
            ) : (
              <span>Digite um termo para pesquisar</span>
            )}
          </div>
          <button
            onClick={() => {
              setShowDocSearch(false);
              setDocSearchTerm('');
              setDocMatchCount(0);
            }}
            className="ml-auto p-1 text-slate-400 hover:text-slate-200 rounded"
            title="Fechar barra de busca"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor Body Area */}
      <div className="flex-1 min-h-0 min-w-0 overflow-auto p-3 sm:p-4 md:p-8 flex justify-center bg-slate-950/80">
        <div
          id="printable-document"
          className={`w-full transition-all duration-200 ${
            viewMode === 'a4'
              ? 'max-w-[850px] min-h-[1100px] bg-slate-900 border border-slate-800 shadow-2xl rounded-xl p-4 sm:p-6 md:p-14'
              : 'max-w-5xl min-h-full bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-6 md:p-8'
          }`}
        >
          <div
            ref={editorRef}
            contentEditable
            onInput={handleContentInput}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onSelect={updateActiveFormats}
            suppressContentEditableWarning
            className="editor-content outline-none min-h-[800px] text-slate-200 font-sans leading-relaxed text-sm md:text-base prose prose-invert max-w-none focus:outline-none"
            style={{
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}
          />
        </div>
      </div>

      {/* Document tabs at bottom */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-slate-800 bg-slate-900/90 shrink-0 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {docs.map((d) => (
            <div
              key={d.id}
              onClick={() => setActiveDocId(d.id)}
              className={`flex items-center gap-2 px-3 py-1 rounded cursor-pointer transition-colors border ${
                activeDocId === d.id
                  ? 'bg-slate-800 text-blue-400 border-slate-700 font-medium'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
              }`}
            >
              <span className="truncate max-w-[150px]">{d.title}</span>
              {docs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Excluir documento "${d.title}"?`)) {
                      setDocs((prev) => prev.filter((item) => item.id !== d.id));
                      if (activeDocId === d.id) {
                        const rem = docs.filter((item) => item.id !== d.id);
                        if (rem[0]) setActiveDocId(rem[0].id);
                      }
                    }
                  }}
                  className="text-slate-500 hover:text-rose-400 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleCreateNewDoc}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Criar novo documento de texto"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="text-slate-500 text-xs hidden sm:block">
          Modo de visualização: <strong className="text-slate-300">{viewMode === 'a4' ? 'Página A4' : 'Largura Total'}</strong>
        </div>
      </div>
    </div>
  );
};
