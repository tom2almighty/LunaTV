import { apiFetch } from '../api-client';
import type { SearchResult } from '../types';

export async function searchAllSources(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const resp = await apiFetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
  if (!resp.ok) throw new Error(`搜索失败: HTTP ${resp.status}`);
  const data = await resp.json() as { items?: SearchResult[] };
  return data.items || [];
}

export interface SearchStreamCallbacks {
  onStart(totalSources: number): void;
  onResult(items: SearchResult[], sourceKey: string, sourceName: string): void;
  onProgress(completed: number, total: number): void;
  onComplete(totalResults: number, completedSources: number): void;
}

async function searchWithJsonFallback(query: string, cb: SearchStreamCallbacks): Promise<void> {
  const resp = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!resp.ok) throw new Error(`搜索失败: HTTP ${resp.status}`);
  const data = await resp.json() as { items?: SearchResult[]; totalSources?: number; completedSources?: number };
  const total = data.totalSources || 0;
  const completed = data.completedSources || total;
  cb.onStart(total);
  cb.onResult(data.items || [], '', '');
  cb.onProgress(completed, total);
  cb.onComplete((data.items || []).length, completed);
}

export async function searchStream(query: string, cb: SearchStreamCallbacks): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;

  const resp = await apiFetch(`/api/search-stream?q=${encodeURIComponent(trimmed)}`);
  if (!resp.ok || !resp.body) {
    await searchWithJsonFallback(trimmed, cb);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = false;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as {
      type: 'start' | 'result' | 'progress' | 'complete' | 'error';
      totalSources?: number;
      items?: SearchResult[];
      sourceKey?: string;
      sourceName?: string;
      completed?: number;
      total?: number;
      totalResults?: number;
      completedSources?: number;
      message?: string;
    };

    if (event.type === 'start') cb.onStart(event.totalSources || 0);
    if (event.type === 'result') cb.onResult(event.items || [], event.sourceKey || '', event.sourceName || '');
    if (event.type === 'progress') cb.onProgress(event.completed || 0, event.total || 0);
    if (event.type === 'complete') {
      completed = true;
      cb.onComplete(event.totalResults || 0, event.completedSources || 0);
    }
    if (event.type === 'error') throw new Error(event.message || '搜索失败');
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) handleLine(line);
  }

  buffer += decoder.decode();
  if (buffer) handleLine(buffer);
  if (!completed) cb.onComplete(0, 0);
}
