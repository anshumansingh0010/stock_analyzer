import { TabType } from '../types';

export type ShortcutActionId = 'chat' | 'market' | 'stocks' | 'news' | 'portfolio' | 'overlay';

export interface ShortcutItem {
  id: ShortcutActionId;
  label: string;
  action: TabType | null;
  defaultKeys: string[];
  customKey: string | null;
}

export const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  { id: 'chat',      label: 'Switch to AI Chat',             action: 'chat',      defaultKeys: ['1', 'Alt+1'], customKey: null },
  { id: 'market',    label: 'Switch to Market Dashboard',    action: 'market',    defaultKeys: ['2', 'Alt+2'], customKey: null },
  { id: 'stocks',    label: 'Switch to Stock Technicals',    action: 'stocks',    defaultKeys: ['3', 'Alt+3'], customKey: null },
  { id: 'news',      label: 'Switch to Live News Feed',      action: 'news',      defaultKeys: ['4', 'Alt+4'], customKey: null },
  { id: 'portfolio', label: 'Switch to Portfolio Tracker',   action: 'portfolio', defaultKeys: ['5', 'Alt+5'], customKey: null },
  { id: 'overlay',   label: 'Toggle Shortcuts Overlay',      action: null,        defaultKeys: ['Cmd/Ctrl+K', '?'], customKey: null },
];

const STORAGE_KEY = 'stock_sense_custom_shortcuts';

export function loadCustomShortcuts(): Record<ShortcutActionId, string | null> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse custom shortcuts', e);
  }
  return {
    chat: null,
    market: null,
    stocks: null,
    news: null,
    portfolio: null,
    overlay: null,
  };
}

export function saveCustomShortcuts(mapping: Record<string, string | null>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
  } catch (e) {
    console.error('Failed to save custom shortcuts', e);
  }
}

export function formatKeyEvent(e: KeyboardEvent): string | null {
  // Ignore solitary modifier keypresses
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
    return null;
  }

  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Cmd');

  let keyName = e.key;
  if (keyName === ' ') keyName = 'Space';
  else if (keyName.length === 1) keyName = keyName.toUpperCase();

  parts.push(keyName);
  return parts.join('+');
}

export function matchesKeyCombination(e: KeyboardEvent, comboString: string): boolean {
  if (!comboString) return false;
  
  const formatted = formatKeyEvent(e);
  if (!formatted) return false;

  // Case-insensitive comparison
  if (formatted.toLowerCase() === comboString.toLowerCase()) {
    return true;
  }

  // Also check single key matching (e.g. key 'g' or code 'KeyG')
  const comboLower = comboString.toLowerCase();
  const keyLower = e.key ? e.key.toLowerCase() : '';
  
  if (comboLower === keyLower) return true;

  return false;
}
