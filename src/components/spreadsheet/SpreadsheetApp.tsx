import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  DollarSign,
  Percent,
  Hash,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Check,
  Palette,
  Underline,
  Sigma,
  ArrowUpAZ,
  ArrowDownAZ,
  Search,
  Replace,
  BarChart3,
  Grid3X3,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SheetGrid,
  CellData,
  colIndexToLetter,
  letterToColIndex,
  parseCellCoord,
  evaluateCell,
  formatCellValue,
  findAutoSumRange,
  sortGridRows,
} from '../../utils/spreadsheetEngine';
import { loadFromStorage, saveToStorage } from '../../utils/storage';

interface SheetDocument {
  id: string;
  name: string;
  updatedAt: number;
  rowCount: number;
  colCount: number;
  grid: SheetGrid;
}

const DEFAULT_ROWS = 35;
const DEFAULT_COLS = 16;

const DEFAULT_SAMPLE_SHEET: SheetGrid = {
  A1: { raw: 'RELATÓRIO FINANCEIRO MENSAL', format: { bold: true, type: 'general' } },
  A3: { raw: 'Receitas', format: { bold: true } },
  B3: { raw: 'Valor Previsto', format: { bold: true, align: 'right' } },
  C3: { raw: 'Valor Realizado', format: { bold: true, align: 'right' } },
  
  A4: { raw: 'Salário / Pró-labore' },
  B4: { raw: '8500', format: { type: 'currency_brl', align: 'right' } },
  C4: { raw: '8500', format: { type: 'currency_brl', align: 'right' } },

  A5: { raw: 'Consultoria e Freelas' },
  B5: { raw: '2000', format: { type: 'currency_brl', align: 'right' } },
  C5: { raw: '2750', format: { type: 'currency_brl', align: 'right' } },

  A6: { raw: 'Rendimentos e Dividendos' },
  B6: { raw: '450', format: { type: 'currency_brl', align: 'right' } },
  C6: { raw: '520', format: { type: 'currency_brl', align: 'right' } },

  A7: { raw: 'Total de Receitas', format: { bold: true } },
  B7: { raw: '=SOMA(B4:B6)', format: { bold: true, type: 'currency_brl', align: 'right' } },
  C7: { raw: '=SOMA(C4:C6)', format: { bold: true, type: 'currency_brl', align: 'right' } },

  A9: { raw: 'Despesas Fixas e Variáveis', format: { bold: true } },
  A10: { raw: 'Moradia e Condomínio' },
  B10: { raw: '2200', format: { type: 'currency_brl', align: 'right' } },
  C10: { raw: '2200', format: { type: 'currency_brl', align: 'right' } },

  A11: { raw: 'Alimentação e Mercado' },
  B11: { raw: '1800', format: { type: 'currency_brl', align: 'right' } },
  C11: { raw: '1940', format: { type: 'currency_brl', align: 'right' } },

  A12: { raw: 'Transporte e Combustível' },
  B12: { raw: '600', format: { type: 'currency_brl', align: 'right' } },
  C12: { raw: '550', format: { type: 'currency_brl', align: 'right' } },

  A13: { raw: 'Saúde e Seguros' },
  B13: { raw: '750', format: { type: 'currency_brl', align: 'right' } },
  C13: { raw: '750', format: { type: 'currency_brl', align: 'right' } },

  A14: { raw: 'Lazer e Assinaturas' },
  B14: { raw: '500', format: { type: 'currency_brl', align: 'right' } },
  C14: { raw: '420', format: { type: 'currency_brl', align: 'right' } },

  A15: { raw: 'Total de Despesas', format: { bold: true } },
  B15: { raw: '=SOMA(B10:B14)', format: { bold: true, type: 'currency_brl', align: 'right' } },
  C15: { raw: '=SOMA(C10:C14)', format: { bold: true, type: 'currency_brl', align: 'right' } },

  A17: { raw: 'Saldo Líquido Mensal', format: { bold: true } },
  B17: { raw: '=B7-B15', format: { bold: true, type: 'currency_brl', align: 'right' } },
  C17: { raw: '=C7-C15', format: { bold: true, type: 'currency_brl', align: 'right' } },

  A18: { raw: 'Média de Gastos', format: { italic: true } },
  B18: { raw: '=MÉDIA(B10:B14)', format: { italic: true, type: 'currency_brl', align: 'right' } },
  C18: { raw: '=MÉDIA(C10:C14)', format: { italic: true, type: 'currency_brl', align: 'right' } },

  A19: { raw: 'Status da Meta' },
  B19: { raw: '=SE(B17 > 4000; "Meta Superada"; "Abaixo da Meta")', format: { align: 'right' } },
  C19: { raw: '=SE(C17 > 4000; "Meta Superada"; "Abaixo da Meta")', format: { align: 'right', bold: true } },
};

