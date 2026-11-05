import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCell,
  expandRange,
  colIndexToLetter,
  letterToColIndex,
  parseCellCoord,
  formatCellValue,
  findAutoSumRange,
  sortGridRows,
  SheetGrid,
} from './spreadsheetEngine';

test('Coordinate transformations', () => {
  assert.equal(colIndexToLetter(0), 'A');
  assert.equal(colIndexToLetter(25), 'Z');
  assert.equal(colIndexToLetter(26), 'AA');
  assert.equal(letterToColIndex('A'), 0);
  assert.equal(letterToColIndex('Z'), 25);
  assert.equal(letterToColIndex('AA'), 26);

  const coord = parseCellCoord('B4');
  assert.deepEqual(coord, { letter: 'B', col: 1, row: 4 });
});

test('Range expansion', () => {
  assert.deepEqual(expandRange('A1:A3'), ['A1', 'A2', 'A3']);
  assert.deepEqual(expandRange('A1:B2'), ['A1', 'A2', 'B1', 'B2']);
});

test('Spreadsheet arithmetic & basic formulas', () => {
  const grid: SheetGrid = {
    A1: { raw: '10' },
    A2: { raw: '20' },
    A3: { raw: '30' },
    B1: { raw: '=A1 + A2' },
    B2: { raw: '=A3 * 2' },
    B3: { raw: '=A1 + A2 + A3' },
  };

  assert.equal(evaluateCell('A1', grid), 10);
  assert.equal(evaluateCell('B1', grid), 30);
  assert.equal(evaluateCell('B2', grid), 60);
  assert.equal(evaluateCell('B3', grid), 60);
});

test('Spreadsheet Portuguese formulas: SOMA, MÉDIA, MÍNIMO, MÁXIMO, CONTAR, SE', () => {
  const grid: SheetGrid = {
    A1: { raw: '10' },
    A2: { raw: '20' },
    A3: { raw: '30' },
    C1: { raw: '=SOMA(A1:A3)' },
    C2: { raw: '=MÉDIA(A1:A3)' },
    C3: { raw: '=MIN(A1:A3)' },
    C4: { raw: '=MAX(A1:A3)' },
    C5: { raw: '=CONTAR(A1:A3)' },
    C6: { raw: '=SE(A1 > 5; "Maior"; "Menor")' },
    C7: { raw: '=SE(A1 > 50; "Maior"; "Menor")' },
  };

  assert.equal(evaluateCell('C1', grid), 60);
  assert.equal(evaluateCell('C2', grid), 20);
  assert.equal(evaluateCell('C3', grid), 10);
  assert.equal(evaluateCell('C4', grid), 30);
  assert.equal(evaluateCell('C5', grid), 3);
  assert.equal(evaluateCell('C6', grid), 'Maior');
  assert.equal(evaluateCell('C7', grid), 'Menor');

  // Test MULT, POTENCIA, SEERRO
  const grid2: SheetGrid = {
    A1: { raw: '4' },
    A2: { raw: '5' },
    A3: { raw: '2' },
    B1: { raw: '=MULT(A1:A3)' },
    B2: { raw: '=POTENCIA(A1; A3)' },
    B3: { raw: '=SEERRO(10/0; "Erro Tratado")' },
    B4: { raw: '=SEERRO(A1+A2; "Erro Tratado")' },
  };

  assert.equal(evaluateCell('B1', grid2), 40); // 4 * 5 * 2
  assert.equal(evaluateCell('B2', grid2), 16); // 4 ^ 2
  assert.equal(evaluateCell('B3', grid2), 'Erro Tratado');
  assert.equal(evaluateCell('B4', grid2), 9);
});

test('Circular reference prevention', () => {
  const grid: SheetGrid = {
    A1: { raw: '=B1 + 1' },
    B1: { raw: '=A1 + 1' },
  };

  assert.equal(evaluateCell('A1', grid), '#CIRCULAR!');
});

test('Format cell value', () => {
  assert.equal(formatCellValue(1234.56, { type: 'number_2' }), '1.234,56');
});

test('findAutoSumRange detects numeric sequence above or left', () => {
  const grid: SheetGrid = {
    B4: { raw: '100' },
    B5: { raw: '200' },
    B6: { raw: '300' },
    // B7 is the target sum cell
    D1: { raw: '10' },
    D2: { raw: '20' },
    E2: { raw: '30' },
  };

  assert.equal(findAutoSumRange('B7', grid), 'B4:B6');
  assert.equal(findAutoSumRange('F2', grid), 'D2:E2');
  assert.equal(findAutoSumRange('A1', grid), null);
});

test('sortGridRows sorts rows numerically and alphabetically', () => {
  const grid: SheetGrid = {
    A1: { raw: 'Banana' },
    B1: { raw: '50' },
    A2: { raw: 'Abacaxi' },
    B2: { raw: '20' },
    A3: { raw: 'Laranja' },
    B3: { raw: '80' },
  };

  // Sort by column A ascending (A-Z)
  const sortedAlpha = sortGridRows(grid, 1, 3, 'A', true, 0, 1);
  assert.equal(sortedAlpha['A1'].raw, 'Abacaxi');
  assert.equal(sortedAlpha['B1'].raw, '20');
  assert.equal(sortedAlpha['A2'].raw, 'Banana');
  assert.equal(sortedAlpha['B2'].raw, '50');
  assert.equal(sortedAlpha['A3'].raw, 'Laranja');
  assert.equal(sortedAlpha['B3'].raw, '80');

  // Sort by column B descending (80 down to 20)
  const sortedNumDesc = sortGridRows(grid, 1, 3, 'B', false, 0, 1);
  assert.equal(sortedNumDesc['A1'].raw, 'Laranja');
  assert.equal(sortedNumDesc['B1'].raw, '80');
  assert.equal(sortedNumDesc['A2'].raw, 'Banana');
  assert.equal(sortedNumDesc['B2'].raw, '50');
  assert.equal(sortedNumDesc['A3'].raw, 'Abacaxi');
  assert.equal(sortedNumDesc['B3'].raw, '20');
});
