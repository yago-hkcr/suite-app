/**
 * Spreadsheet formula parser and evaluation engine for Suíte app's
 * Supports:
 * - Basic arithmetic (+, -, *, /, ^, %)
 * - Cell references (A1, B2, etc.)
 * - Cell ranges (A1:A5, B2:D4)
 * - Portuguese and English formula names:
 *   SOMA / SUM
 *   MÉDIA / MEDIA / AVERAGE
 *   MÍNIMO / MINIMO / MIN
 *   MÁXIMO / MAXIMO / MAX
 *   CONTAR / COUNT
 *   SE / IF
 *   CONCATENAR / CONCAT
 *   ARRED / ROUND
 * - Circular dependency protection
 */

export interface CellData {
  raw: string; // User entered value or formula (e.g. "=SOMA(A1:A3)")
  computed?: string | number | null;
  format?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    border?: 'none' | 'all' | 'box' | 'bottom_double' | 'top_bottom';
    color?: string;
    bgColor?: string;
    align?: 'left' | 'center' | 'right';
    type?: 'general' | 'currency_brl' | 'currency_usd' | 'percent' | 'number_2';
  };
}

export type SheetGrid = Record<string, CellData>; // key is "A1", "B2", etc.

/** Converts column index (0-based) to letter (0 -> A, 25 -> Z, 26 -> AA) */
export function colIndexToLetter(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/** Converts letter to column index (A -> 0, Z -> 25, AA -> 26) */
export function letterToColIndex(letter: string): number {
  const upper = letter.toUpperCase();
  let index = 0;
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

/** Parses cell coordinate "B4" -> { col: 1, row: 4, letter: "B" } */
export function parseCellCoord(coord: string): { col: number; row: number; letter: string } | null {
  const match = coord.trim().toUpperCase().match(/^([A-Z]+)([0-9]+)$/);
  if (!match) return null;
  return {
    letter: match[1],
    col: letterToColIndex(match[1]),
    row: parseInt(match[2], 10),
  };
}

/** Expands a range like "A1:B3" to ["A1", "A2", "A3", "B1", "B2", "B3"] */
export function expandRange(rangeStr: string): string[] {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return [rangeStr.trim().toUpperCase()];
  const start = parseCellCoord(parts[0]);
  const end = parseCellCoord(parts[1]);
  if (!start || !end) return [];

  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  const coords: string[] = [];
  for (let c = minCol; c <= maxCol; c++) {
    const colLetter = colIndexToLetter(c);
    for (let r = minRow; r <= maxRow; r++) {
      coords.push(`${colLetter}${r}`);
    }
  }
  return coords;
}

/** Extracts numeric value from a cell data or literal string */
function getNumericValue(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    // Replace comma with dot if brazilian format number e.g. "12,5"
    const cleaned = val.replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Evaluates a cell formula or raw string with cycle detection
 */
export function evaluateCell(
  coord: string,
  grid: SheetGrid,
  visited: Set<string> = new Set()
): string | number {
  const upperCoord = coord.toUpperCase();
  const cell = grid[upperCoord];
  if (!cell || cell.raw === undefined || cell.raw === null || cell.raw === '') {
    return '';
  }

  const raw = String(cell.raw).trim();
  if (!raw.startsWith('=')) {
    // Literal value
    const num = getNumericValue(raw);
    if (num !== null && !isNaN(num) && String(num) === raw.replace(',', '.')) {
      return num;
    }
    return raw;
  }

  // It's a formula
  if (visited.has(upperCoord)) {
    return '#CIRCULAR!';
  }

  const nextVisited = new Set(visited);
  nextVisited.add(upperCoord);

  try {
    const formula = raw.slice(1).trim();
    return evaluateFormulaExpression(formula, grid, nextVisited);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith('#')) return msg;
    if (msg.includes('DIV/0')) return '#DIV/0!';
    if (msg.includes('REF')) return '#REF!';
    return '#ERRO!';
  }
}

/** Evaluates an expression string such as "SOMA(A1:A5) + 10" or "SE(A1 > 5, 100, 0)" */
export function evaluateFormulaExpression(
  expr: string,
  grid: SheetGrid,
  visited: Set<string>
): string | number {
  let cleaned = expr.trim();
  if (!cleaned) return '';

  // If the expression is already a quoted string like "Maior" or 'Menor', return its unwrapped content
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    return cleaned.slice(1, -1);
  }

  // Handle function calls first
  // Matches FUNC_NAME(...)
  const funcRegex = /([A-ZÀ-Úa-zà-ú_]+)\s*\(([^()]+(?:\([^()]*\)[^()]*)*)\)/;
  let match = cleaned.match(funcRegex);

  while (match) {
    const fullMatch = match[0];
    const funcName = match[1].toUpperCase();
    const argsStr = match[2];

    const result = evaluateFunction(funcName, argsStr, grid, visited);
    cleaned = cleaned.replace(fullMatch, typeof result === 'string' ? JSON.stringify(result) : String(result));
    match = cleaned.match(funcRegex);
  }

  // If after evaluating functions the result is just a quoted string, return it directly
  cleaned = cleaned.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    return cleaned.slice(1, -1);
  }

  // Replace remaining cell references like A1, B4 with evaluated numbers/strings
  const cellRefRegex = /\b([A-Z]+[0-9]+)\b/g;
  cleaned = cleaned.replace(cellRefRegex, (ref) => {
    const val = evaluateCell(ref, grid, visited);
    if (typeof val === 'number') {
      return String(val);
    }
    if (val === '') {
      return '0';
    }
    if (typeof val === 'string' && val.startsWith('#')) {
      throw new Error(val);
    }
    const num = getNumericValue(val);
    if (num !== null) return String(num);
    return JSON.stringify(val);
  });

  // Evaluate arithmetic and logic safely
  // Replace ^ with **
  cleaned = cleaned.replace(/\^/g, '**');

  try {
    // If it's a pure string literal or expression
    const calc = Function(`"use strict"; return (${cleaned});`)();
    if (calc === Infinity || calc === -Infinity) throw new Error('#DIV/0!');
    if (typeof calc === 'number' && isNaN(calc)) return '#VALOR!';
    return calc;
  } catch (err: unknown) {
    const errorStr = err instanceof Error ? err.message : String(err);
    if (errorStr.startsWith('#')) return errorStr;
    if (errorStr.includes('DIV/0')) return '#DIV/0!';
    return '#VALOR!';
  }
}

