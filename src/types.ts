export type AppId = 'dashboard' | 'spreadsheet' | 'documents' | 'database' | 'code' | 'paint';

export interface AppInfo {
  id: AppId;
  name: string;
  tagline: string;
  iconName: string;
  description: string;
  accentColor: string;
  badge?: string;
}

export interface SuiteDocumentMeta {
  id: string;
  appId: AppId;
  title: string;
  createdAt: number;
  updatedAt: number;
  previewSnippet?: string;
  sizeBytes?: number;
}

// Database query history item
export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  durationMs: number;
  rowCount: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

// Code file/snippet
export interface CodeSnippet {
  id: string;
  title: string;
  language: 'javascript' | 'python' | 'html' | 'sql' | 'lua';
  code: string;
  updatedAt: number;
}

// Paint saved artwork
export interface PaintDrawing {
  id: string;
  title: string;
  dataUrl: string;
  updatedAt: number;
  width: number;
  height: number;
}
