export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  note: string;
  date: string; // YYYY-MM-DD
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  limit: number; // месячный лимит, 0 = без лимита
}

const EXP_KEY = 'eo_expenses_v1';
const CAT_KEY = 'eo_categories_v1';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Продукты', icon: 'ShoppingCart', color: '#0ea5e9', limit: 20000 },
  { id: 'transport', name: 'Транспорт', icon: 'Car', color: '#22c55e', limit: 8000 },
  { id: 'home', name: 'Жильё', icon: 'Home', color: '#a855f7', limit: 30000 },
  { id: 'fun', name: 'Развлечения', icon: 'Gamepad2', color: '#f59e0b', limit: 10000 },
  { id: 'health', name: 'Здоровье', icon: 'HeartPulse', color: '#ef4444', limit: 0 },
  { id: 'other', name: 'Прочее', icon: 'Package', color: '#64748b', limit: 0 },
];

export const CATEGORY_COLORS = [
  '#0ea5e9', '#22c55e', '#a855f7', '#f59e0b',
  '#ef4444', '#64748b', '#ec4899', '#14b8a6',
];

export function loadExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(EXP_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

export function saveExpenses(list: Expense[]) {
  localStorage.setItem(EXP_KEY, JSON.stringify(list));
}

export function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(CAT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return DEFAULT_CATEGORIES;
}

export function saveCategories(list: Category[]) {
  localStorage.setItem(CAT_KEY, JSON.stringify(list));
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(n);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(expenses: Expense[], categories: Category[]) {
  const catName: Record<string, string> = {};
  categories.forEach((c) => (catName[c.id] = c.name));
  const rows = [['Дата', 'Категория', 'Сумма', 'Комментарий']];
  [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((e) => {
      rows.push([
        e.date,
        catName[e.categoryId] ?? 'Без категории',
        String(e.amount),
        (e.note || '').replace(/"/g, '""'),
      ]);
    });
  const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${c}"`).join(';')).join('\n');
  downloadFile(`расходы_${today()}.csv`, csv, 'text/csv;charset=utf-8');
}

export function exportJSON(expenses: Expense[], categories: Category[]) {
  const data = JSON.stringify({ version: 1, expenses, categories }, null, 2);
  downloadFile(`backup_${today()}.json`, data, 'application/json');
}

export interface ImportResult {
  expenses: Expense[];
  categories: Category[];
}

export function importJSON(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.expenses) || !Array.isArray(data.categories)) {
          throw new Error('bad');
        }
        resolve({ expenses: data.expenses, categories: data.categories });
      } catch {
        reject(new Error('Неверный формат файла'));
      }
    };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsText(file);
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}