/** Parses arguments taking into account commas/semicolons inside strings or nested expressions */
function parseArgs(argsStr: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let parenDepth = 0;

  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === '(' && !inQuotes) {
      parenDepth++;
      current += char;
    } else if (char === ')' && !inQuotes) {
      parenDepth--;
      current += char;
    } else if ((char === ',' || char === ';') && !inQuotes && parenDepth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    args.push(current.trim());
  }
  return args;
}

/** Resolves an argument into a flat array of numbers (or strings if text) */
function resolveArgToValues(arg: string, grid: SheetGrid, visited: Set<string>): (string | number)[] {
  const trimmed = arg.trim();
  // Is it a range like A1:B5?
  if (/^[A-Za-z]+[0-9]+:[A-Za-z]+[0-9]+$/.test(trimmed)) {
    const coords = expandRange(trimmed);
    return coords.map((c) => evaluateCell(c, grid, visited));
  }
  // Is it a single cell?
  if (/^[A-Za-z]+[0-9]+$/.test(trimmed)) {
    return [evaluateCell(trimmed, grid, visited)];
  }
  // Otherwise evaluate as expression
  return [evaluateFormulaExpression(trimmed, grid, visited)];
}

/** Evaluates named spreadsheet function */
function evaluateFunction(
  name: string,
  argsStr: string,
  grid: SheetGrid,
  visited: Set<string>
): string | number {
  const rawArgs = parseArgs(argsStr);

  // Normalize function name: remove accents and lowercase
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  // Helper to collect all numeric values from args
  const collectNumbers = (): number[] => {
    const nums: number[] = [];
    for (const a of rawArgs) {
      const vals = resolveArgToValues(a, grid, visited);
      for (const v of vals) {
        const n = getNumericValue(v);
        if (n !== null) nums.push(n);
      }
    }
    return nums;
  };

  switch (normalized) {
    case 'SOMA':
    case 'SUM': {
      const nums = collectNumbers();
      return nums.reduce((acc, curr) => acc + curr, 0);
    }
    case 'MULT':
    case 'PRODUCT':
    case 'PRODUTO': {
      const nums = collectNumbers();
      if (nums.length === 0) return 0;
      return nums.reduce((acc, curr) => acc * curr, 1);
    }
    case 'MEDIA':
    case 'AVERAGE': {
      const nums = collectNumbers();
      if (nums.length === 0) return '#DIV/0!';
      const sum = nums.reduce((acc, curr) => acc + curr, 0);
      return sum / nums.length;
    }
    case 'MIN':
    case 'MINIMO': {
      const nums = collectNumbers();
      if (nums.length === 0) return 0;
      return Math.min(...nums);
    }
    case 'MAX':
    case 'MAXIMO': {
      const nums = collectNumbers();
      if (nums.length === 0) return 0;
      return Math.max(...nums);
    }
    case 'CONTAR':
    case 'COUNT': {
      const nums = collectNumbers();
      return nums.length;
    }
    case 'POTENCIA':
    case 'POWER': {
      const nums = collectNumbers();
      if (nums.length < 2) return '#VALOR!';
      return Math.pow(nums[0], nums[1]);
    }
    case 'SEERRO':
    case 'IFERROR': {
      if (rawArgs.length < 2) return '#VALOR!';
      try {
        const val = evaluateFormulaExpression(rawArgs[0], grid, visited);
        if (typeof val === 'string' && val.startsWith('#')) {
          return evaluateFormulaExpression(rawArgs[1], grid, visited);
        }
        return val;
      } catch {
        return evaluateFormulaExpression(rawArgs[1], grid, visited);
      }
    }
    case 'HOJE':
    case 'TODAY': {
      const now = new Date();
      return now.toLocaleDateString('pt-BR');
    }
    case 'SE':
    case 'IF': {
      if (rawArgs.length < 2) return '#VALOR!';
      const conditionExpr = rawArgs[0];
      const trueValExpr = rawArgs[1];
      const falseValExpr = rawArgs[2] || '""';

      const condResult = evaluateFormulaExpression(conditionExpr, grid, visited);
      const isTruthy = Boolean(condResult && condResult !== '0' && condResult !== 0);
      return isTruthy
        ? evaluateFormulaExpression(trueValExpr, grid, visited)
        : evaluateFormulaExpression(falseValExpr, grid, visited);
    }
    case 'CONCATENAR':
    case 'CONCAT': {
      let result = '';
      for (const a of rawArgs) {
        const vals = resolveArgToValues(a, grid, visited);
        for (const v of vals) {
          result += String(v ?? '');
        }
      }
      return result;
    }
    case 'ARRED':
    case 'ROUND': {
      const nums = collectNumbers();
      if (nums.length === 0) return 0;
      const decimals = rawArgs.length > 1 ? Number(evaluateFormulaExpression(rawArgs[1], grid, visited)) || 0 : 0;
      const factor = Math.pow(10, decimals);
      return Math.round(nums[0] * factor) / factor;
    }
    default:
      return '#NOME?';
  }
}

