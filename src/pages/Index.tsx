import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import {
  Expense, Category, loadExpenses, saveExpenses, loadCategories,
  saveCategories, formatMoney, uid, CATEGORY_COLORS,
  exportCSV, exportJSON, importJSON, DEFAULT_CATEGORIES,
} from '@/lib/expenses';

type Tab = 'add' | 'history' | 'reports' | 'categories' | 'budget';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'add', label: 'Добавить', icon: 'PlusCircle' },
  { id: 'history', label: 'История', icon: 'List' },
  { id: 'reports', label: 'Отчёты', icon: 'PieChart' },
  { id: 'categories', label: 'Категории', icon: 'Tags' },
  { id: 'budget', label: 'Бюджет', icon: 'Wallet' },
];

const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (d: string) => d.slice(0, 7);
const curMonth = () => today().slice(0, 7);

export default function Index() {
  const [tab, setTab] = useState<Tab>('add');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setExpenses(loadExpenses());
    setCategories(loadCategories());
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveExpenses(expenses); }, [expenses, loaded]);
  useEffect(() => { if (loaded) saveCategories(categories); }, [categories, loaded]);

  const catById = useMemo(() => {
    const m: Record<string, Category> = {};
    categories.forEach((c) => (m[c.id] = c));
    return m;
  }, [categories]);

  const monthTotal = useMemo(
    () => expenses.filter((e) => monthKey(e.date) === curMonth()).reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { text: string; action: () => void }>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const res = await importJSON(file);
        setExpenses(res.expenses);
        setCategories(res.categories);
        toast.success('Данные импортированы', { description: `Записей: ${res.expenses.length}` });
      } catch (err) {
        toast.error((err as Error).message);
      }
    };
    input.click();
  };

  const MENUS: Record<string, { label: string; icon: string; onClick: () => void; danger?: boolean }[]> = {
    'Файл': [
      { label: 'Экспорт в CSV (Excel)', icon: 'FileSpreadsheet', onClick: () => { exportCSV(expenses, categories); toast.success('Файл CSV сохранён'); } },
      { label: 'Сохранить копию (JSON)', icon: 'Download', onClick: () => { exportJSON(expenses, categories); toast.success('Резервная копия сохранена'); } },
      { label: 'Загрузить из копии', icon: 'Upload', onClick: handleImport },
    ],
    'Правка': [
      { label: 'Сбросить категории', icon: 'RotateCcw', onClick: () => setConfirm({ text: 'Вернуть стандартный набор категорий? Ваши категории будут заменены.', action: () => { setCategories(DEFAULT_CATEGORIES); toast.success('Категории сброшены'); } }) },
      { label: 'Удалить все расходы', icon: 'Eraser', danger: true, onClick: () => setConfirm({ text: 'Удалить все записи расходов? Это действие необратимо.', action: () => { setExpenses([]); toast.success('Все расходы удалены'); } }) },
      { label: 'Полный сброс данных', icon: 'Trash2', danger: true, onClick: () => setConfirm({ text: 'Полностью очистить приложение? Удалятся все расходы и категории.', action: () => { setExpenses([]); setCategories(DEFAULT_CATEGORIES); toast.success('Данные очищены'); } }) },
    ],
    'Вид': [
      { label: 'Добавить расход', icon: 'PlusCircle', onClick: () => setTab('add') },
      { label: 'История', icon: 'List', onClick: () => setTab('history') },
      { label: 'Отчёты', icon: 'PieChart', onClick: () => setTab('reports') },
      { label: 'Категории', icon: 'Tags', onClick: () => setTab('categories') },
      { label: 'Бюджет', icon: 'Wallet', onClick: () => setTab('budget') },
    ],
    'Справка': [
      { label: 'О программе', icon: 'Info', onClick: () => setAboutOpen(true) },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/40 font-sans text-foreground" onClick={() => setOpenMenu(null)}>
      {/* Menu bar */}
      <div className="flex items-center gap-1 bg-card border-b border-border px-2 py-1 text-sm select-none">
        <div className="flex items-center gap-2 px-2 font-semibold text-primary">
          <Icon name="Coins" size={18} />
          <span>Органайзер расходов</span>
        </div>
        <span className="w-px h-4 bg-border mx-1" />
        {Object.keys(MENUS).map((m) => (
          <div key={m} className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpenMenu(openMenu === m ? null : m)}
              className={`px-2 py-0.5 rounded transition-colors ${
                openMenu === m ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {m}
            </button>
            {openMenu === m && (
              <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] bg-card border border-border rounded-md shadow-lg py-1 animate-fade-in">
                {MENUS[m].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setOpenMenu(null); item.onClick(); }}
                    className={`flex items-center gap-2.5 w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
                      item.danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground'
                    }`}
                  >
                    <Icon name={item.icon} size={15} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tab bar (toolbar) */}
      <div className="flex bg-card border-b border-border px-2 pt-1.5 gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm rounded-t-md border border-b-0 whitespace-nowrap transition-colors ${
                active
                  ? 'bg-muted/40 border-border text-primary font-medium -mb-px'
                  : 'border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon name={t.icon} size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto animate-fade-in" key={tab}>
        {tab === 'add' && (
          <AddTab categories={categories} onAdd={(e) => { setExpenses((p) => [e, ...p]); toast.success('Расход добавлен', { description: formatMoney(e.amount) }); }} />
        )}
        {tab === 'history' && (
          <HistoryTab
            expenses={expenses} catById={catById} categories={categories}
            onUpdate={(e) => setExpenses((p) => p.map((x) => (x.id === e.id ? e : x)))}
            onDelete={(id) => { setExpenses((p) => p.filter((x) => x.id !== id)); toast('Запись удалена'); }}
          />
        )}
        {tab === 'reports' && <ReportsTab expenses={expenses} categories={categories} />}
        {tab === 'categories' && (
          <CategoriesTab
            categories={categories} expenses={expenses}
            onSave={(list) => setCategories(list)}
          />
        )}
        {tab === 'budget' && <BudgetTab categories={categories} expenses={expenses} onSave={(list) => setCategories(list)} />}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between bg-card border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Icon name="CircleDot" size={12} className="text-primary" /> Готово
        </span>
        <span className="font-mono">
          Записей: {expenses.length} · За {curMonth()}: <b className="text-foreground">{formatMoney(monthTotal)}</b>
        </span>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 animate-fade-in" onClick={() => setConfirm(null)}>
          <div className="bg-card border border-border rounded-md shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/40">
              <Icon name="TriangleAlert" size={16} className="text-destructive" />
              <h3 className="text-sm font-semibold">Подтверждение</h3>
            </header>
            <p className="p-4 text-sm text-muted-foreground">{confirm.text}</p>
            <footer className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-secondary/20">
              <Btn variant="flat" onClick={() => setConfirm(null)}>Отмена</Btn>
              <Btn variant="danger" onClick={() => { confirm.action(); setConfirm(null); }}>
                <Icon name="Check" size={15} /> Подтвердить
              </Btn>
            </footer>
          </div>
        </div>
      )}

      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 animate-fade-in" onClick={() => setAboutOpen(false)}>
          <div className="bg-card border border-border rounded-md shadow-xl w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <span className="inline-flex w-14 h-14 rounded-lg bg-primary text-primary-foreground items-center justify-center mb-3">
                <Icon name="Coins" size={28} />
              </span>
              <h3 className="text-base font-semibold">Органайзер расходов</h3>
              <p className="text-xs text-muted-foreground mt-1">Версия 1.0 · Qt-style</p>
              <p className="text-sm text-muted-foreground mt-4">
                Учёт расходов по категориям, отчёты, диаграммы и контроль бюджета. Все данные хранятся в вашем браузере.
              </p>
            </div>
            <footer className="flex justify-center px-4 py-3 border-t border-border bg-secondary/20">
              <Btn onClick={() => setAboutOpen(false)}><Icon name="Check" size={15} /> Закрыть</Btn>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Reusable Qt-style controls ---------- */

function Panel({ title, icon, children, action }: { title: string; icon: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-md shadow-sm mb-4">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/40 rounded-t-md">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
          <Icon name={icon} size={16} /> {title}
        </h2>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full bg-background border border-input rounded px-3 py-2 text-sm qt-inset focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition';

function Btn({ children, onClick, variant = 'primary', type = 'button', size = 'md' }: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger' | 'flat';
  type?: 'button' | 'submit'; size?: 'md' | 'sm';
}) {
  const base = `inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors active:scale-[0.98] ${
    size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
  }`;
  const styles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
    flat: 'bg-secondary text-secondary-foreground hover:bg-accent border border-border',
    ghost: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
    danger: 'text-destructive hover:bg-destructive/10',
  }[variant];
  return (
    <button type={type} onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

/* ---------- ADD TAB ---------- */

function AddTab({ categories, onAdd }: { categories: Category[]; onAdd: (e: Expense) => void }) {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());

  const submit = () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!value || value <= 0) return toast.error('Введите корректную сумму');
    if (!categoryId) return toast.error('Выберите категорию');
    onAdd({ id: uid(), amount: value, categoryId, note: note.trim(), date });
    setAmount(''); setNote('');
  };

  return (
    <Panel title="Новый расход" icon="PlusCircle">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Сумма, ₽">
          <input className={inputCls} inputMode="decimal" placeholder="0" value={amount}
            onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoFocus />
        </Field>
        <Field label="Дата">
          <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4">
        <span className="block text-xs font-medium text-muted-foreground mb-2">Категория</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.map((c) => {
            const active = categoryId === c.id;
            return (
              <button key={c.id} onClick={() => setCategoryId(c.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm text-left transition-colors ${
                  active ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-background hover:bg-accent'
                }`}>
                <span className="w-7 h-7 rounded flex items-center justify-center text-white shrink-0" style={{ background: c.color }}>
                  <Icon name={c.icon} size={15} />
                </span>
                <span className="truncate">{c.name}</span>
                {active && <Icon name="Check" size={15} className="ml-auto text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <Field label="Комментарий (необязательно)">
          <input className={inputCls} placeholder="Например: обед в кафе" value={note}
            onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </Field>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <Btn variant="flat" onClick={() => { setAmount(''); setNote(''); setDate(today()); }}>
          <Icon name="RotateCcw" size={15} /> Сбросить
        </Btn>
        <Btn onClick={submit}>
          <Icon name="Plus" size={16} /> Добавить расход
        </Btn>
      </div>
    </Panel>
  );
}

/* ---------- HISTORY TAB ---------- */

function HistoryTab({ expenses, catById, categories, onUpdate, onDelete }: {
  expenses: Expense[]; catById: Record<string, Category>; categories: Category[];
  onUpdate: (e: Expense) => void; onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);

  const list = useMemo(() => {
    return expenses
      .filter((e) => filter === 'all' || e.categoryId === filter)
      .filter((e) => !query || e.note.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [expenses, filter, query]);

  const total = list.reduce((s, e) => s + e.amount, 0);

  return (
    <Panel title="История расходов" icon="List"
      action={<span className="text-xs font-mono text-muted-foreground">Итого: <b className="text-foreground">{formatMoney(total)}</b></span>}>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Icon name="Search" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={inputCls + ' pl-8'} placeholder="Поиск по комментарию" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className={inputCls + ' max-w-[180px]'} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Все категории</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <Empty icon="Inbox" text="Записей пока нет" />
      ) : (
        <div className="border border-border rounded overflow-hidden divide-y divide-border">
          {list.map((e) => {
            const c = catById[e.categoryId];
            return (
              <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/40 transition-colors">
                <span className="w-8 h-8 rounded flex items-center justify-center text-white shrink-0" style={{ background: c?.color ?? '#64748b' }}>
                  <Icon name={c?.icon ?? 'Package'} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{c?.name ?? 'Без категории'}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {new Date(e.date).toLocaleDateString('ru-RU')}{e.note && ` · ${e.note}`}
                  </div>
                </div>
                <span className="font-mono text-sm font-semibold whitespace-nowrap">{formatMoney(e.amount)}</span>
                <Btn size="sm" variant="ghost" onClick={() => setEditing(e)}><Icon name="Pencil" size={14} /></Btn>
                <Btn size="sm" variant="danger" onClick={() => onDelete(e.id)}><Icon name="Trash2" size={14} /></Btn>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditDialog expense={editing} categories={categories}
          onClose={() => setEditing(null)}
          onSave={(e) => { onUpdate(e); setEditing(null); toast.success('Изменения сохранены'); }} />
      )}
    </Panel>
  );
}

function EditDialog({ expense, categories, onClose, onSave }: {
  expense: Expense; categories: Category[]; onClose: () => void; onSave: (e: Expense) => void;
}) {
  const [amount, setAmount] = useState(String(expense.amount));
  const [categoryId, setCategoryId] = useState(expense.categoryId);
  const [note, setNote] = useState(expense.note);
  const [date, setDate] = useState(expense.date);

  const save = () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!value || value <= 0) return toast.error('Введите корректную сумму');
    onSave({ ...expense, amount: value, categoryId, note: note.trim(), date });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-card border border-border rounded-md shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/40">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Icon name="Pencil" size={15} /> Редактировать запись</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={18} /></button>
        </header>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Сумма, ₽"><input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" /></Field>
            <Field label="Дата"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          <Field label="Категория">
            <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Комментарий"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <footer className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-secondary/20">
          <Btn variant="flat" onClick={onClose}>Отмена</Btn>
          <Btn onClick={save}><Icon name="Check" size={15} /> Сохранить</Btn>
        </footer>
      </div>
    </div>
  );
}

/* ---------- REPORTS TAB ---------- */

function ReportsTab({ expenses, categories }: {
  expenses: Expense[]; categories: Category[];
}) {
  const months = useMemo(() => {
    const set = new Set(expenses.map((e) => monthKey(e.date)));
    set.add(curMonth());
    return Array.from(set).sort().reverse();
  }, [expenses]);
  const [month, setMonth] = useState(curMonth());

  const inMonth = useMemo(() => expenses.filter((e) => monthKey(e.date) === month), [expenses, month]);
  const total = inMonth.reduce((s, e) => s + e.amount, 0);

  const byCat = useMemo(() => {
    return categories
      .map((c) => ({ cat: c, sum: inMonth.filter((e) => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0) }))
      .filter((x) => x.sum > 0)
      .sort((a, b) => b.sum - a.sum);
  }, [categories, inMonth]);

  let acc = 0;
  const segments = byCat.map((x) => {
    const frac = total ? x.sum / total : 0;
    const seg = { color: x.cat.color, from: acc, to: acc + frac };
    acc += frac;
    return seg;
  });
  const gradient = total
    ? `conic-gradient(${segments.map((s) => `${s.color} ${(s.from * 100).toFixed(2)}% ${(s.to * 100).toFixed(2)}%`).join(', ')})`
    : 'conic-gradient(hsl(var(--muted)) 0% 100%)';

  return (
    <>
      <Panel title="Отчёт по категориям" icon="PieChart"
        action={
          <select className="bg-background border border-input rounded px-2 py-1 text-xs" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        }>
        {total === 0 ? <Empty icon="ChartPie" text="Нет данных за этот период" /> : (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative shrink-0">
              <div className="w-44 h-44 rounded-full" style={{ background: gradient }} />
              <div className="absolute inset-6 bg-card rounded-full flex flex-col items-center justify-center border border-border">
                <span className="text-xs text-muted-foreground">Всего</span>
                <span className="font-mono font-bold text-base">{formatMoney(total)}</span>
              </div>
            </div>
            <div className="flex-1 w-full space-y-2.5">
              {byCat.map((x) => {
                const pct = (x.sum / total) * 100;
                return (
                  <div key={x.cat.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm" style={{ background: x.cat.color }} />
                        {x.cat.name}
                      </span>
                      <span className="font-mono text-muted-foreground">{formatMoney(x.sum)} · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div className="h-full rounded transition-all" style={{ width: `${pct}%`, background: x.cat.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Динамика по месяцам" icon="BarChart3">
        <MonthlyBars expenses={expenses} />
      </Panel>
    </>
  );
}

function MonthlyBars({ expenses }: { expenses: Expense[] }) {
  const data = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => { map[monthKey(e.date)] = (map[monthKey(e.date)] ?? 0) + e.amount; });
    const months: string[] = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1).toISOString().slice(0, 7);
      months.push(m);
    }
    return months.map((m) => ({ m, sum: map[m] ?? 0 }));
  }, [expenses]);

  const max = Math.max(...data.map((d) => d.sum), 1);

  return (
    <div className="flex items-end justify-between gap-2 h-44 pt-2">
      {data.map((d) => (
        <div key={d.m} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
          <span className="text-[10px] font-mono text-muted-foreground">{d.sum ? Math.round(d.sum / 1000) + 'k' : ''}</span>
          <div className="w-full bg-primary/80 hover:bg-primary rounded-t transition-all" style={{ height: `${(d.sum / max) * 100}%`, minHeight: d.sum ? 4 : 0 }} title={formatMoney(d.sum)} />
          <span className="text-[10px] text-muted-foreground">{d.m.slice(5)}.{d.m.slice(2, 4)}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- CATEGORIES TAB ---------- */

function CategoriesTab({ categories, expenses, onSave }: {
  categories: Category[]; expenses: Expense[]; onSave: (list: Category[]) => void;
}) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const usage = (id: string) => expenses.filter((e) => e.categoryId === id).length;

  const remove = (id: string) => {
    if (usage(id) > 0) return toast.error('Нельзя удалить: есть расходы в этой категории');
    if (categories.length <= 1) return toast.error('Должна остаться хотя бы одна категория');
    onSave(categories.filter((c) => c.id !== id));
    toast('Категория удалена');
  };

  const upsert = (c: Category, isNew: boolean) => {
    if (isNew) onSave([...categories, c]);
    else onSave(categories.map((x) => (x.id === c.id ? c : x)));
    setEditing(null); setCreating(false);
    toast.success(isNew ? 'Категория создана' : 'Категория обновлена');
  };

  return (
    <Panel title="Категории расходов" icon="Tags"
      action={<Btn size="sm" onClick={() => setCreating(true)}><Icon name="Plus" size={15} /> Создать</Btn>}>
      <div className="grid sm:grid-cols-2 gap-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 border border-border rounded bg-background">
            <span className="w-9 h-9 rounded flex items-center justify-center text-white shrink-0" style={{ background: c.color }}>
              <Icon name={c.icon} size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground">{usage(c.id)} записей · лимит {c.limit ? formatMoney(c.limit) : '—'}</div>
            </div>
            <Btn size="sm" variant="ghost" onClick={() => setEditing(c)}><Icon name="Pencil" size={14} /></Btn>
            <Btn size="sm" variant="danger" onClick={() => remove(c.id)}><Icon name="Trash2" size={14} /></Btn>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <CategoryDialog
          category={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={upsert}
        />
      )}
    </Panel>
  );
}

const ICON_CHOICES = ['ShoppingCart', 'Car', 'Home', 'Gamepad2', 'HeartPulse', 'Package', 'Coffee', 'Plane', 'Gift', 'Shirt', 'Smartphone', 'Book'];

function CategoryDialog({ category, onClose, onSave }: {
  category: Category | null; onClose: () => void; onSave: (c: Category, isNew: boolean) => void;
}) {
  const isNew = !category;
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? ICON_CHOICES[0]);
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [limit, setLimit] = useState(String(category?.limit ?? 0));

  const save = () => {
    if (!name.trim()) return toast.error('Введите название');
    onSave({
      id: category?.id ?? uid(),
      name: name.trim(), icon, color,
      limit: parseFloat(limit.replace(',', '.')) || 0,
    }, isNew);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-card border border-border rounded-md shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/40">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="Tags" size={15} /> {isNew ? 'Новая категория' : 'Редактировать категорию'}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={18} /></button>
        </header>
        <div className="p-4 space-y-4">
          <Field label="Название"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
          <Field label="Месячный лимит, ₽ (0 — без лимита)"><input className={inputCls} value={limit} inputMode="decimal" onChange={(e) => setLimit(e.target.value)} /></Field>
          <div>
            <span className="block text-xs font-medium text-muted-foreground mb-2">Иконка</span>
            <div className="grid grid-cols-6 gap-2">
              {ICON_CHOICES.map((ic) => (
                <button key={ic} onClick={() => setIcon(ic)}
                  className={`aspect-square rounded border flex items-center justify-center transition-colors ${
                    icon === ic ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent text-muted-foreground'
                  }`}>
                  <Icon name={ic} size={18} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-xs font-medium text-muted-foreground mb-2">Цвет</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((cl) => (
                <button key={cl} onClick={() => setColor(cl)}
                  className={`w-8 h-8 rounded-full border-2 transition ${color === cl ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ background: cl }} />
              ))}
            </div>
          </div>
        </div>
        <footer className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-secondary/20">
          <Btn variant="flat" onClick={onClose}>Отмена</Btn>
          <Btn onClick={save}><Icon name="Check" size={15} /> Сохранить</Btn>
        </footer>
      </div>
    </div>
  );
}

/* ---------- BUDGET TAB ---------- */

function BudgetTab({ categories, expenses, onSave }: {
  categories: Category[]; expenses: Expense[]; onSave: (list: Category[]) => void;
}) {
  const inMonth = expenses.filter((e) => monthKey(e.date) === curMonth());
  const withLimit = categories.filter((c) => c.limit > 0);
  const totalLimit = withLimit.reduce((s, c) => s + c.limit, 0);
  const totalSpent = withLimit.reduce((s, c) => s + inMonth.filter((e) => e.categoryId === c.id).reduce((a, e) => a + e.amount, 0), 0);

  const setLimit = (id: string, val: number) => {
    onSave(categories.map((c) => (c.id === id ? { ...c, limit: Math.max(0, val) } : c)));
  };

  return (
    <>
      <Panel title="Бюджет на месяц" icon="Wallet">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Лимит" value={formatMoney(totalLimit)} />
          <Stat label="Потрачено" value={formatMoney(totalSpent)} accent={totalSpent > totalLimit && totalLimit > 0} />
          <Stat label="Остаток" value={formatMoney(Math.max(0, totalLimit - totalSpent))} />
        </div>
      </Panel>

      <Panel title="Лимиты по категориям" icon="Gauge">
        {categories.every((c) => !c.limit) ? (
          <Empty icon="Wallet" text="Лимиты не заданы. Установите их ниже." />
        ) : null}
        <div className="space-y-3">
          {categories.map((c) => {
            const spent = inMonth.filter((e) => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0);
            const pct = c.limit ? Math.min(100, (spent / c.limit) * 100) : 0;
            const over = c.limit > 0 && spent > c.limit;
            return (
              <div key={c.id} className="border border-border rounded p-3 bg-background">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-7 h-7 rounded flex items-center justify-center text-white shrink-0" style={{ background: c.color }}>
                    <Icon name={c.icon} size={15} />
                  </span>
                  <span className="text-sm font-medium flex-1">{c.name}</span>
                  {over && (
                    <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                      <Icon name="TriangleAlert" size={13} /> Превышен
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <input type="number" min={0} step={1000} value={c.limit || ''}
                      placeholder="нет"
                      onChange={(e) => setLimit(c.id, parseFloat(e.target.value) || 0)}
                      className="w-24 bg-background border border-input rounded px-2 py-1 text-xs text-right qt-inset focus:outline-none focus:ring-2 focus:ring-ring/40" />
                    <span className="text-xs text-muted-foreground">₽</span>
                  </div>
                </div>
                {c.limit > 0 && (
                  <>
                    <div className="h-2.5 bg-muted rounded overflow-hidden">
                      <div className="h-full rounded transition-all" style={{ width: `${pct}%`, background: over ? 'hsl(var(--destructive))' : c.color }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1 font-mono">
                      <span>{formatMoney(spent)}</span>
                      <span>из {formatMoney(c.limit)}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-border rounded p-3 bg-background">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`font-mono font-bold text-base ${accent ? 'text-destructive' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
      <Icon name={icon} size={36} className="mb-2 opacity-50" />
      <span className="text-sm">{text}</span>
    </div>
  );
}