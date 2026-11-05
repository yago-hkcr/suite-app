import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Paintbrush,
  Eraser,
  Square,
  Circle,
  Slash,
  Type,
  Pipette,
  PaintBucket,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  Copy,
  Check,
  Triangle,
  Star,
  Sparkles,
  SprayCan,
  ArrowRight,
  Diamond,
  ImagePlus,
  Wand2,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { loadFromStorage, saveToStorage } from '../../utils/storage';

type PaintTool =
  | 'brush'
  | 'spray'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'fill'
  | 'text'
  | 'picker';

const SWATCH_COLORS = [
  '#FFFFFF',
  '#94A3B8',
  '#000000',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#84CC16',
  '#14B8A6',
  '#D946EF',
  '#F43F5E',
];

export const PaintApp: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTool, setActiveTool] = useState<PaintTool>('brush');
  const [strokeColor, setStrokeColor] = useState<string>('#3B82F6');
  const [fillColor, setFillColor] = useState<string>('#1E293B');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [opacity, setOpacity] = useState<number>(100);
  const [isFilled, setIsFilled] = useState<boolean>(false);
  const [canvasBgColor, setCanvasBgColor] = useState<string>('#0B0F17');
  const [textInput, setTextInput] = useState<string>('');
  const [showTextPrompt, setShowTextPrompt] = useState<boolean>(false);
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showFiltersMenu, setShowFiltersMenu] = useState<boolean>(false);

  // Undo/Redo stack (stores ImageData)
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Drawing state
  const isDrawingRef = useRef<boolean>(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const snapshotRef = useRef<ImageData | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Set initial size
    canvas.width = 1200;
    canvas.height = 750;

    // Check if there was saved artwork
    const savedArtwork = loadFromStorage<string | null>('paint_saved_canvas', null);
    if (savedArtwork) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        saveState();
      };
      img.src = savedArtwork;
    } else {
      // Fill background
      ctx.fillStyle = canvasBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw welcome starter illustration
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#3B82F6';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.beginPath();
      ctx.arc(600, 320, 140, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#EC4899';
      ctx.fillStyle = 'rgba(236, 72, 153, 0.1)';
      ctx.beginPath();
      ctx.arc(540, 360, 110, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#10B981';
      ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.beginPath();
      ctx.arc(660, 360, 110, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("Suíte app's - Paint Studio", 600, 310);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Pincel, Spray, Formas, Balde, Filtros e Inserção de Imagens', 600, 350);

      saveState();
    }
  }, []);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(imgData);
    if (newHistory.length > 30) newHistory.shift();

    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);

    // Save thumbnail in storage debounced
    try {
      saveToStorage('paint_saved_canvas', canvas.toDataURL('image/png', 0.8));
    } catch {
      // Storage quota guard
    }
  };

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const getTouchCoords = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top) * scaleY,
    };
  };

  // Spray airbrush effect
  const drawSpray = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const density = Math.max(14, strokeWidth * 5);
    const radius = Math.max(8, strokeWidth * 3);
    ctx.fillStyle = strokeColor;
    ctx.globalAlpha = opacity / 100;
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      ctx.fillRect(px, py, 1.5, 1.5);
    }
  };

  // Arrow drawing
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) => {
    const headLength = Math.max(14, strokeWidth * 3.5);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  };

  // Diamond drawing
  const drawDiamond = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    ctx.beginPath();
    ctx.moveTo(midX, y1);
    ctx.lineTo(x2, midY);
    ctx.lineTo(midX, y2);
    ctx.lineTo(x1, midY);
    ctx.closePath();
    if (isFilled) ctx.fill();
    ctx.stroke();
  };

  // Star drawing
  const drawStar = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ) => {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  };

  // Flood Fill Algorithm
  const floodFill = (startX: number, startY: number, fillColorHex: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Convert hex to RGBA
    const rMatch = parseInt(fillColorHex.slice(1, 3), 16) || 0;
    const gMatch = parseInt(fillColorHex.slice(3, 5), 16) || 0;
    const bMatch = parseInt(fillColorHex.slice(5, 7), 16) || 0;
    const targetA = 255;

    const startPixelPos = (Math.floor(startY) * canvas.width + Math.floor(startX)) * 4;
    const startR = data[startPixelPos];
    const startG = data[startPixelPos + 1];
    const startB = data[startPixelPos + 2];
    const startAlpha = data[startPixelPos + 3];

    // If clicking same color, return
    if (startR === rMatch && startG === gMatch && startB === bMatch && startAlpha === targetA) {
      return;
    }

    const matchStartColor = (pos: number) => {
      return (
        data[pos] === startR &&
        data[pos + 1] === startG &&
        data[pos + 2] === startB &&
        data[pos + 3] === startAlpha
      );
    };

    const colorPixel = (pos: number) => {
      data[pos] = rMatch;
      data[pos + 1] = gMatch;
      data[pos + 2] = bMatch;
      data[pos + 3] = targetA;
    };

    const queue: [number, number][] = [[Math.floor(startX), Math.floor(startY)]];
    const visited = new Uint8Array(canvas.width * canvas.height);

    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      const idx = y * canvas.width + x;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const pos = idx * 4;
      if (matchStartColor(pos)) {
        colorPixel(pos);

        if (x > 0 && !visited[idx - 1]) queue.push([x - 1, y]);
        if (x < canvas.width - 1 && !visited[idx + 1]) queue.push([x + 1, y]);
        if (y > 0 && !visited[idx - canvas.width]) queue.push([x, y - 1]);
        if (y < canvas.height - 1 && !visited[idx + canvas.width]) queue.push([x, y + 1]);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    saveState();
  };

  // Image Filters
  const applyFilter = (filterType: 'invert' | 'grayscale' | 'sepia' | 'brightness') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];

      if (filterType === 'invert') {
        d[i] = 255 - r;
        d[i + 1] = 255 - g;
        d[i + 2] = 255 - b;
      } else if (filterType === 'grayscale') {
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        d[i] = gray;
        d[i + 1] = gray;
        d[i + 2] = gray;
      } else if (filterType === 'sepia') {
        d[i] = Math.min(255, Math.round(r * 0.393 + g * 0.769 + b * 0.189));
        d[i + 1] = Math.min(255, Math.round(r * 0.349 + g * 0.686 + b * 0.168));
        d[i + 2] = Math.min(255, Math.round(r * 0.272 + g * 0.534 + b * 0.131));
      } else if (filterType === 'brightness') {
        d[i] = Math.min(255, r + 35);
        d[i + 1] = Math.min(255, g + 35);
        d[i + 2] = Math.min(255, b + 35);
      }
    }
    ctx.putImageData(imgData, 0, 0);
    saveState();
    setShowFiltersMenu(false);
  };

  // Image Import
  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.min(1, Math.min(hRatio, vRatio));
        const dw = img.width * ratio;
        const dh = img.height * ratio;
        const dx = (canvas.width - dw) / 2;
        const dy = (canvas.height - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
        saveState();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    startPosRef.current = coords;
    isDrawingRef.current = true;

    // Eyedropper
    if (activeTool === 'picker') {
      const p = ctx.getImageData(coords.x, coords.y, 1, 1).data;
      const hex = '#' + ((1 << 24) + (p[0] << 16) + (p[1] << 8) + p[2]).toString(16).slice(1);
      setStrokeColor(hex);
      setActiveTool('brush');
      isDrawingRef.current = false;
      return;
    }

    // Flood fill
    if (activeTool === 'fill') {
      floodFill(coords.x, coords.y, strokeColor);
      isDrawingRef.current = false;
      return;
    }

    // Text tool
    if (activeTool === 'text') {
      setTextPosition(coords);
      setShowTextPrompt(true);
      isDrawingRef.current = false;
      return;
    }

    if (activeTool === 'spray') {
      drawSpray(ctx, coords.x, coords.y);
      return;
    }

    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (activeTool === 'brush' || activeTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = activeTool === 'eraser' ? 1 : opacity / 100;
      ctx.strokeStyle = activeTool === 'eraser' ? canvasBgColor : strokeColor;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    if (activeTool === 'spray') {
      drawSpray(ctx, coords.x, coords.y);
      return;
    }

    if (activeTool === 'brush' || activeTool === 'eraser') {
      ctx.globalAlpha = activeTool === 'eraser' ? 1 : opacity / 100;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else {
      // Shapes preview: restore snapshot
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }

      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = opacity / 100;
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;

      const sx = startPosRef.current.x;
      const sy = startPosRef.current.y;
      const cx = coords.x;
      const cy = coords.y;

      if (activeTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      } else if (activeTool === 'arrow') {
        drawArrow(ctx, sx, sy, cx, cy);
      } else if (activeTool === 'rect') {
        const w = cx - sx;
        const h = cy - sy;
        if (isFilled) ctx.fillRect(sx, sy, w, h);
        ctx.strokeRect(sx, sy, w, h);
      } else if (activeTool === 'circle') {
        const radius = Math.sqrt(Math.pow(cx - sx, 2) + Math.pow(cy - sy, 2));
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, 2 * Math.PI);
        if (isFilled) ctx.fill();
        ctx.stroke();
      } else if (activeTool === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(sx + (cx - sx) / 2, sy);
        ctx.lineTo(sx, cy);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        if (isFilled) ctx.fill();
        ctx.stroke();
      } else if (activeTool === 'diamond') {
        drawDiamond(ctx, sx, sy, cx, cy);
      } else if (activeTool === 'star') {
        const radius = Math.sqrt(Math.pow(cx - sx, 2) + Math.pow(cy - sy, 2));
        drawStar(ctx, sx, sy, 5, radius, radius / 2);
        if (isFilled) ctx.fill();
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    saveState();
  };

  // Commit text tool
  const handleInsertText = () => {
    if (!textPosition || !textInput.trim()) {
      setShowTextPrompt(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.font = `${Math.max(16, strokeWidth * 6)}px sans-serif`;
    ctx.fillStyle = strokeColor;
    ctx.fillText(textInput, textPosition.x, textPosition.y);
    saveState();
    setTextInput('');
    setShowTextPrompt(false);
  };

  // Clear Canvas
  const handleClear = () => {
    if (window.confirm('Limpar toda a tela de pintura?')) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.fillStyle = canvasBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveState();
    }
  };

  // Export Image
  const handleDownloadImage = (format: 'png' | 'jpeg') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL(`image/${format}`, 0.95);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `desenho_paint_${Date.now()}.${format}`;
    a.click();
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (e) {
      console.error('Clipboard copy failed', e);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-slate-950 text-slate-100 select-none">
      {/* Hidden file input for Image Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImportImage}
        className="hidden"
      />

      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Paintbrush className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-slate-100">Paint Studio</h2>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Tela 1200 × 750px</span>
              <span>·</span>
              <span>Salvamento contínuo</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="paint-action-scroll flex items-center gap-2 max-w-full">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 20))}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 w-10 text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(200, z + 20))}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Ajustar 100%"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-slate-800">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-40 hover:bg-slate-800 rounded transition-colors"
              title="Desfazer (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-40 hover:bg-slate-800 rounded transition-colors"
              title="Refazer (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Import Image Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
            title="Importar imagem do computador para a tela"
          >
            <ImagePlus className="w-3.5 h-3.5 text-blue-400" />
            <span>Inserir Imagem</span>
          </button>

          {/* Filters Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFiltersMenu(!showFiltersMenu)}
              className={`px-2.5 py-1.5 text-xs border rounded-lg flex items-center gap-1.5 transition-colors ${
                showFiltersMenu
                  ? 'bg-amber-600/30 text-amber-300 border-amber-500/50'
                  : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700'
              }`}
              title="Aplicar efeitos e filtros de imagem na tela"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Filtros</span>
            </button>

            {showFiltersMenu && (
              <div className="absolute right-0 mt-1.5 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1 z-30 flex flex-col gap-1">
                <button
                  onClick={() => applyFilter('invert')}
                  className="px-2.5 py-1.5 text-xs text-left text-slate-200 hover:bg-slate-800 rounded flex items-center justify-between transition-colors"
                >
                  <span>Inverter Cores</span>
                  <span className="text-[10px] text-slate-400">Negativo</span>
                </button>
                <button
                  onClick={() => applyFilter('grayscale')}
                  className="px-2.5 py-1.5 text-xs text-left text-slate-200 hover:bg-slate-800 rounded flex items-center justify-between transition-colors"
                >
                  <span>Preto e Branco</span>
                  <span className="text-[10px] text-slate-400">Cinza</span>
                </button>
                <button
                  onClick={() => applyFilter('sepia')}
                  className="px-2.5 py-1.5 text-xs text-left text-slate-200 hover:bg-slate-800 rounded flex items-center justify-between transition-colors"
                >
                  <span>Efeito Vintage</span>
                  <span className="text-[10px] text-slate-400">Sépia</span>
                </button>
                <button
                  onClick={() => applyFilter('brightness')}
                  className="px-2.5 py-1.5 text-xs text-left text-slate-200 hover:bg-slate-800 rounded flex items-center justify-between transition-colors"
                >
                  <span>Clarear Imagem</span>
                  <span className="text-[10px] text-slate-400">+Brilho</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleCopyImage}
            className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>

          <button
            onClick={() => handleDownloadImage('png')}
            className="px-2.5 py-1.5 text-xs font-medium text-pink-400 hover:text-pink-300 bg-pink-950/40 hover:bg-pink-900/40 border border-pink-500/30 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            title="Baixar imagem como PNG transparente/opaco"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>

          <button
            onClick={() => handleDownloadImage('jpeg')}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            title="Baixar imagem como JPEG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JPEG</span>
          </button>

          <button
            onClick={handleClear}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40"
            title="Limpar tela"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tool Selection Ribbon */}
      <div className="paint-tool-scroll flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 border-b border-slate-800 bg-slate-900/50 text-xs shrink-0">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 pr-3 border-r border-slate-800">
          <button
            onClick={() => setActiveTool('brush')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'brush' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Pincel Livre"
          >
            <Paintbrush className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('spray')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'spray' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Spray / Aerógrafo"
          >
            <SprayCan className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('eraser')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'eraser' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Borracha"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('fill')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'fill' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Balde de Preenchimento"
          >
            <PaintBucket className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('picker')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'picker' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Conta-gotas (Capturar cor)"
          >
            <Pipette className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('text')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'text' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Texto na tela"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>

        {/* Geometric Shapes */}
        <div className="flex items-center gap-1 px-2 border-r border-slate-800">
          <button
            onClick={() => setActiveTool('line')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'line' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Linha Reta"
          >
            <Slash className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('arrow')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'arrow' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Seta Direcional"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('rect')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'rect' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Retângulo"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('circle')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'circle' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Círculo"
          >
            <Circle className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('triangle')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'triangle' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Triângulo"
          >
            <Triangle className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('diamond')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'diamond' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Losango"
          >
            <Diamond className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('star')}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === 'star' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Estrela"
          >
            <Star className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFilled(!isFilled)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              isFilled ? 'bg-slate-800 text-pink-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Preencher interior de formas"
          >
            {isFilled ? 'Preenchido' : 'Contorno'}
          </button>
        </div>

        {/* Thickness Slider */}
        <div className="flex items-center gap-2 px-2 border-r border-slate-800">
          <span className="text-slate-400 text-xs">Espessura:</span>
          <input
            type="range"
            min="1"
            max="48"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
            className="w-20 accent-pink-500 cursor-pointer"
          />
          <span className="text-slate-300 font-mono w-6 text-right text-xs">{strokeWidth}px</span>
        </div>

        {/* Opacity Slider */}
        <div className="flex items-center gap-2 px-2 border-r border-slate-800">
          <span className="text-slate-400 text-xs">Opacidade:</span>
          <input
            type="range"
            min="5"
            max="100"
            value={opacity}
            onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
            className="w-16 accent-pink-500 cursor-pointer"
          />
          <span className="text-slate-300 font-mono w-7 text-right text-xs">{opacity}%</span>
        </div>

        {/* Color Palette Swatches */}
        <div className="flex items-center gap-1.5 pl-2">
          <div className="flex items-center gap-1">
            {SWATCH_COLORS.slice(0, 10).map((c) => (
              <button
                key={c}
                onClick={() => setStrokeColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-md border transition-transform ${
                  strokeColor === c ? 'scale-125 border-white ring-2 ring-pink-500 z-10' : 'border-slate-700 hover:scale-110'
                }`}
                title={c}
              />
            ))}
          </div>

          {/* Color pickers */}
          <div className="flex items-center gap-1.5 ml-2">
            <label className="flex items-center gap-1 cursor-pointer" title="Escolher cor de traço/pincel">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
              />
              <span className="text-[11px] font-mono text-slate-400">{strokeColor}</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer ml-1" title="Escolher cor de preenchimento">
              <span className="text-[10px] text-slate-500">Int:</span>
              <input
                type="color"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
              />
            </label>
          </div>

          {/* Canvas Background Color Toggle */}
          <div className="flex items-center gap-1 ml-3 pl-3 border-l border-slate-800">
            <button
              onClick={() => {
                const newBg = canvasBgColor === '#0B0F17' ? '#FFFFFF' : '#0B0F17';
                setCanvasBgColor(newBg);
                const canvas = canvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = newBg;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    saveState();
                  }
                }
              }}
              className="px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors text-[11px]"
              title="Alternar fundo da folha entre Escuro e Claro"
            >
              Fundo: {canvasBgColor === '#0B0F17' ? 'Escuro' : 'Claro'}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="flex-1 min-h-0 min-w-0 overflow-auto p-3 sm:p-4 md:p-8 flex items-center justify-center bg-slate-950">
        <div
          className="relative shadow-2xl rounded-xl border border-slate-700/80 overflow-hidden bg-slate-900 transition-transform duration-150 origin-center"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => {
              const coords = getTouchCoords(e);
              handleMouseDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } as any);
            }}
            onTouchMove={(e) => {
              handleMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } as any);
            }}
            onTouchEnd={handleMouseUp}
            className="cursor-crosshair block touch-none"
            style={{ maxWidth: '100%', height: 'auto', backgroundColor: canvasBgColor }}
          />

          {/* Text input prompt overlay */}
          {showTextPrompt && textPosition && (
            <div
              className="absolute z-30 p-2 bg-slate-900 border border-pink-500/50 rounded-lg shadow-xl flex items-center gap-2"
              style={{
                left: `${Math.min(textPosition.x * 0.7, 700)}px`,
                top: `${Math.min(textPosition.y * 0.7, 500)}px`,
              }}
            >
              <input
                type="text"
                autoFocus
                placeholder="Digite o texto..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInsertText()}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"
              />
              <button
                onClick={handleInsertText}
                className="px-2 py-1 bg-pink-600 text-white text-xs rounded hover:bg-pink-500 font-medium"
              >
                Inserir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