/** Formats a cell value based on its format settings */
export function formatCellValue(value: string | number | null | undefined, format?: CellData['format']): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' && value.startsWith('#')) return value; // Error tag

  const type = format?.type || 'general';
  const num = getNumericValue(value);

  if (num === null) {
    return String(value);
  }

  switch (type) {
    case 'currency_brl':
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
    case 'currency_usd':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    case 'percent':
      return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(num > 1 ? num / 100 : num);
    case 'number_2':
      return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    default:
      return String(value);
  }
}

/** Automatically detects numbers above or to the left of a target cell to generate sum range */
export function findAutoSumRange(coord: string, grid: SheetGrid): string | null {
  const parsed = parseCellCoord(coord);
  if (!parsed) return null;

  // 1. Try scanning upwards in the same column
  const startRow = parsed.row - 1;
  let topRow = startRow;
  while (topRow >= 1) {
    const checkCoord = `${parsed.letter}${topRow}`;
    const cell = grid[checkCoord];
    if (!cell || cell.raw === '' || isNaN(Number(cell.raw.replace(/[,R$\s]/g, '')))) {
      break;
    }
    topRow--;
  }

  // topRow stopped on empty or non-numeric cell, so numeric range is [topRow + 1, startRow]
  const validTop = topRow + 1;
  if (validTop <= startRow) {
    return `${parsed.letter}${validTop}:${parsed.letter}${startRow}`;
  }

  // 2. Try scanning to the left in the same row
  const startCol = parsed.col - 1;
  let leftCol = startCol;
  while (leftCol >= 0) {
    const colLetter = colIndexToLetter(leftCol);
    const checkCoord = `${colLetter}${parsed.row}`;
    const cell = grid[checkCoord];
    if (!cell || cell.raw === '' || isNaN(Number(cell.raw.replace(/[,R$\s]/g, '')))) {
      break;
    }
    leftCol--;
  }

  const validLeft = leftCol + 1;
  if (validLeft <= startCol) {
    return `${colIndexToLetter(validLeft)}${parsed.row}:${colIndexToLetter(startCol)}${parsed.row}`;
  }

  return null;
}

