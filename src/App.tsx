import { useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useSearch, Router as WouterRouter } from 'wouter';
import {
  ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, Clock3, Filter,
  Flame, FolderOpen, Headphones, Heart, Home, Keyboard, Layers3, Menu,
  Pencil, Play, Plus, RotateCcw, Search, Sparkles, Star, Target, Trash2,
  Trophy, Volume2, X, Zap,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { feedbackAudio, playFeedback, shuffle, vocabulary, type Level, type Word } from '@/lib/vocabulary';
import {
  createWordList, deleteWordList, loadActiveListId, loadWordLists, persistActiveListId,
  persistWordLists, renameWordList, toggleWordInList, type WordList,
} from '@/lib/wordLists';

const queryClient = new QueryClient();
const levels: Array<Level | 'ALL'> = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'];
const levelColor: Record<Level, string> = {
  N5: 'hsl(69 73% 52%)', N4: 'hsl(194 71% 42%)', N3: 'hsl(38 68% 59%)',
  N2: 'hsl(11 77% 61%)', N1: 'hsl(224 37% 27%)',
};

type QuizResult = { score: number; total: number; answers: Array<{ word: Word; choice: string; correct: boolean }>; level: string; finishedAt: string };
type HistoryEntry = { date: string; score: number; total: number };
const HISTORY_KEY = 'kotoba-history';
function toDateKey(date: Date) { return date.toISOString().slice(0, 10); }
function loadHistory(): HistoryEntry[] { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } }
function recordHistory(entry: HistoryEntry) { const current = loadHistory(); current.push(entry); localStorage.setItem(HISTORY_KEY, JSON.stringify(current.slice(-300))); }
function computeStreaks(history: HistoryEntry[]) {
  const days = new Set(history.map((item) => item.date));
  let current = 0;
  const cursor = new Date();
  while (days.has(toDateKey(cursor))) { current += 1; cursor.setDate(cursor.getDate() - 1); }
  const sortedDays = Array.from(days).sort();
  let best = 0, run = 0, previous: string | null = null;
  for (const day of sortedDays) {
    if (previous) {
      const expected = new Date(previous); expected.setDate(expected.getDate() + 1);
      run = toDateKey(expected) === day ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    previous = day;
  }
  return { current, best: Math.max(best, current) };
}

function cx(...classes: Array<string | false | null | undefined>) { return classes.filter(Boolean).join(' '); }

// Save slots: multiple renamable word lists, one of which is "active" (what
// the heart button on a word card saves into). Reads/writes localStorage
// directly, mirroring how history/favorites already worked in this file.
function useWordLists() {
  const [lists, setLists] = useState<WordList[]>(() => loadWordLists());
  const [activeId, setActiveId] = useState<string>(() => loadActiveListId(loadWordLists()));
  useEffect(() => { persistWordLists(lists); }, [lists]);
  useEffect(() => { if (activeId) persistActiveListId(activeId); }, [activeId]);
  const activeList = useMemo(() => lists.find((list) => list.id === activeId) ?? lists[0], [lists, activeId]);
  const createList = (name: string) => {
    const { lists: next, id } = createWordList(lists, name);
    setLists(next); setActiveId(id); return id;
  };
  const renameList = (id: string, name: string) => setLists((current) => renameWordList(current, id, name));
  const deleteList = (id: string) => setLists((current) => {
    const next = deleteWordList(current, id);
    if (activeId === id) setActiveId(next[0].id);
    return next;
  });
  const toggleWord = (wordId: string, listId: string = activeId) => setLists((current) => toggleWordInList(current, listId, wordId));
  return { lists, activeList, activeId, setActiveId, createList, renameList, deleteList, toggleWord };
}

function Logo() {
  return <Link href="/" className="flex items-center gap-3" data-testid="link-logo">
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] hard-shadow rotate-[-4deg]">
      <span className="kanji-display text-2xl font-bold">言</span>
    </span>
    <span className="leading-none"><strong className="block text-[1.05rem] tracking-[-.04em]">kotoba</strong><span className="mono-label text-[hsl(var(--sidebar-foreground)/.62)]">cabinet</span></span>
  </Link>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  useEffect(() => { const onFocus = () => setHistory(loadHistory()); window.addEventListener('focus', onFocus); return () => window.removeEventListener('focus', onFocus); }, []);
  const { current: currentStreak } = useMemo(() => computeStreaks(history), [history]);
  const last7Days = useMemo(() => { const days = new Set(history.map((item) => item.date)); const cursor = new Date(); const result: boolean[] = []; for (let i = 0; i < 7; i += 1) { result.unshift(days.has(toDateKey(cursor))); cursor.setDate(cursor.getDate() - 1); } return result; }, [history]);
  const navItems = [
    { href: '/', label: 'Cabinet', icon: Home },
    { href: '/quiz', label: 'Quiz deck', icon: Target },
    { href: '/results', label: 'Review', icon: Trophy },
  ];
  return <div className="paper-grain min-h-[100dvh] bg-background">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[246px] flex-col bg-[hsl(var(--sidebar))] px-5 py-6 text-[hsl(var(--sidebar-foreground))] md:flex">
      <Logo />
      <div className="mt-12">
        <p className="mono-label mb-3 px-3 text-[hsl(var(--sidebar-foreground)/.45)]">Desk / 01</p>
        <nav className="space-y-1" aria-label="Primary navigation">
          {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`} className={cx('group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors', location === href ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.68)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]')}>
            <Icon size={17} strokeWidth={location === href ? 2.6 : 1.8} /><span>{label}</span>{href === '/quiz' && <span className="ml-auto size-1.5 rounded-full bg-[hsl(var(--accent))]" />}
          </Link>)}
        </nav>
      </div>
      <div className="mt-auto rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.58)] p-4">
        <div className="mb-3 flex items-center justify-between"><span className="mono-label text-[hsl(var(--sidebar-foreground)/.5)]">Today's streak</span><Flame size={16} className="text-[hsl(var(--accent))]" /></div>
        <p className="font-serif text-3xl">{currentStreak} day{currentStreak === 1 ? '' : 's'}</p><p className="mt-1 text-xs text-[hsl(var(--sidebar-foreground)/.55)]">{currentStreak > 0 ? 'A small habit, kept alive.' : 'Finish a round today to start one.'}</p>
        <div className="mt-4 flex gap-1">{last7Days.map((played, day) => <span key={day} className={cx('h-1.5 flex-1 rounded-full', played ? 'bg-[hsl(var(--sidebar-primary))]' : 'bg-[hsl(var(--sidebar-foreground)/.17)]')} />)}</div>
      </div>
    </aside>
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-md md:ml-[246px] md:px-10">
      <div className="flex items-center gap-3 md:hidden"><button onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg p-2 hover:bg-muted" aria-label="Toggle menu" data-testid="button-menu"><Menu size={21} /></button><Logo /></div>
      <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex"><span className="mono-label">Mon 24 Jun 2024</span><span className="mx-1 text-border">/</span><span>Keep the words close.</span></div>
      <div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-[hsl(var(--secondary))]" /> offline-ready</div><div className="grid size-9 place-items-center rounded-full bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))]">Y</div></div>
    </header>
    {menuOpen && <div className="fixed inset-x-0 top-[72px] z-20 border-b border-border bg-card p-4 shadow-md md:hidden"><nav className="grid gap-1">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} onClick={() => setMenuOpen(false)} href={href} className="flex items-center gap-3 rounded-lg px-3 py-3 font-semibold hover:bg-muted"><Icon size={17} />{label}</Link>)}</nav></div>}
    <main className="md:ml-[246px]">{children}</main>
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card/95 px-6 py-2 backdrop-blur md:hidden">
      {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cx('flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-semibold', location === href ? 'text-[hsl(var(--secondary))]' : 'text-muted-foreground')}><Icon size={18} /><span>{label}</span></Link>)}
    </nav>
  </div>;
}

function LevelPill({ level }: { level: Level }) {
  return <span className="mono-label inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold" style={{ color: levelColor[level], backgroundColor: `${levelColor[level]}22` }}>{level}</span>;
}

function SectionTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex items-end justify-between gap-4"><div><p className="mono-label mb-2 text-[hsl(var(--secondary))]">{eyebrow}</p><h2 className="font-serif text-3xl tracking-[-.035em] md:text-4xl">{title}</h2></div>{action}</div>;
}

function StatCard({ icon: Icon, label, value, note, color }: { icon: typeof Flame; label: string; value: string; note: string; color: string }) {
  return <div className="soft-shadow rounded-2xl border border-border bg-card p-4"><div className="mb-4 flex items-center justify-between"><span className="mono-label text-muted-foreground">{label}</span><span className="grid size-8 place-items-center rounded-lg" style={{ color, backgroundColor: `${color}1c` }}><Icon size={16} /></span></div><p className="font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>;
}

function WordCard({ word, favorite, onFavorite }: { word: Word; favorite: boolean; onFavorite: () => void }) {
  return <article className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-md)]" data-testid={`word-card-${word.id}`}>
    <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full opacity-40" style={{ backgroundColor: levelColor[word.level] }} />
    <div className="relative flex items-start justify-between"><LevelPill level={word.level} /><button onClick={onFavorite} aria-label={favorite ? `Unfavorite ${word.expression}` : `Favorite ${word.expression}`} className={cx('rounded-lg p-1.5 transition-colors hover:bg-muted', favorite ? 'text-[hsl(var(--accent))]' : 'text-muted-foreground')} data-testid={`button-favorite-${word.id}`}><Heart size={17} fill={favorite ? 'currentColor' : 'none'} /></button></div>
    <p className="kanji-display mt-7 text-[2.7rem] leading-none">{word.expression}</p><p className="mt-2 text-sm font-medium text-[hsl(var(--secondary))]">{word.reading}</p><p className="mt-4 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">{word.meaning}</p>
    <div className="mt-5 flex items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground"><BookOpen size={13} /> tap to keep it close</div>
  </article>;
}

function SaveSlotBar({ wordLists }: { wordLists: ReturnType<typeof useWordLists> }) {
  const { lists, activeList, activeId, setActiveId, createList, renameList, deleteList } = wordLists;
  const [open, setOpen] = useState(false);
  if (!activeList) return null;
  const handleCreate = () => {
    const name = window.prompt('Name your new save slot:', `Save ${lists.length + 1}`);
    if (name && name.trim()) createList(name);
  };
  const handleRename = (list: WordList) => {
    const name = window.prompt('Rename this save slot:', list.name);
    if (name && name.trim()) renameList(list.id, name);
  };
  const handleDelete = (list: WordList) => {
    if (lists.length <= 1) return;
    if (window.confirm(`Delete "${list.name}" and its ${list.wordIds.length} saved word${list.wordIds.length === 1 ? '' : 's'}? This cannot be undone.`)) deleteList(list.id);
  };
  return <div className="relative">
    <button onClick={() => setOpen(!open)} className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted" data-testid="button-save-slot-menu">
      <FolderOpen size={16} className="text-[hsl(var(--accent))]" />
      <span className="max-w-[9rem] truncate">{activeList.name}</span>
      <span className="mono-label text-muted-foreground">{activeList.wordIds.length}</span>
      <ChevronDown size={14} className={cx('text-muted-foreground transition-transform', open && 'rotate-180')} />
    </button>
    {open && <>
      <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
      <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-72 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-md)]" data-testid="menu-save-slots">
        <p className="mono-label px-2 pb-2 pt-1 text-muted-foreground">Save slots</p>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {lists.map((list) => <div key={list.id} className={cx('group flex items-center gap-1 rounded-lg px-2 py-2', list.id === activeId ? 'bg-[hsl(var(--secondary)/.13)]' : 'hover:bg-muted')}>
            <button onClick={() => { setActiveId(list.id); setOpen(false); }} className="flex flex-1 items-center justify-between gap-2 text-left" data-testid={`button-select-slot-${list.id}`}>
              <span className={cx('truncate text-sm', list.id === activeId ? 'font-bold text-[hsl(var(--secondary))]' : 'font-medium')}>{list.name}</span>
              <span className="mono-label shrink-0 text-muted-foreground">{list.wordIds.length}</span>
            </button>
            <button onClick={() => handleRename(list)} aria-label={`Rename ${list.name}`} className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100" data-testid={`button-rename-slot-${list.id}`}><Pencil size={13} /></button>
            {lists.length > 1 && <button onClick={() => handleDelete(list)} aria-label={`Delete ${list.name}`} className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-[hsl(var(--destructive)/.14)] hover:text-[hsl(var(--destructive))] group-hover:opacity-100" data-testid={`button-delete-slot-${list.id}`}><Trash2 size={13} /></button>}
          </div>)}
        </div>
        <button onClick={handleCreate} className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-2 py-2 text-sm font-semibold text-muted-foreground hover:border-[hsl(var(--secondary))] hover:text-[hsl(var(--secondary))]" data-testid="button-create-slot"><Plus size={15} /> New save slot</button>
      </div>
    </>}
  </div>;
}

function Cabinet() {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<Level | 'ALL' | 'FAVORITES'>('ALL');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const wordLists = useWordLists();
  const { activeList, toggleWord } = wordLists;
  const [visible, setVisible] = useState(24);
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  useEffect(() => { const id = window.setTimeout(() => setReady(true), 180); return () => window.clearTimeout(id); }, []);
  const { current: currentRun, best: bestRun } = useMemo(() => computeStreaks(history), [history]);
  const lastEntry = history[history.length - 1];
  const lastScorePct = lastEntry ? Math.round((lastEntry.score / lastEntry.total) * 100) : null;
  const resetProgress = () => { if (!window.confirm('Reset your streak and score history? This cannot be undone.')) return; localStorage.removeItem(HISTORY_KEY); setHistory([]); };
  const activeWordIds = activeList?.wordIds ?? [];
  const filtered = useMemo(() => vocabulary.filter((word) => {
    const matchesText = `${word.expression} ${word.reading} ${word.meaning}`.toLowerCase().includes(query.toLowerCase());
    return matchesText && (level === 'ALL' || word.level === level) && (!favoritesOnly || activeWordIds.includes(word.id));
  }), [query, level, favoritesOnly, activeWordIds]);
  return <div className="mx-auto max-w-[1400px] px-5 py-8 pb-28 md:px-10 md:py-12 md:pb-12">
    <section className="relative overflow-hidden rounded-[1.75rem] bg-[hsl(var(--primary))] px-6 py-8 text-[hsl(var(--primary-foreground))] md:px-10 md:py-11">
      <div className="absolute -right-16 -top-24 size-72 rounded-full border-[28px] border-[hsl(var(--accent)/.9)] opacity-80" /><div className="absolute -bottom-16 right-24 size-36 rounded-full border-[18px] border-[hsl(var(--secondary)/.55)]" />
      <div className="relative max-w-2xl"><p className="mono-label mb-5 text-[hsl(var(--primary-foreground)/.55)]">Your vocabulary cabinet / 001</p><h1 className="font-serif text-5xl leading-[.96] tracking-[-.06em] md:text-7xl">A little room<br /><em className="text-[hsl(var(--accent))]">for new words.</em></h1><p className="mt-6 max-w-md text-sm leading-6 text-[hsl(var(--primary-foreground)/.66)]">A quiet, tactile place to browse the Japanese you want to remember — from N5 foundations to N1 nuance.</p></div>
      <Link href="/quiz" className="relative mt-8 inline-flex items-center gap-3 rounded-xl bg-[hsl(var(--accent))] px-4 py-3 text-sm font-bold text-[hsl(var(--foreground))] transition-transform hover:-translate-y-0.5" data-testid="button-hero-quiz">Start a quick round <ArrowRight size={16} /></Link>
      <span className="absolute bottom-6 right-8 hidden font-mono text-[10px] tracking-[.15em] text-[hsl(var(--primary-foreground)/.38)] md:block">言葉 / WORDS</span>
    </section>
    <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4" data-testid="cabinet-stats">
      <StatCard icon={Layers3} label="In the cabinet" value={vocabulary.length.toLocaleString()} note="across five levels" color="hsl(194 71% 42%)" />
      <StatCard icon={Heart} label="Kept close" value={activeWordIds.length.toString().padStart(2, '0')} note={activeList ? `in "${activeList.name}"` : 'your saved words'} color="hsl(11 77% 61%)" />
      <StatCard icon={Flame} label="Current run" value={`${currentRun} day${currentRun === 1 ? '' : 's'}`} note={bestRun > 0 ? `best: ${bestRun} day${bestRun === 1 ? '' : 's'}` : 'finish a round to start'} color="hsl(38 68% 59%)" />
      <StatCard icon={Target} label="Last score" value={lastScorePct !== null ? `${lastScorePct}%` : '—'} note={lastEntry ? `on ${lastEntry.date}` : 'no quizzes yet'} color="hsl(69 73% 45%)" />
    </section>
    {history.length > 0 && <div className="mt-3 flex justify-end"><button onClick={resetProgress} className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" data-testid="button-reset-progress">Reset streak &amp; score history</button></div>}
    <section className="mt-12"><SectionTitle eyebrow="The cabinet" title="Browse your words" action={<span className="hidden text-xs text-muted-foreground sm:block">{filtered.length.toLocaleString()} entries found</span>} />
      <div className="mb-3 flex flex-wrap items-center gap-2"><span className="mono-label text-muted-foreground">Saving into</span><SaveSlotBar wordLists={wordLists} /></div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setVisible(24); }} placeholder="Search kanji, reading, or meaning…" className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-[hsl(var(--secondary)/.35)]" data-testid="input-search" /></label>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"><button onClick={() => { setFavoritesOnly(!favoritesOnly); setVisible(24); }} className={cx('flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-semibold', favoritesOnly ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.16)]' : 'border-border bg-card')} data-testid="button-favorites-filter"><Heart size={15} fill={favoritesOnly ? 'currentColor' : 'none'} /> Saved</button><span className="h-11 w-px bg-border" />{levels.map((item) => <button key={item} onClick={() => { setLevel(item); setVisible(24); }} className={cx('h-11 shrink-0 rounded-xl border px-3 text-xs font-bold', level === item ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-border bg-card text-muted-foreground')} data-testid={`filter-${item}`}>{item === 'ALL' ? 'All levels' : item}</button>)}</div>
      </div>
      {!ready ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-muted" />)}</div> : filtered.length === 0 ? <div className="ruled rounded-2xl border border-dashed border-border px-6 py-20 text-center"><CircleHelp className="mx-auto text-muted-foreground" size={27} /><h3 className="mt-4 font-serif text-2xl">Nothing in this drawer.</h3><p className="mt-2 text-sm text-muted-foreground">Try another search or put a few saved words back in view.</p><button onClick={() => { setQuery(''); setLevel('ALL'); setFavoritesOnly(false); }} className="mt-5 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))]" data-testid="button-clear-filters">Clear filters</button></div> : <><div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">{filtered.slice(0, visible).map((word, index) => <div key={word.id} className="animate-rise" style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}><WordCard word={word} favorite={activeWordIds.includes(word.id)} onFavorite={() => toggleWord(word.id)} /></div>)}</div>{visible < filtered.length && <button onClick={() => setVisible((count) => count + 24)} className="mx-auto mt-8 flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold hover:bg-muted" data-testid="button-load-more">Load more words <ChevronDown size={16} /></button>}</>}
    </section>
  </div>;
}

function QuizSetup() {
  const [, setLocation] = useLocation();
  const [count, setCount] = useState(10);
  const [customCount, setCustomCount] = useState('');
  const [level, setLevel] = useState<Level | 'ALL' | 'FAVORITES'>('ALL');
  const [direction, setDirection] = useState<'meaning' | 'word'>('meaning');
  const [timerMode, setTimerMode] = useState<'question' | 'session'>('question');
  const [cardSecondsInput, setCardSecondsInput] = useState('15');
  const [sessionMinutesInput, setSessionMinutesInput] = useState('3');
  const [lists] = useState<WordList[]>(() => loadWordLists());
  const [savedListId, setSavedListId] = useState<string>(() => loadActiveListId(loadWordLists()));
  const savedList = lists.find((item) => item.id === savedListId);
  const cardSeconds = Math.min(Math.max(Math.round(Number(cardSecondsInput)) || 15, 3), 120);
  const sessionMinutes = Math.min(Math.max(Math.round(Number(sessionMinutesInput)) || 3, 1), 180);
  const totalSaved = lists.reduce((sum, item) => sum + item.wordIds.length, 0);
  const available = level === 'ALL' ? vocabulary.length : level === 'FAVORITES' ? (savedList?.wordIds.length ?? 0) : vocabulary.filter((word) => word.level === level).length;
  useEffect(() => { setCount((current) => Math.min(current, Math.max(available, 1))); }, [available]);
  return <div className="mx-auto max-w-[1100px] px-5 py-8 pb-28 md:px-10 md:py-14 md:pb-12">
    <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-start">
      <section className="rounded-[1.75rem] bg-[hsl(var(--secondary))] p-7 text-[hsl(var(--secondary-foreground))] md:p-10"><p className="mono-label mb-5 text-[hsl(var(--secondary-foreground)/.58)]">Quiz deck / warm-up</p><h1 className="font-serif text-5xl leading-[.98] tracking-[-.06em] md:text-6xl">Make some<br /><em className="text-[hsl(var(--accent))]">noise.</em></h1><p className="mt-6 max-w-sm text-sm leading-6 text-[hsl(var(--secondary-foreground)/.7)]">A short round is better than a perfect plan. Pick a drawer, set your pace, and see what sticks.</p><div className="mt-12 flex items-center gap-3 text-xs text-[hsl(var(--secondary-foreground)/.6)]"><Keyboard size={16} /> Press 1–4 to answer quickly</div></section>
      <section className="rounded-[1.75rem] border border-border bg-card p-6 md:p-8" data-testid="quiz-setup">
        <p className="mono-label mb-2 text-muted-foreground">Set the table</p><h2 className="font-serif text-3xl">Round settings</h2>
        <div className="mt-8 space-y-7">
           <div><label className="mb-3 block text-sm font-bold">How many cards?</label><div className="grid grid-cols-4 gap-2">{[5, 10, 20, 30].map((option) => <button key={option} onClick={() => { setCount(Math.min(option, available)); setCustomCount(''); }} className={cx(!customCount && count === option ? 'border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]' : 'border-border hover:bg-muted', 'rounded-xl border py-3 text-sm font-bold')} data-testid={`quiz-count-${option}`}>{option}</button>)}</div><div className="mt-3 flex items-center gap-3"><label htmlFor="quiz-custom-count" className="text-xs font-semibold text-muted-foreground">Custom</label><input id="quiz-custom-count" type="number" min="1" max={available} value={customCount} onChange={(event) => { const raw = event.target.value; setCustomCount(raw); const next = Number(raw); if (raw && Number.isFinite(next)) setCount(Math.min(Math.max(next, 1), available)); }} placeholder={`1–${available}`} className="h-10 w-28 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[hsl(var(--secondary)/.35)]" data-testid="input-quiz-custom-count" /><span className="text-xs text-muted-foreground">cards, up to {available.toLocaleString()}</span></div></div>
           <div><label className="mb-3 block text-sm font-bold">Open a drawer</label><div className="grid grid-cols-3 gap-2">{levels.slice(1).map((option) => <button key={option} onClick={() => setLevel(option)} className={cx('rounded-xl border py-3 text-sm font-bold', level === option ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.14)]' : 'border-border hover:bg-muted')} data-testid={`quiz-level-${option}`}>{option}</button>)}<button onClick={() => setLevel('ALL')} className={cx('rounded-xl border py-3 text-sm font-bold', level === 'ALL' ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.14)]' : 'border-border hover:bg-muted')} data-testid="quiz-level-all">Mixed</button><button onClick={() => totalSaved > 0 && setLevel('FAVORITES')} disabled={totalSaved === 0} className={cx('flex items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40', level === 'FAVORITES' ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.14)]' : 'border-border hover:bg-muted')} data-testid="quiz-level-favorites"><Heart size={14} fill={level === 'FAVORITES' ? 'currentColor' : 'none'} /> Saved</button></div>
             {level === 'FAVORITES' && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-muted p-2"><span className="mono-label px-1 text-muted-foreground">Which save slot?</span><div className="flex flex-1 flex-wrap gap-1.5">{lists.map((item) => <button key={item.id} onClick={() => setSavedListId(item.id)} className={cx('rounded-lg border px-2.5 py-1.5 text-xs font-bold', savedListId === item.id ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.16)]' : 'border-border bg-card text-muted-foreground hover:bg-muted')} data-testid={`quiz-saved-list-${item.id}`}>{item.name} <span className="opacity-60">({item.wordIds.length})</span></button>)}</div></div>}
             <p className="mt-2 text-xs text-muted-foreground">{available.toLocaleString()} cards available{level === 'FAVORITES' && available === 0 ? ' — save some words to this slot in the Cabinet first' : ''}</p></div>
           <div><label className="mb-3 block text-sm font-bold">Quiz type</label><div className="grid grid-cols-2 gap-2"><button onClick={() => setDirection('meaning')} className={cx('flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold', direction === 'meaning' ? 'border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]' : 'border-border hover:bg-muted')} data-testid="quiz-direction-meaning"><BookOpen size={15} /> Choose meaning</button><button onClick={() => setDirection('word')} className={cx('flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold', direction === 'word' ? 'border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]' : 'border-border hover:bg-muted')} data-testid="quiz-direction-word"><Keyboard size={15} /> Choose Japanese</button></div><p className="mt-2 text-xs text-muted-foreground">Japanese choices include kanji and furigana.</p></div>
           <div><label className="mb-3 block text-sm font-bold">Timer</label><div className="grid grid-cols-2 gap-2"><button onClick={() => setTimerMode('question')} className={cx('flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold', timerMode === 'question' ? 'border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]' : 'border-border hover:bg-muted')} data-testid="quiz-timer-question"><Clock3 size={15} /> Per question</button><button onClick={() => setTimerMode('session')} className={cx('flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold', timerMode === 'session' ? 'border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]' : 'border-border hover:bg-muted')} data-testid="quiz-timer-session"><Clock3 size={15} /> Whole session</button></div>
             {timerMode === 'question' ? <div className="mt-3 flex items-center gap-3"><label htmlFor="quiz-card-seconds" className="text-xs font-semibold text-muted-foreground">Seconds per card</label><input id="quiz-card-seconds" type="number" min="3" max="120" value={cardSecondsInput} onChange={(event) => setCardSecondsInput(event.target.value)} onBlur={() => setCardSecondsInput(String(cardSeconds))} className="h-10 w-24 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[hsl(var(--secondary)/.35)]" data-testid="input-quiz-card-seconds" /><span className="text-xs text-muted-foreground">seconds (3–120)</span></div> : <div className="mt-3 flex items-center gap-3"><label htmlFor="quiz-session-minutes" className="text-xs font-semibold text-muted-foreground">Minutes for the round</label><input id="quiz-session-minutes" type="number" min="1" max="180" value={sessionMinutesInput} onChange={(event) => setSessionMinutesInput(event.target.value)} onBlur={() => setSessionMinutesInput(String(sessionMinutes))} className="h-10 w-24 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[hsl(var(--secondary)/.35)]" data-testid="input-quiz-session-minutes" /><span className="text-xs text-muted-foreground">minutes (1–180)</span></div>}
             <p className="mt-2 text-xs text-muted-foreground">{timerMode === 'question' ? `Each card gives you ${cardSeconds} second${cardSeconds === 1 ? '' : 's'} to answer.` : `The whole round ends after ${sessionMinutes} minute${sessionMinutes === 1 ? '' : 's'}, however many cards you get to.`}</p></div>
        </div>
        <button onClick={() => setLocation(`/quiz?run=1&count=${count}&level=${level}&direction=${direction}&timerMode=${timerMode}&cardSeconds=${cardSeconds}&sessionSeconds=${sessionMinutes * 60}${level === 'FAVORITES' ? `&listId=${savedListId}` : ''}`)} disabled={available === 0} className="mt-9 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0" data-testid="button-start-quiz"><Play size={16} fill="currentColor" /> Start {count}-card round <ArrowRight size={16} /></button>
      </section>
    </div>
  </div>;
}

function QuizActive({ params }: { params: URLSearchParams }) {
  const [, setLocation] = useLocation();
  const count = Number(params.get('count')) || 10;
  const level = (params.get('level') || 'ALL') as Level | 'ALL' | 'FAVORITES';
  const direction = params.get('direction') === 'word' ? 'word' : 'meaning';
  const timerMode = params.get('timerMode') === 'session' ? 'session' : 'question';
  const cardSeconds = Number(params.get('cardSeconds')) || 15;
  const sessionSeconds = Number(params.get('sessionSeconds')) || 180;
  const listId = params.get('listId');
  const [savedWordIds] = useState<string[]>(() => {
    if (!listId) return [];
    return loadWordLists().find((item) => item.id === listId)?.wordIds ?? [];
  });
  const [cards] = useState(() => {
    const pool = level === 'ALL' ? vocabulary : level === 'FAVORITES' ? vocabulary.filter((word) => savedWordIds.includes(word.id)) : vocabulary.filter((word) => word.level === level);
    return shuffle(pool).slice(0, count);
  });
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<QuizResult['answers']>([]);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(cardSeconds);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(sessionSeconds);
  const finishedRef = useRef(false);

  const word = cards[index];
  const choices = useMemo(
    () => word ? shuffle([word, ...shuffle(vocabulary.filter((item) => item.id !== word.id)).slice(0, 3)]) : [],
    [word],
  );

  const finish = (finalResults: QuizResult['answers']) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const score = finalResults.filter((item) => item.correct).length;
    sessionStorage.setItem('kotoba-last-result', JSON.stringify({ score, total: cards.length, answers: finalResults, level, finishedAt: new Date().toISOString() } satisfies QuizResult));
    recordHistory({ date: toDateKey(new Date()), score, total: cards.length });
    setLocation('/results');
  };
  const answer = (choice: Word) => {
    if (!word || selected) return;
    const choiceLabel = direction === 'meaning' ? choice.meaning : choice.expression;
    const correct = choice.id === word.id;
    setSelected(choice.id); playFeedback(correct ? feedbackAudio.kills[Math.min(streak, 4)] : feedbackAudio.wrong);
    setStreak((current) => correct ? current + 1 : 0);
    setResults((current) => [...current, { word, choice: choiceLabel, correct }]);
  };
  const timeout = () => {
    if (!word || selected) return;
    setSelected('TIMEOUT'); playFeedback(feedbackAudio.wrong);
    setStreak(0);
    setResults((current) => [...current, { word, choice: '(no answer)', correct: false }]);
  };

  useEffect(() => {
    if (timerMode !== 'question') return;
    setTimeLeft(cardSeconds);
  }, [index, timerMode, cardSeconds]);

  useEffect(() => {
    if (timerMode !== 'question') return;
    if (selected) return;
    if (timeLeft <= 0) { timeout(); return; }
    const id = setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, selected, timerMode]);

  useEffect(() => {
    if (timerMode !== 'session') return;
    if (sessionTimeLeft <= 0) {
      const withCurrent = word ? (selected ? results : [...results, { word, choice: '(no answer)', correct: false }]) : results;
      finish(withCurrent);
      return;
    }
    const id = setTimeout(() => setSessionTimeLeft((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [sessionTimeLeft, timerMode]);

  const [canAdvance, setCanAdvance] = useState(false);
  useEffect(() => {
    setCanAdvance(false);
    if (!selected) return;
    const id = window.setTimeout(() => setCanAdvance(true), 350);
    return () => window.clearTimeout(id);
  }, [selected]);

  const advancingRef = useRef(false);
  useEffect(() => { advancingRef.current = false; }, [index]);
  const next = () => {
    if (advancingRef.current || !canAdvance) return;
    advancingRef.current = true;
    if (index + 1 >= cards.length) {
      finish(results);
    } else { setIndex((value) => value + 1); setSelected(null); }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = Number(event.key);
      if (key >= 1 && key <= choices.length) answer(choices[key - 1]);
      if (event.key === 'Enter' && selected) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choices, selected]);

  if (!word) return <div className="p-10">No cards available.</div>;

  const progress = ((index + (selected ? 1 : 0)) / cards.length) * 100;
  return <div className="mx-auto max-w-[900px] px-5 py-8 pb-28 md:px-10 md:py-14 md:pb-12">
     <div className="mb-8 flex items-center justify-between"><div><p className="mono-label text-muted-foreground">Live round / {level === 'ALL' ? 'mixed deck' : level === 'FAVORITES' ? 'saved words' : level}</p><p className="mt-2 text-sm font-bold">Card {String(index + 1).padStart(2, '0')} <span className="font-normal text-muted-foreground">of {cards.length}</span></p></div><div className="flex items-center gap-2">{timerMode === 'question' ? <span className={cx('mono-label flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold', selected ? 'border-border text-muted-foreground' : timeLeft <= 5 ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.14)] text-[hsl(var(--accent))]' : 'border-border text-muted-foreground')} data-testid="quiz-timer"><Clock3 size={14} /> {timeLeft}s</span> : <span className={cx('mono-label flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold', sessionTimeLeft <= 30 ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.14)] text-[hsl(var(--accent))]' : 'border-border text-muted-foreground')} data-testid="quiz-timer"><Clock3 size={14} /> {String(Math.floor(sessionTimeLeft / 60)).padStart(2, '0')}:{String(sessionTimeLeft % 60).padStart(2, '0')}</span>}<Link href="/quiz" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted" data-testid="button-quit-quiz"><X size={15} /> Exit</Link></div></div>
    <div className="mb-10 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[hsl(var(--accent))] transition-[width] duration-500" style={{ width: `${Math.max(progress, 5)}%` }} /></div>
    <section className="animate-pop rounded-[1.75rem] border border-border bg-card p-6 md:p-12" data-testid="quiz-card">
       <div className="flex items-center justify-between"><LevelPill level={word.level} /><span className="mono-label flex items-center gap-2 text-muted-foreground"><Volume2 size={14} /> {direction === 'meaning' ? 'choose the meaning' : 'choose the Japanese word'}</span></div>
       <div className="py-14 text-center">{direction === 'meaning' ? <><p className="kanji-display text-7xl md:text-8xl">{word.expression}</p><p className="mt-4 text-lg text-[hsl(var(--secondary))]">{word.reading}</p></> : <><p className="mx-auto max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">{word.meaning}</p><p className="mono-label mt-5 text-muted-foreground">Which Japanese word matches?</p></>}</div>
       <div className="grid gap-3 md:grid-cols-2">{choices.map((choice, choiceIndex) => { const right = choice.id === word.id; return <button key={choice.id} onClick={() => answer(choice)} disabled={!!selected} className={cx('group flex min-h-14 items-center gap-4 rounded-xl border p-3 text-left text-sm font-medium transition-all', !selected && 'hover:-translate-y-0.5 hover:border-[hsl(var(--secondary))]', selected && 'cursor-default', selected && right && 'border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.13)]', selected && choice.id === selected && !right && 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.14)]')} data-testid={`quiz-answer-${choiceIndex + 1}`}><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted font-mono text-xs text-muted-foreground group-hover:bg-[hsl(var(--secondary)/.15)]">{choiceIndex + 1}</span><span className="flex flex-1 flex-col">{direction === 'meaning' ? choice.meaning : <><span className="kanji-display text-xl leading-tight">{choice.expression}</span><span className="mt-1 text-xs text-[hsl(var(--secondary))]">{choice.reading}</span></>}</span>{selected && right && <Check size={17} className="text-[hsl(var(--secondary))]" />}{selected && choice.id === selected && !right && <X size={17} className="text-[hsl(var(--accent))]" />}</button>; })}</div>
       {selected && <div className="mt-6 flex items-center justify-between rounded-xl bg-muted px-4 py-3"><p className="text-sm font-semibold">{selected === word.id ? 'Nice. That one is staying put.' : selected === 'TIMEOUT' ? <>Time's up! The answer was <strong>{direction === 'meaning' ? word.meaning : word.expression}</strong>{direction === 'word' && <span className="ml-1 font-normal text-muted-foreground">({word.reading})</span>}.</> : <>The answer was <strong>{direction === 'meaning' ? word.meaning : word.expression}</strong>{direction === 'word' && <span className="ml-1 font-normal text-muted-foreground">({word.reading})</span>}.</>}</p><button onClick={next} disabled={!canAdvance} className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-next-card">{index + 1 === cards.length ? 'See results' : 'Next card'} <ArrowRight size={14} /></button></div>}
    </section>
  </div>;
}

function Quiz() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  return params.get('run') ? <QuizActive params={params} /> : <QuizSetup />;
}

function Results() {
  const [, setLocation] = useLocation();
  const [result] = useState<QuizResult | null>(() => { try { return JSON.parse(sessionStorage.getItem('kotoba-last-result') || 'null'); } catch { return null; } });
  useEffect(() => { if (result) playFeedback(result.score / result.total >= .8 ? feedbackAudio.high : feedbackAudio.low); }, [result]);
  if (!result) return <div className="mx-auto max-w-[720px] px-5 py-20 pb-28 text-center md:pb-12"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[hsl(var(--accent)/.17)] text-[hsl(var(--accent))]"><Trophy /></div><h1 className="mt-6 font-serif text-4xl">No round on the desk yet.</h1><p className="mt-3 text-sm text-muted-foreground">Take a quiz and your little report will land here.</p><Link href="/quiz" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Choose a deck <ArrowRight size={16} /></Link></div>;
  const percent = Math.round((result.score / result.total) * 100);
  const passed = percent >= 80;
  const missed = result.answers.filter((answer) => !answer.correct);
  return <div className="mx-auto max-w-[1100px] px-5 py-8 pb-28 md:px-10 md:py-14 md:pb-12">
    <div className="grid gap-6 lg:grid-cols-[.82fr_1.18fr]">
      <section className={cx('relative overflow-hidden rounded-[1.75rem] p-7 md:p-10', passed ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]' : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]')}><div className="absolute -right-10 -top-10 size-44 rounded-full border-[22px] border-[hsl(var(--accent)/.75)]" /><p className="mono-label relative mb-6 opacity-60">Round complete / report</p><div className="relative"><div className="flex items-end gap-3"><span className="font-serif text-8xl leading-none tracking-[-.08em]">{percent}</span><span className="mb-2 font-mono text-2xl">%</span></div><h1 className="mt-7 font-serif text-4xl tracking-[-.04em]">{passed ? 'The words are landing.' : 'Keep the drawer open.'}</h1><p className="mt-3 max-w-sm text-sm leading-6 opacity-70">{passed ? 'That was a strong little session. Your next recall will have more to hold onto.' : 'A missed word is not a lost word. It is simply asking for another visit.'}</p></div><div className="relative mt-10 flex gap-2"><button onClick={() => setLocation('/quiz')} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-4 py-3 text-sm font-bold text-[hsl(var(--foreground))]" data-testid="button-retry-quiz"><RotateCcw size={15} /> Try again</button><button onClick={() => setLocation('/')} className="rounded-xl border border-current/20 px-4 py-3 text-sm font-bold opacity-80 hover:opacity-100" data-testid="button-back-cabinet">Cabinet</button></div></section>
      <section className="rounded-[1.75rem] border border-border bg-card p-6 md:p-9"><div className="flex items-start justify-between"><div><p className="mono-label text-muted-foreground">Your scorecard</p><h2 className="mt-2 font-serif text-3xl">A tidy debrief.</h2></div><div className="grid size-12 place-items-center rounded-xl bg-[hsl(var(--accent)/.15)] text-[hsl(var(--accent))]"><Trophy size={22} /></div></div><div className="mt-8 grid grid-cols-3 gap-3"><div className="rounded-xl bg-muted p-3"><p className="mono-label text-muted-foreground">Correct</p><p className="mt-2 font-serif text-2xl">{result.score}</p></div><div className="rounded-xl bg-muted p-3"><p className="mono-label text-muted-foreground">Missed</p><p className="mt-2 font-serif text-2xl">{result.total - result.score}</p></div><div className="rounded-xl bg-muted p-3"><p className="mono-label text-muted-foreground">Deck</p><p className="mt-2 font-serif text-2xl">{result.level === 'ALL' ? 'Mix' : result.level}</p></div></div><div className="mt-8"><div className="mb-3 flex justify-between text-xs font-bold"><span>Recall strength</span><span className="text-[hsl(var(--secondary))]">{result.score} of {result.total}</span></div><div className="flex h-3 gap-1 overflow-hidden rounded-full bg-muted">{result.answers.map((answer, index) => <span key={`${answer.word.id}-${index}`} className={cx('flex-1 rounded-sm', answer.correct ? 'bg-[hsl(var(--secondary))]' : 'bg-[hsl(var(--accent))]')} />)}</div></div></section>
    </div>
    <section className="mt-12"><SectionTitle eyebrow="Review drawer" title={missed.length ? 'Words to revisit' : 'Nothing slipped through'} action={missed.length ? <span className="text-xs text-muted-foreground">{missed.length} card{missed.length === 1 ? '' : 's'} marked</span> : undefined} />{missed.length ? <div className="divide-y divide-border rounded-2xl border border-border bg-card">{missed.map(({ word }) => <div key={word.id} className="flex items-center gap-4 p-4 md:p-5"><div className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted"><span className="kanji-display text-2xl">{word.expression}</span></div><div className="min-w-0 flex-1"><p className="font-semibold">{word.reading}</p><p className="truncate text-sm text-muted-foreground">{word.meaning}</p></div><LevelPill level={word.level} /></div>)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center"><Sparkles className="mx-auto text-[hsl(var(--accent))]" size={24} /><p className="mt-3 font-serif text-2xl">Clean sweep.</p><p className="mt-2 text-sm text-muted-foreground">Your cabinet is very proud of you.</p></div>}</section>
  </div>;
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Shell><Switch><Route path="/" component={Cabinet} /><Route path="/quiz" component={Quiz} /><Route path="/results" component={Results} /><Route component={NotFound} /></Switch></Shell></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