export const SpreadsheetApp: React.FC = () => {
  const [sheets, setSheets] = useState<SheetDocument[]>(() => {
    return loadFromStorage<SheetDocument[]>('sheets_list', [
      {
        id: 'default-1',
        name: 'Orçamento Financeiro',
        updatedAt: Date.now(),
        rowCount: DEFAULT_ROWS,
        colCount: DEFAULT_COLS,
        grid: DEFAULT_SAMPLE_SHEET,
      },
    ]);
  });

  const [activeSheetId, setActiveSheetId] = useState<string>(sheets[0]?.id || 'default-1');
  const [activeCoord, setActiveCoord] = useState<string>('B4');
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const [formulaInput, setFormulaInput] = useState<string>('');
  const [isEditingCell, setIsEditingCell] = useState<boolean>(false);
  const [showFormulaHelper, setShowFormulaHelper] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('Salvo');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advanced features state: Borders, Search & Replace, Chart
  const [showBordersMenu, setShowBordersMenu] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [replaceTerm, setReplaceTerm] = useState<string>('');
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(0);
  const [showChartModal, setShowChartModal] = useState<boolean>(false);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'horizontal_bar'>('bar');

  const activeSheet = useMemo(() => {
    return sheets.find((s) => s.id === activeSheetId) || sheets[0];
  }, [sheets, activeSheetId]);

  // Global mouseup to release selection drag
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Compute selection box from start and end coordinates
  const selectionBox = useMemo(() => {
    const startCoord = selectionStart || activeCoord;
    const endCoord = selectionEnd || activeCoord;
    const start = parseCellCoord(startCoord);
    const end = parseCellCoord(endCoord);
    if (!start || !end) {
      const act = parseCellCoord(activeCoord);
      return {
        minCol: act?.col ?? 0,
        maxCol: act?.col ?? 0,
        minRow: act?.row ?? 1,
        maxRow: act?.row ?? 1,
        count: 1,
        coords: [activeCoord],
        rangeLabel: activeCoord,
      };
    }

    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);

    const coords: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        coords.push(`${colIndexToLetter(c)}${r}`);
      }
    }

    const rangeLabel =
      coords.length > 1
        ? `${colIndexToLetter(minCol)}${minRow}:${colIndexToLetter(maxCol)}${maxRow}`
        : activeCoord;

    return {
      minCol,
      maxCol,
      minRow,
      maxRow,
      count: coords.length,
      coords,
      rangeLabel,
    };
  }, [selectionStart, selectionEnd, activeCoord]);

  // Sync formula input when activeCoord changes
  useEffect(() => {
    if (activeSheet) {
      const cell = activeSheet.grid[activeCoord];
      setFormulaInput(cell?.raw ?? '');
    }
  }, [activeCoord, activeSheet]);

  // Auto-save debounced
  useEffect(() => {
    setSaveStatus('Salvando...');
    const timer = setTimeout(() => {
      saveToStorage('sheets_list', sheets);
      setSaveStatus('Salvo no navegador');
    }, 400);
    return () => clearTimeout(timer);
  }, [sheets]);

  // Compute values for cells on demand
  const computedGrid = useMemo(() => {
    if (!activeSheet) return {};
    const res: Record<string, string | number> = {};
    for (const key of Object.keys(activeSheet.grid)) {
      res[key] = evaluateCell(key, activeSheet.grid);
    }
    return res;
  }, [activeSheet]);

  // Real-time selection statistics (Sum, Average, Count of numbers)
  const selectionStats = useMemo(() => {
    if (selectionBox.count <= 1) return null;
    let numCount = 0;
    let sum = 0;
    for (const c of selectionBox.coords) {
      const val = computedGrid[c];
      if (typeof val === 'number' && !isNaN(val)) {
        sum += val;
        numCount++;
      } else if (typeof val === 'string' && val.trim() !== '' && !val.startsWith('#')) {
        const parsed = parseFloat(val.replace(/[R$\s.]/g, '').replace(',', '.'));
        if (!isNaN(parsed)) {
          sum += parsed;
          numCount++;
        }
      }
    }
    const avg = numCount > 0 ? sum / numCount : 0;
    return {
      cellCount: selectionBox.count,
      numCount,
      sum,
      avg,
    };
  }, [selectionBox, computedGrid]);

  const updateCell = useCallback(
    (coord: string, newRaw: string, formatUpdates?: Partial<CellData['format']>) => {
      setSheets((prev) =>
        prev.map((sheet) => {
          if (sheet.id !== activeSheetId) return sheet;
          const currentCell = sheet.grid[coord] || { raw: '' };
          const nextFormat = formatUpdates ? { ...currentCell.format, ...formatUpdates } : currentCell.format;
          const nextGrid = {
            ...sheet.grid,
            [coord]: {
              ...currentCell,
              raw: newRaw,
              format: nextFormat,
            },
          };
          return {
            ...sheet,
            updatedAt: Date.now(),
            grid: nextGrid,
          };
        })
      );
    },
    [activeSheetId]
  );

  const setCellFormat = useCallback(
    (formatUpdates: Partial<CellData['format']>) => {
      setSheets((prev) =>
        prev.map((sheet) => {
          if (sheet.id !== activeSheetId) return sheet;
          const targetCoords = selectionBox.coords.length > 0 ? selectionBox.coords : [activeCoord];
          const newGrid = { ...sheet.grid };
          for (const c of targetCoords) {
            const currentCell = newGrid[c] || { raw: '' };
            newGrid[c] = {
              ...currentCell,
              format: {
                ...currentCell.format,
                ...formatUpdates,
              },
            };
          }
          return {
            ...sheet,
            updatedAt: Date.now(),
            grid: newGrid,
          };
        })
      );
    },
    [activeSheetId, activeCoord, selectionBox.coords]
  );

  const handleFormulaSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateCell(activeCoord, formulaInput);
    setIsEditingCell(false);
  };

  const handleCellClick = (coord: string) => {
    if (coord !== activeCoord) {
      setActiveCoord(coord);
      setIsEditingCell(false);
    }
  };

  const handleCellDoubleClick = (coord: string) => {
    setActiveCoord(coord);
    setIsEditingCell(true);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, coord: string) => {
    if (isEditingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleFormulaSubmit();
        // Move to next row
        const parsed = parseCellCoord(coord);
        if (parsed) {
          setActiveCoord(`${parsed.letter}${parsed.row + 1}`);
        }
      } else if (e.key === 'Escape') {
        setIsEditingCell(false);
        setFormulaInput(activeSheet.grid[coord]?.raw ?? '');
      }
      return;
    }

    const parsed = parseCellCoord(coord);
    if (!parsed) return;

    if (e.key === 'ArrowUp' && parsed.row > 1) {
      e.preventDefault();
      const nextCoord = `${parsed.letter}${parsed.row - 1}`;
      setActiveCoord(nextCoord);
      setSelectionStart(nextCoord);
      setSelectionEnd(nextCoord);
    } else if (e.key === 'ArrowDown' && parsed.row < activeSheet.rowCount) {
      e.preventDefault();
      const nextCoord = `${parsed.letter}${parsed.row + 1}`;
      setActiveCoord(nextCoord);
      setSelectionStart(nextCoord);
      setSelectionEnd(nextCoord);
    } else if (e.key === 'ArrowLeft' && parsed.col > 0) {
      e.preventDefault();
      const nextCoord = `${colIndexToLetter(parsed.col - 1)}${parsed.row}`;
      setActiveCoord(nextCoord);
      setSelectionStart(nextCoord);
      setSelectionEnd(nextCoord);
    } else if (e.key === 'ArrowRight' && parsed.col < activeSheet.colCount - 1) {
      e.preventDefault();
      const nextCoord = `${colIndexToLetter(parsed.col + 1)}${parsed.row}`;
      setActiveCoord(nextCoord);
      setSelectionStart(nextCoord);
      setSelectionEnd(nextCoord);
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      setIsEditingCell(true);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (selectionBox.count > 1) {
        setSheets((prev) =>
          prev.map((sheet) => {
            if (sheet.id !== activeSheetId) return sheet;
            const newGrid = { ...sheet.grid };
            for (const c of selectionBox.coords) {
              delete newGrid[c];
            }
            return { ...sheet, grid: newGrid, updatedAt: Date.now() };
          })
        );
      } else {
        updateCell(coord, '');
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Start typing directly into cell
      setIsEditingCell(true);
      setFormulaInput(e.key);
      updateCell(coord, e.key);
    }
  };

  // Delete current active row
  const handleDeleteRow = () => {
    const parsed = parseCellCoord(activeCoord);
    if (!parsed || activeSheet.rowCount <= 1) return;
    const targetRow = parsed.row;

    setSheets((prev) =>
      prev.map((sheet) => {
        if (sheet.id !== activeSheetId) return sheet;
        const newGrid: SheetGrid = {};
        for (const [key, cell] of Object.entries(sheet.grid)) {
          const cParsed = parseCellCoord(key);
          if (!cParsed) continue;
          if (cParsed.row < targetRow) {
            newGrid[key] = cell;
          } else if (cParsed.row > targetRow) {
            newGrid[`${cParsed.letter}${cParsed.row - 1}`] = cell;
          }
          // Row equal to targetRow is omitted (deleted)
        }
        return {
          ...sheet,
          rowCount: Math.max(1, sheet.rowCount - 1),
          grid: newGrid,
          updatedAt: Date.now(),
        };
      })
    );
  };

  // Delete current active column
  const handleDeleteCol = () => {
    const parsed = parseCellCoord(activeCoord);
    if (!parsed || activeSheet.colCount <= 1) return;
    const targetCol = parsed.col;

    setSheets((prev) =>
      prev.map((sheet) => {
        if (sheet.id !== activeSheetId) return sheet;
        const newGrid: SheetGrid = {};
        for (const [key, cell] of Object.entries(sheet.grid)) {
          const cParsed = parseCellCoord(key);
          if (!cParsed) continue;
          if (cParsed.col < targetCol) {
            newGrid[key] = cell;
          } else if (cParsed.col > targetCol) {
            newGrid[`${colIndexToLetter(cParsed.col - 1)}${cParsed.row}`] = cell;
          }
        }
        return {
          ...sheet,
          colCount: Math.max(1, sheet.colCount - 1),
          grid: newGrid,
          updatedAt: Date.now(),
        };
      })
    );
  };

  // Add Row & Add Column
  const handleAddRow = () => {
    setSheets((prev) =>
      prev.map((s) => (s.id === activeSheetId ? { ...s, rowCount: s.rowCount + 5 } : s))
    );
  };

  const handleAddCol = () => {
    setSheets((prev) =>
      prev.map((s) => (s.id === activeSheetId ? { ...s, colCount: s.colCount + 3 } : s))
    );
  };

  // Clear current active sheet
  const handleClearSheet = () => {
    if (window.confirm('Tem certeza que deseja limpar todas as células desta planilha?')) {
      setSheets((prev) =>
        prev.map((s) => (s.id === activeSheetId ? { ...s, grid: {} } : s))
      );
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const data: (string | number)[][] = [];
    for (let r = 1; r <= activeSheet.rowCount; r++) {
      const rowData: (string | number)[] = [];
      let hasData = false;
      for (let c = 0; c < activeSheet.colCount; c++) {
        const coord = `${colIndexToLetter(c)}${r}`;
        const val = computedGrid[coord] ?? '';
        rowData.push(val);
        if (val !== '') hasData = true;
      }
      if (hasData || r <= 15) {
        data.push(rowData);
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSheet.name.toLowerCase().replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to XLSX
  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const data: (string | number)[][] = [];
    for (let r = 1; r <= activeSheet.rowCount; r++) {
      const rowData: (string | number)[] = [];
      let hasData = false;
      for (let c = 0; c < activeSheet.colCount; c++) {
        const coord = `${colIndexToLetter(c)}${r}`;
        const val = computedGrid[coord] ?? '';
        rowData.push(val);
        if (val !== '') hasData = true;
      }
      if (hasData || r <= 15) {
        data.push(rowData);
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, activeSheet.name.slice(0, 30));
    XLSX.writeFile(wb, `${activeSheet.name.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
  };

  // Import CSV / XLSX
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const newGrid: SheetGrid = {};
        let maxR = DEFAULT_ROWS;
        let maxC = DEFAULT_COLS;

        rawJson.forEach((row, rIdx) => {
          const rNum = rIdx + 1;
          if (rNum > maxR) maxR = rNum + 5;
          row.forEach((cellVal, cIdx) => {
            if (cIdx + 1 > maxC) maxC = cIdx + 3;
            if (cellVal !== undefined && cellVal !== null && cellVal !== '') {
              const letter = colIndexToLetter(cIdx);
              newGrid[`${letter}${rNum}`] = { raw: String(cellVal) };
            }
          });
        });

        const newSheet: SheetDocument = {
          id: 'imported-' + Date.now(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          updatedAt: Date.now(),
          rowCount: Math.max(DEFAULT_ROWS, maxR),
          colCount: Math.max(DEFAULT_COLS, maxC),
          grid: newGrid,
        };

        setSheets((prev) => [...prev, newSheet]);
        setActiveSheetId(newSheet.id);
      } catch (err) {
        console.error('Falha ao importar planilha:', err);
        alert('Não foi possível ler o arquivo. Verifique se é um arquivo CSV ou XLSX válido.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Sheet Management
  const handleCreateNewSheet = () => {
    const id = 'sheet-' + Date.now();
    const count = sheets.length + 1;
    const newSheet: SheetDocument = {
      id,
      name: `Planilha ${count}`,
      updatedAt: Date.now(),
      rowCount: DEFAULT_ROWS,
      colCount: DEFAULT_COLS,
      grid: {
        A1: { raw: 'Item' },
        B1: { raw: 'Quantidade' },
        C1: { raw: 'Preço' },
        D1: { raw: 'Total' },
        A2: { raw: 'Exemplo' },
        B2: { raw: '5' },
        C2: { raw: '10' },
        D2: { raw: '=B2*C2' },
      },
    };
    setSheets((prev) => [...prev, newSheet]);
    setActiveSheetId(id);
  };

  // Auto-Sum handler (Σ AutoSoma)
  const handleAutoSum = () => {
    const range = findAutoSumRange(activeCoord, activeSheet.grid);
    const formula = `=SOMA(${range || ''})`;
    setFormulaInput(formula);
    updateCell(activeCoord, formula);
    setIsEditingCell(true);
  };

  // Sort rows handler
  const handleSort = (ascending: boolean) => {
    const parsed = parseCellCoord(activeCoord);
    if (!parsed) return;
    const sortLetter = parsed.letter;

    let startR = 1;
    let endR = activeSheet.rowCount;
    let minC = 0;
    let maxC = activeSheet.colCount - 1;

    if (selectionBox.count > 1) {
      startR = selectionBox.minRow;
      endR = selectionBox.maxRow;
      minC = selectionBox.minCol;
      maxC = selectionBox.maxCol;
    }

    const sortedGrid = sortGridRows(
      activeSheet.grid,
      startR,
      endR,
      sortLetter,
      ascending,
      minC,
      maxC
    );

    setSheets((prev) =>
      prev.map((s) => (s.id === activeSheetId ? { ...s, grid: sortedGrid, updatedAt: Date.now() } : s))
    );
  };

  // Search & Replace handlers
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchMatches([]);
      setCurrentMatchIdx(0);
      return;
    }
    const lower = term.toLowerCase();
    const matches: string[] = [];
    for (const [coord, cell] of Object.entries(activeSheet.grid)) {
      const rawMatch = cell.raw?.toLowerCase().includes(lower);
      const computedMatch = String(computedGrid[coord] ?? '').toLowerCase().includes(lower);
      if (rawMatch || computedMatch) {
        matches.push(coord);
      }
    }
    setSearchMatches(matches);
    setCurrentMatchIdx(0);
    if (matches.length > 0) {
      setActiveCoord(matches[0]);
    }
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const next = (currentMatchIdx + 1) % searchMatches.length;
    setCurrentMatchIdx(next);
    setActiveCoord(searchMatches[next]);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prev = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIdx(prev);
    setActiveCoord(searchMatches[prev]);
  };

  const handleReplaceOne = () => {
    if (searchMatches.length === 0 || !searchTerm) return;
    const targetCoord = searchMatches[currentMatchIdx];
    const cell = activeSheet.grid[targetCoord];
    if (cell) {
      const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const updatedRaw = cell.raw.replace(regex, replaceTerm);
      updateCell(targetCoord, updatedRaw);
    }
    handleSearchChange(searchTerm);
  };

  const handleReplaceAll = () => {
    if (searchMatches.length === 0 || !searchTerm) return;
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    setSheets((prev) =>
      prev.map((sheet) => {
        if (sheet.id !== activeSheetId) return sheet;
        const newGrid = { ...sheet.grid };
        for (const coord of searchMatches) {
          if (newGrid[coord]) {
            newGrid[coord] = {
              ...newGrid[coord],
              raw: newGrid[coord].raw.replace(regex, replaceTerm),
            };
          }
        }
        return { ...sheet, grid: newGrid, updatedAt: Date.now() };
      })
    );
    setSearchMatches([]);
    setSearchTerm('');
  };

  // Chart data extraction
  const chartData = useMemo(() => {
    const coordsToUse = selectionBox.count > 1 ? selectionBox.coords : [];
    const items: { label: string; value: number }[] = [];

    if (coordsToUse.length > 1) {
      for (let r = selectionBox.minRow; r <= selectionBox.maxRow; r++) {
        const labelCoord = `${colIndexToLetter(selectionBox.minCol)}${r}`;
        const valCoord = `${colIndexToLetter(Math.min(selectionBox.maxCol, selectionBox.minCol + 1))}${r}`;
        const label = String(computedGrid[labelCoord] ?? `Linha ${r}`);
        const rawVal = computedGrid[valCoord] ?? activeSheet.grid[valCoord]?.raw ?? 0;
        const num = Number(String(rawVal).replace(/[R$\s.]/g, '').replace(',', '.'));
        if (!isNaN(num) && num > 0) {
          items.push({ label, value: num });
        }
      }
    }

    if (items.length === 0) {
      for (let r = 1; r <= activeSheet.rowCount; r++) {
        const labelCoord = `A${r}`;
        const valCoord = `B${r}`;
        const label = String(computedGrid[labelCoord] ?? activeSheet.grid[labelCoord]?.raw ?? '');
        const val = computedGrid[valCoord] ?? activeSheet.grid[valCoord]?.raw ?? '';
        const num = Number(String(val).replace(/[R$\s.]/g, '').replace(',', '.'));
        if (label && !isNaN(num) && num > 0 && !label.toLowerCase().includes('total')) {
          items.push({ label, value: num });
        }
      }
    }
    return items.slice(0, 12);
  }, [selectionBox, computedGrid, activeSheet]);

  const currentCellData = activeSheet.grid[activeCoord] || { raw: '' };
  const currentFormat = currentCellData.format || {};

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-slate-950 text-slate-100 select-none">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <input
              type="text"
              value={activeSheet.name}
              onChange={(e) => {
                const val = e.target.value;
                setSheets((prev) =>
                  prev.map((s) => (s.id === activeSheetId ? { ...s, name: val } : s))
                );
              }}
              className="font-semibold text-sm bg-transparent border border-transparent hover:border-slate-700 focus:border-emerald-500 rounded px-1.5 py-0.5 text-slate-100 focus:outline-none transition-colors"
            />
            <div className="text-xs text-slate-500 px-1.5 flex items-center gap-2">
              <span>{saveStatus}</span>
              <span>·</span>
              <span>{activeSheet.rowCount} linhas × {activeSheet.colCount} colunas</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".csv, .xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
            title="Importar planilha CSV ou XLSX"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar</span>
          </button>
          
          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
            title="Baixar planilha como arquivo CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportXLSX}
            className="px-2.5 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/30 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            title="Exportar pasta de trabalho em formato Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>XLSX</span>
          </button>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-lg transition-colors border ${
              showSearch
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:border-slate-700'
            }`}
            title="Localizar e Substituir células"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowChartModal(true)}
            className="px-2.5 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-950/40 hover:bg-blue-900/40 border border-blue-500/30 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            title="Gerar gráfico a partir dos dados da planilha"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Gráficos</span>
          </button>

          <button
            onClick={handleClearSheet}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40"
            title="Limpar planilha atual"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowFormulaHelper(!showFormulaHelper)}
            className={`p-1.5 rounded-lg transition-colors border ${
              showFormulaHelper
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:border-slate-700'
            }`}
            title="Guia de Fórmulas (SOMA, MÉDIA, SE, etc.)"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Formatting Ribbon */}
      <div className="flex flex-wrap items-center gap-1 px-4 py-1.5 border-b border-slate-800 bg-slate-900/50 text-xs shrink-0">
        {/* Font formatting */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
          <button
            onClick={() => setCellFormat({ bold: !currentFormat.bold })}
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
              currentFormat.bold ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400'
            }`}
            title="Negrito"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCellFormat({ italic: !currentFormat.italic })}
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
              currentFormat.italic ? 'bg-slate-800 text-emerald-400 italic' : 'text-slate-400'
            }`}
            title="Itálico"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCellFormat({ underline: !currentFormat.underline })}
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
              currentFormat.underline ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400'
            }`}
            title="Sublinhado"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          {/* Borders Menu */}
          <div className="relative">
            <button
              onClick={() => setShowBordersMenu(!showBordersMenu)}
              className={`p-1.5 rounded hover:bg-slate-800 transition-colors flex items-center gap-0.5 ${
                currentFormat.border && currentFormat.border !== 'none'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400'
              }`}
              title="Bordas da Célula"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            {showBordersMenu && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 p-1.5 flex flex-col gap-1 text-xs">
                <button
                  onClick={() => {
                    setCellFormat({ border: 'none' });
                    setShowBordersMenu(false);
                  }}
                  className="px-2 py-1 text-left hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                >
                  Sem borda
                </button>
                <button
                  onClick={() => {
                    setCellFormat({ border: 'all' });
                    setShowBordersMenu(false);
                  }}
                  className="px-2 py-1 text-left hover:bg-slate-800 rounded text-slate-300 hover:text-white flex items-center justify-between"
                >
                  <span>Todas as bordas</span>
                  <span className="w-3 h-3 border border-slate-400 inline-block"></span>
                </button>
                <button
                  onClick={() => {
                    setCellFormat({ border: 'box' });
                    setShowBordersMenu(false);
                  }}
                  className="px-2 py-1 text-left hover:bg-slate-800 rounded text-slate-300 hover:text-white flex items-center justify-between"
                >
                  <span>Borda externa</span>
                  <span className="w-3 h-3 border-2 border-cyan-400 inline-block"></span>
                </button>
                <button
                  onClick={() => {
                    setCellFormat({ border: 'bottom_double' });
                    setShowBordersMenu(false);
                  }}
                  className="px-2 py-1 text-left hover:bg-slate-800 rounded text-slate-300 hover:text-white flex items-center justify-between"
                >
                  <span>Borda inferior dupla</span>
                  <span className="w-3 h-1 border-b-2 border-double border-emerald-400 inline-block"></span>
                </button>
                <button
                  onClick={() => {
                    setCellFormat({ border: 'top_bottom' });
                    setShowBordersMenu(false);
                  }}
                  className="px-2 py-1 text-left hover:bg-slate-800 rounded text-slate-300 hover:text-white flex items-center justify-between"
                >
                  <span>Superior e inferior</span>
                  <span className="w-3 h-2 border-t border-b-2 border-slate-300 inline-block"></span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Calculations & Sorting */}
        <div className="flex items-center gap-1 px-2 border-r border-slate-800">
          <button
            onClick={handleAutoSum}
            className="px-2 py-1 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-emerald-950/40 border border-slate-700/80 hover:border-emerald-500/40 rounded flex items-center gap-1 font-semibold text-[11px] transition-colors"
            title="Inserir fórmula de Auto-Soma para células adjacentes (Σ)"
          >
            <Sigma className="w-3.5 h-3.5 text-emerald-400" />
            <span>AutoSoma</span>
          </button>
          <button
            onClick={() => handleSort(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Classificar valores em ordem crescente (A-Z ou 0-9)"
          >
            <ArrowUpAZ className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSort(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Classificar valores em ordem decrescente (Z-A ou 9-0)"
          >
            <ArrowDownAZ className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 px-2 border-r border-slate-800">
          <button
            onClick={() => setCellFormat({ align: 'left' })}
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
              currentFormat.align === 'left' || !currentFormat.align ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
            }`}
            title="Alinhar à Esquerda"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCellFormat({ align: 'center' })}
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
              currentFormat.align === 'center' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
            }`}
            title="Centralizar"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCellFormat({ align: 'right' })}
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
              currentFormat.align === 'right' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
            }`}
            title="Alinhar à Direita"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Number Formats */}
        <div className="flex items-center gap-1 px-2 border-r border-slate-800">
          <button
            onClick={() => setCellFormat({ type: 'general' })}
            className={`px-2 py-1 rounded transition-colors ${
              !currentFormat.type || currentFormat.type === 'general' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Formato Geral"
          >
            Geral
          </button>
          <button
            onClick={() => setCellFormat({ type: 'currency_brl' })}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-0.5 ${
              currentFormat.type === 'currency_brl' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Moeda Real (R$)"
          >
            <span>R$</span>
          </button>
          <button
            onClick={() => setCellFormat({ type: 'currency_usd' })}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-0.5 ${
              currentFormat.type === 'currency_usd' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Moeda Dólar ($)"
          >
            <DollarSign className="w-3 h-3" />
          </button>
          <button
            onClick={() => setCellFormat({ type: 'percent' })}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-0.5 ${
              currentFormat.type === 'percent' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Porcentagem (%)"
          >
            <Percent className="w-3 h-3" />
          </button>
          <button
            onClick={() => setCellFormat({ type: 'number_2' })}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-0.5 ${
              currentFormat.type === 'number_2' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="2 Casas Decimais (.00)"
          >
            <Hash className="w-3 h-3" />
          </button>
        </div>

        {/* Cell Colors (Text and Background) */}
        <div className="flex items-center gap-1.5 px-2 border-r border-slate-800">
          <label className="flex items-center gap-1 cursor-pointer" title="Cor do Texto da Célula">
            <span className="text-[11px] font-bold text-slate-400">A</span>
            <input
              type="color"
              value={currentFormat.color || '#F8FAFC'}
              onChange={(e) => setCellFormat({ color: e.target.value })}
              className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
            />
          </label>
          <label className="flex items-center gap-1 cursor-pointer" title="Cor de Preenchimento da Célula">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="color"
              value={currentFormat.bgColor || '#0B0F17'}
              onChange={(e) => setCellFormat({ bgColor: e.target.value })}
              className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
            />
          </label>
          {currentFormat.bgColor && (
            <button
              onClick={() => setCellFormat({ bgColor: undefined })}
              className="text-[10px] text-slate-500 hover:text-slate-300"
              title="Remover fundo"
            >
              ×
            </button>
          )}
        </div>

        {/* Grid expansion & deletion */}
        <div className="flex items-center gap-1 pl-2">
          <button
            onClick={handleAddRow}
            className="px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Adicionar 5 novas linhas ao fim da planilha"
          >
            +5 Lin
          </button>
          <button
            onClick={handleDeleteRow}
            className="px-2 py-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
            title="Excluir a linha ativa atualmente"
          >
            - Linha
          </button>
          <button
            onClick={handleAddCol}
            className="px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Adicionar 3 novas colunas ao fim da planilha"
          >
            +3 Col
          </button>
          <button
            onClick={handleDeleteCol}
            className="px-2 py-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
            title="Excluir a coluna ativa atualmente"
          >
            - Coluna
          </button>
        </div>
      </div>

      {/* Search & Replace Bar */}
      {showSearch && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-amber-500/30 bg-amber-950/20 text-xs shrink-0 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded px-2 py-1">
            <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <input
              type="text"
              placeholder="Localizar na planilha..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-transparent text-slate-100 placeholder-slate-500 outline-none w-36 text-xs"
              autoFocus
            />
            {searchMatches.length > 0 && (
              <span className="text-[10px] text-amber-300 font-mono bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                {currentMatchIdx + 1}/{searchMatches.length}
              </span>
            )}
            {searchTerm && searchMatches.length === 0 && (
              <span className="text-[10px] text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded">
                0 encontrados
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMatch}
              disabled={searchMatches.length === 0}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-300 font-medium transition-colors"
              title="Ir para o resultado anterior"
            >
              Anterior
            </button>
            <button
              onClick={handleNextMatch}
              disabled={searchMatches.length === 0}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-300 font-medium transition-colors"
              title="Ir para o próximo resultado"
            >
              Próxima
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded px-2 py-1">
            <Replace className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Substituir por..."
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              className="bg-transparent text-slate-100 placeholder-slate-500 outline-none w-36 text-xs"
            />
          </div>

          <button
            onClick={handleReplaceOne}
            disabled={searchMatches.length === 0 || !searchTerm}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-300 hover:text-white font-medium transition-colors"
            title="Substituir ocorrência selecionada"
          >
            Substituir
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={searchMatches.length === 0 || !searchTerm}
            className="px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 disabled:opacity-40 rounded font-medium transition-colors"
            title="Substituir todas as ocorrências na planilha"
          >
            Substituir Tudo
          </button>

          <button
            onClick={() => {
              setShowSearch(false);
              setSearchTerm('');
              setSearchMatches([]);
            }}
            className="p-1 text-slate-400 hover:text-white ml-auto rounded hover:bg-slate-800 transition-colors"
            title="Fechar busca"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Formula Bar */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-slate-800 bg-slate-900/30 shrink-0">
        {/* Active Coordinate or Selection Range Badge */}
        <div
          className="min-w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-xs font-mono font-bold text-emerald-400 select-none shadow-inner"
          title="Intervalo ou célula selecionada"
        >
          {selectionBox.rangeLabel}
        </div>
        <div className="text-slate-500 font-mono text-sm select-none italic font-serif">fx</div>
        <form onSubmit={handleFormulaSubmit} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={formulaInput}
            onChange={(e) => setFormulaInput(e.target.value)}
            onFocus={() => setIsEditingCell(true)}
            placeholder="Digite um valor ou fórmula (Ex: =SOMA(B4:B6), =A1+B1, =SE(A1>10; 1; 0))"
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-3 py-1 text-xs text-slate-200 focus:outline-none font-mono transition-colors"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Aplicar</span>
          </button>
        </form>
      </div>

      {/* Formula Helper drawer */}
      {showFormulaHelper && (
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 animate-in fade-in duration-150">
          <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
            <div className="font-semibold text-emerald-400 mb-1">Operações Básicas</div>
            <p className="text-slate-400 leading-relaxed">
              Use <code>=A1+B1</code>, <code>=A1*2</code>, <code>=C4/D4</code>, <code>=B1-B2</code>.
              Potência com <code>=A1^2</code> e porcentagem com <code>=A1*10%</code>.
            </p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
            <div className="font-semibold text-emerald-400 mb-1">Funções Estatísticas</div>
            <ul className="space-y-1 text-slate-400">
              <li><code>=SOMA(A1:A10)</code> ou <code>=SUM(A1:A10)</code></li>
              <li><code>=MÉDIA(B2:B8)</code> ou <code>=MEDIA(...)</code></li>
              <li><code>=MAX(C1:C20)</code> e <code>=MIN(C1:C20)</code></li>
              <li><code>=CONTAR(A1:A10)</code> contagem de números</li>
            </ul>
          </div>
          <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
            <div className="font-semibold text-emerald-400 mb-1">Lógica e Condicionais</div>
            <ul className="space-y-1 text-slate-400">
              <li><code>=SE(A1&gt;100; "Aprovado"; "Reprovado")</code></li>
              <li><code>=CONCATENAR("Total: "; B10)</code></li>
              <li><code>=ARRED(A1; 2)</code> arredonda casas</li>
            </ul>
          </div>
        </div>
      )}

      {/* Grid Canvas Area */}
      <div className="flex-1 overflow-auto bg-slate-950 select-none">
        <table className="w-full border-collapse text-xs font-mono">
          <thead>
            <tr className="sticky top-0 z-20 bg-slate-900 text-slate-400 border-b border-slate-800 select-none shadow-sm">
              {/* Corner header */}
              <th className="w-12 min-w-12 h-7 border-r border-slate-800 font-semibold bg-slate-900/95 sticky left-0 z-30"></th>
              {Array.from({ length: activeSheet.colCount }).map((_, cIdx) => {
                const letter = colIndexToLetter(cIdx);
                const isColInRange = cIdx >= selectionBox.minCol && cIdx <= selectionBox.maxCol;
                return (
                  <th
                    key={letter}
                    className={`h-7 px-2 min-w-[100px] border-r border-slate-800 font-semibold text-center transition-colors ${
                      isColInRange
                        ? 'bg-emerald-950/60 text-emerald-300 border-b-2 border-b-emerald-500 font-bold'
                        : 'hover:bg-slate-800'
                    }`}
                  >
                    {letter}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: activeSheet.rowCount }).map((_, rIdx) => {
              const rowNum = rIdx + 1;
              const isRowInRange = rowNum >= selectionBox.minRow && rowNum <= selectionBox.maxRow;
              return (
                <tr key={rowNum} className="border-b border-slate-800/80 hover:bg-slate-900/30">
                  {/* Row index header */}
                  <td
                    className={`h-7 min-w-12 text-center border-r border-slate-800 font-semibold select-none sticky left-0 z-10 transition-colors ${
                      isRowInRange
                        ? 'bg-emerald-950/60 text-emerald-300 border-r-2 border-r-emerald-500 font-bold'
                        : 'bg-slate-900/90 text-slate-400'
                    }`}
                  >
                    {rowNum}
                  </td>

                  {/* Columns */}
                  {Array.from({ length: activeSheet.colCount }).map((_, cIdx) => {
                    const coord = `${colIndexToLetter(cIdx)}${rowNum}`;
                    const cellData = activeSheet.grid[coord];
                    const computedVal = computedGrid[coord];
                    const isSelected = activeCoord === coord;
                    const inSelection =
                      cIdx >= selectionBox.minCol &&
                      cIdx <= selectionBox.maxCol &&
                      rowNum >= selectionBox.minRow &&
                      rowNum <= selectionBox.maxRow;
                    const isMultiSelected = inSelection && selectionBox.count > 1;

                    // Box boundaries for the dragged range
                    let boxBorder = '';
                    if (isMultiSelected) {
                      if (rowNum === selectionBox.minRow) boxBorder += ' border-t-2 border-t-emerald-500';
                      if (rowNum === selectionBox.maxRow) boxBorder += ' border-b-2 border-b-emerald-500';
                      if (cIdx === selectionBox.minCol) boxBorder += ' border-l-2 border-l-emerald-500';
                      if (cIdx === selectionBox.maxCol) boxBorder += ' border-r-2 border-r-emerald-500';
                    }

                    const format = cellData?.format;
                    const displayVal = formatCellValue(computedVal, format);
                    const isError = typeof computedVal === 'string' && computedVal.startsWith('#');

                    const isSearchActive = searchMatches.length > 0 && searchMatches[currentMatchIdx] === coord;
                    const isSearchMatch = searchMatches.includes(coord);

                    let borderClass = '';
                    if (format?.border === 'all') borderClass = 'cell-border-all';
                    else if (format?.border === 'box') borderClass = 'cell-border-box';
                    else if (format?.border === 'bottom_double') borderClass = 'cell-border-bottom-double';
                    else if (format?.border === 'top_bottom') borderClass = 'cell-border-top-bottom';

                    return (
                      <td
                        key={coord}
                        data-coord={coord}
                        tabIndex={0}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return; // Only left mouse button
                          isDraggingRef.current = true;
                          setSelectionStart(coord);
                          setSelectionEnd(coord);
                          setActiveCoord(coord);
                          setIsEditingCell(false);
                        }}
                        onMouseEnter={() => {
                          if (isDraggingRef.current) {
                            setSelectionEnd(coord);
                          }
                        }}
                        onDoubleClick={() => handleCellDoubleClick(coord)}
                        onKeyDown={(e) => handleCellKeyDown(e, coord)}
                        style={{
                          backgroundColor: format?.bgColor,
                          color: format?.color,
                        }}
                        className={`h-7 px-2 border-r border-slate-800/60 overflow-hidden text-ellipsis whitespace-nowrap focus:outline-none transition-all ${
                          format?.bold ? 'font-bold' : ''
                        } ${format?.italic ? 'italic' : ''} ${format?.underline ? 'underline' : ''} ${
                          format?.align === 'right'
                            ? 'text-right'
                            : format?.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        } ${
                          isSearchActive
                            ? 'ring-2 ring-amber-400 bg-amber-500/30 z-30'
                            : isSearchMatch
                            ? 'bg-amber-500/15'
                            : isSelected
                            ? 'ring-2 ring-emerald-500 bg-emerald-950/40 z-20'
                            : isMultiSelected
                            ? 'bg-emerald-500/15 z-10'
                            : 'hover:bg-slate-900/50'
                        } ${boxBorder} ${borderClass} ${isError ? 'text-rose-400 font-bold' : ''}`}
                      >
                        {isSelected && isEditingCell ? (
                          <input
                            type="text"
                            autoFocus
                            value={formulaInput}
                            onChange={(e) => {
                              setFormulaInput(e.target.value);
                              updateCell(coord, e.target.value);
                            }}
                            onBlur={() => setIsEditingCell(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleFormulaSubmit();
                              } else if (e.key === 'Escape') {
                                setIsEditingCell(false);
                              }
                            }}
                            className="w-full h-full bg-slate-950 text-emerald-300 font-mono text-xs outline-none px-1 py-0.5 rounded border border-emerald-500"
                          />
                        ) : (
                          <span>{displayVal}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sheets Tab Bar at Bottom */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-slate-800 bg-slate-900/90 shrink-0 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {sheets.map((sheet) => (
            <div
              key={sheet.id}
              onClick={() => {
                setActiveSheetId(sheet.id);
                setSelectionStart(null);
                setSelectionEnd(null);
              }}
              className={`flex items-center gap-2 px-3 py-1 rounded cursor-pointer transition-colors border ${
                activeSheetId === sheet.id
                  ? 'bg-slate-800 text-emerald-400 border-slate-700 font-medium'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
              }`}
            >
              <span>{sheet.name}</span>
              {sheets.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Excluir planilha "${sheet.name}"?`)) {
                      setSheets((prev) => prev.filter((s) => s.id !== sheet.id));
                      if (activeSheetId === sheet.id) {
                        const remaining = sheets.filter((s) => s.id !== sheet.id);
                        if (remaining[0]) setActiveSheetId(remaining[0].id);
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
            onClick={handleCreateNewSheet}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Adicionar nova planilha"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Selection Statistics & Active coordinate */}
        <div className="text-slate-400 text-xs hidden sm:flex items-center gap-3">
          {selectionStats ? (
            <div className="flex items-center gap-2 text-emerald-300 font-mono text-[11px] bg-emerald-950/50 px-2.5 py-0.5 rounded border border-emerald-500/30">
              <span className="font-semibold text-white">{selectionBox.rangeLabel}</span>
              <span>({selectionStats.cellCount} células)</span>
              {selectionStats.numCount > 0 && (
                <>
                  <span>·</span>
                  <span>SOMA: <strong>{selectionStats.sum.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong></span>
                  <span>·</span>
                  <span>MÉDIA: <strong>{selectionStats.avg.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong></span>
                  <span>·</span>
                  <span>CONTAGEM: <strong>{selectionStats.numCount}</strong></span>
                </>
              )}
            </div>
          ) : (
            <div>
              Célula ativa: <strong className="text-emerald-400 font-mono">{activeCoord}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Chart Visualizer Modal */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2 text-blue-400">
                <BarChart3 className="w-5 h-5" />
                <h3 className="font-semibold text-base text-slate-100">Gráfico Interativo de Dados</h3>
              </div>
              <button
                onClick={() => setShowChartModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Controls */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                      chartType === 'bar' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Barras Verticais
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                      chartType === 'line' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Linha / Tendência
                  </button>
                  <button
                    onClick={() => setChartType('horizontal_bar')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                      chartType === 'horizontal_bar' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Barras Horizontais
                  </button>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {chartData.length} séries detectadas
                </div>
              </div>

              {/* Chart Render Area */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 min-h-64 flex flex-col items-center justify-center">
                {chartData.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm">
                    Nenhum dado numérico encontrado. Selecione células contendo números para visualizar o gráfico.
                  </div>
                ) : chartType === 'bar' ? (
                  <div className="w-full">
                    {(() => {
                      const maxVal = Math.max(...chartData.map((d) => d.value), 1);
                      return (
                        <div className="flex items-end justify-between gap-3 h-48 pt-6 px-2 border-b border-slate-800">
                          {chartData.map((item, idx) => {
                            const pct = Math.max(8, Math.round((item.value / maxVal) * 100));
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                                <span className="text-[10px] text-blue-300 font-mono mb-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                  {item.value.toLocaleString('pt-BR')}
                                </span>
                                <div
                                  style={{ height: `${pct}%` }}
                                  className="w-full max-w-12 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t hover:brightness-125 transition-all shadow-lg"
                                />
                                <span
                                  className="text-[10px] text-slate-400 mt-2 truncate max-w-16 text-center"
                                  title={item.label}
                                >
                                  {item.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : chartType === 'horizontal_bar' ? (
                  <div className="w-full flex flex-col gap-2.5">
                    {(() => {
                      const maxVal = Math.max(...chartData.map((d) => d.value), 1);
                      return chartData.map((item, idx) => {
                        const pct = Math.max(5, Math.round((item.value / maxVal) * 100));
                        return (
                          <div key={idx} className="flex items-center gap-3 text-xs">
                            <span className="w-28 text-slate-300 truncate text-right font-medium" title={item.label}>
                              {item.label}
                            </span>
                            <div className="flex-1 bg-slate-900 rounded-full h-4 overflow-hidden p-0.5 border border-slate-800">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-300"
                              />
                            </div>
                            <span className="w-20 font-mono text-emerald-400 text-left font-semibold">
                              {item.value.toLocaleString('pt-BR')}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="w-full h-48 flex items-center justify-center">
                    {(() => {
                      const maxVal = Math.max(...chartData.map((d) => d.value), 1);
                      const width = 540;
                      const height = 160;
                      const step = width / Math.max(chartData.length - 1, 1);
                      const points = chartData.map((d, i) => {
                        const x = i * step + 20;
                        const y = height - (d.value / maxVal) * (height - 30) - 15;
                        return `${x},${y}`;
                      }).join(' ');

                      return (
                        <svg viewBox={`0 0 ${width + 40} ${height + 30}`} className="w-full h-full overflow-visible">
                          <polyline
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={points}
                          />
                          {chartData.map((d, i) => {
                            const x = i * step + 20;
                            const y = height - (d.value / maxVal) * (height - 30) - 15;
                            return (
                              <g key={i}>
                                <circle cx={x} cy={y} r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
                                <text x={x} y={y - 8} textAnchor="middle" fill="#93c5fd" fontSize="9" fontFamily="monospace">
                                  {d.value.toLocaleString('pt-BR')}
                                </text>
                                <text x={x} y={height + 15} textAnchor="middle" fill="#94a3b8" fontSize="9">
                                  {d.label.slice(0, 8)}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Gráficos gerados diretamente a partir dos dados tabulares ativos
              </span>
              <button
                onClick={() => setShowChartModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