/** Sorts rows in a specified range or column */
export function sortGridRows(
  grid: SheetGrid,
  startRow: number,
  endRow: number,
  sortColLetter: string,
  ascending: boolean,
  minCol = 0,
  maxCol = 25
): SheetGrid {
  const newGrid: SheetGrid = { ...grid };
  const rows: { rowNum: number; sortValue: string | number; cells: Record<string, CellData> }[] = [];

  for (let r = startRow; r <= endRow; r++) {
    const key = `${sortColLetter}${r}`;
    const rawVal = grid[key]?.raw ?? '';
    const num = Number(rawVal.replace(/[R$\s.]/g, '').replace(',', '.'));
    const sortVal = !isNaN(num) && rawVal.trim() !== '' ? num : rawVal.toLowerCase();

    const rowCells: Record<string, CellData> = {};
    for (let c = minCol; c <= maxCol; c++) {
      const colLetter = colIndexToLetter(c);
      const coord = `${colLetter}${r}`;
      if (grid[coord]) {
        rowCells[colLetter] = { ...grid[coord] };
      }
    }

    rows.push({
      rowNum: r,
      sortValue: sortVal,
      cells: rowCells,
    });
  }

  // Sort rows array
  rows.sort((a, b) => {
    if (typeof a.sortValue === 'number' && typeof b.sortValue === 'number') {
      return ascending ? a.sortValue - b.sortValue : b.sortValue - a.sortValue;
    }
    const strA = String(a.sortValue);
    const strB = String(b.sortValue);
    return ascending ? strA.localeCompare(strB, 'pt-BR') : strB.localeCompare(strA, 'pt-BR');
  });

  // Re-write back into newGrid at rows [startRow .. endRow]
  rows.forEach((rowObj, idx) => {
    const targetRow = startRow + idx;
    for (let c = minCol; c <= maxCol; c++) {
      const colLetter = colIndexToLetter(c);
      const targetCoord = `${colLetter}${targetRow}`;
      if (rowObj.cells[colLetter]) {
        newGrid[targetCoord] = rowObj.cells[colLetter];
      } else {
        delete newGrid[targetCoord];
      }
    }
  });

  return newGrid;
}
