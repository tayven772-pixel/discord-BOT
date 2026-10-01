import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { shadcn } from '@clerk/themes';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Code2,
  Compass,
  Lightbulb,
  Moon,
  Pause,
  Play,
  Search,
  Sparkles,
  Sun,
} from 'lucide-react';
import { languageFor, languages, lessonFor, lessons, type LearnerSkillLevel, type Lesson, type Progress } from './data/academy';
import { getProgressionStats, learnerSkillLevels } from './data/progression';

const PROGRESS_KEY = 'meta-progress-v1';
const LEGACY_PROGRESS_KEY = 'code-atlas-progress-v1';
const PROGRESS_EVENT = 'meta-progress-sync';
const LANGUAGE_KEY = 'meta-language-v1';
const THEME_KEY = 'meta-theme-v1';
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  'pk_test_c21hc2hpbmctc2hlZXBkb2ctMTE5LmNsZXJrLmFjY291bnRzLmRldiQ';
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

type PlayTrack = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  outcome: string;
  skills: string[];
  projects: string[];
};

const playTracks: PlayTrack[] = [
  {
    id: 'games',
    title: 'Game Development',
    shortTitle: 'Games',
    description: 'Learn loops, input, state, collisions, scoring, and game logic by building small playable projects.',
    outcome: 'Build a playable browser game from a blank project.',
    skills: ['Game loops', 'Input', 'State', 'Collision logic'],
    projects: ['Clicker challenge', 'Dodge game', 'Top-down arena'],
  },
  {
    id: 'websites',
    title: 'Website Development',
    shortTitle: 'Websites',
    description: 'Build responsive pages while learning HTML, CSS, JavaScript, layout, components, and accessibility.',
    outcome: 'Publish a responsive multi-section website.',
    skills: ['HTML', 'CSS', 'Responsive design', 'JavaScript'],
    projects: ['Profile page', 'Landing page', 'Interactive dashboard'],
  },
  {
    id: 'apps',
    title: 'App Development',
    shortTitle: 'Apps',
    description: 'Turn ideas into useful apps with interfaces, navigation, saved data, validation, and mobile-first design.',
    outcome: 'Build an installable app-style project with persistent data.',
    skills: ['UI state', 'Navigation', 'Forms', 'Persistence'],
    projects: ['To-do app', 'Study tracker', 'Habit dashboard'],
  },
  {
    id: 'roblox',
    title: 'Roblox Studio',
    shortTitle: 'Roblox',
    description: 'Learn Luau through Roblox-style gameplay systems, interactions, UI, events, and reusable modules.',
    outcome: 'Build a small Roblox gameplay system you understand line by line.',
    skills: ['Luau', 'Events', 'Parts', 'ModuleScripts'],
    projects: ['Coin pickup', 'Checkpoint system', 'Round manager'],
  },
  {
    id: 'mcbe',
    title: 'Minecraft Bedrock Add-ons',
    shortTitle: 'MCBE',
    description: 'Learn Bedrock behavior/resource pack structure, JSON, Script API basics, custom items, entities, and gameplay systems.',
    outcome: 'Build a working .mcaddon-ready project structure.',
    skills: ['Manifests', 'JSON', 'Script API', 'Behavior packs'],
    projects: ['Custom item', 'Queue command', 'Practice utility'],
  },
  {
    id: 'mcje',
    title: 'Minecraft Java Edition',
    shortTitle: 'MCJE',
    description: 'Learn Java Edition commands, datapacks, resource packs, and the concepts behind server-side gameplay systems.',
    outcome: 'Build a reusable Java Edition datapack project.',
    skills: ['Datapacks', 'Functions', 'Predicates', 'Resource packs'],
    projects: ['Custom advancement', 'Arena functions', 'Utility datapack'],
  },
  {
    id: 'mcje-mods',
    title: 'Minecraft Java Mods',
    shortTitle: 'MCJE Mods',
    description: 'Learn Java mod structure, registries, events, items, blocks, and gameplay features with a guided modding path.',
    outcome: 'Build a small Java mod with a custom gameplay feature.',
    skills: ['Java', 'Registries', 'Events', 'Items & blocks'],
    projects: ['Custom item', 'Custom block', 'Simple combat mechanic'],
  },
];

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in the environment');
}

type ThemeMode = 'light' | 'dark';
type ThemeContextValue = { theme: ThemeMode; toggleTheme: () => void };

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => undefined,
});

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Keep the selected theme for this session when storage is unavailable.
    }
  }, [theme]);

  const value = useMemo(
    () => ({ theme, toggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark') }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useTheme() {
  return useContext(ThemeContext);
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Use ${nextTheme} theme`}
      aria-pressed={theme === 'dark'}
      title={`Use ${nextTheme} theme`}
      data-testid="button-theme-toggle"
    >
      {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      <span className="theme-toggle-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}

function readProgress(storageKey: string): Progress {
  try {
    const legacyProgress = storageKey === `${PROGRESS_KEY}:guest`
      ? localStorage.getItem(LEGACY_PROGRESS_KEY)
      : null;
    const stored = localStorage.getItem(storageKey) ?? legacyProgress;
    const parsed = stored ? JSON.parse(stored) as Progress : null;
    if (parsed && Array.isArray(parsed.completedLessonIds)) {
      if (legacyProgress && !localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, JSON.stringify(parsed));
      }
      return parsed;
    }
    return { completedLessonIds: [] };
  } catch {
    return { completedLessonIds: [] };
  }
}

function useProgress() {
  const { isLoaded, userId } = useAuth();
  const storageKey = `${PROGRESS_KEY}:${userId ?? 'guest'}`;
  const [snapshot, setSnapshot] = useState(() => ({
    storageKey,
    progress: readProgress(storageKey),
  }));
  const progress = snapshot.storageKey === storageKey
    ? snapshot.progress
    : readProgress(storageKey);

  useEffect(() => {
    if (snapshot.storageKey !== storageKey) {
      setSnapshot({ storageKey, progress: readProgress(storageKey) });
    }
  }, [snapshot.storageKey, storageKey]);

  useEffect(() => {
    if (!isLoaded || snapshot.storageKey !== storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(snapshot.progress));
    window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: { storageKey } }));
  }, [isLoaded, snapshot, storageKey]);

  useEffect(() => {
    const syncProgress = (event: Event) => {
      if (event.type === 'storage' && (event as StorageEvent).key !== storageKey) return;
      const eventKey = (event as CustomEvent<{ storageKey?: string }>).detail?.storageKey;
      if (event.type === PROGRESS_EVENT && eventKey !== storageKey) return;
      const next = readProgress(storageKey);
      setSnapshot((current) => (
        current.storageKey === storageKey &&
        current.progress.completedLessonIds.join('|') === next.completedLessonIds.join('|') &&
        current.progress.skillLevel === next.skillLevel
          ? current
          : { storageKey, progress: next }
      ));
    };
    window.addEventListener(PROGRESS_EVENT, syncProgress);
    window.addEventListener('storage', syncProgress);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, syncProgress);
      window.removeEventListener('storage', syncProgress);
    };
  }, [storageKey]);

  const complete = (lessonId: string) => setSnapshot((current) => {
    const currentProgress = current.storageKey === storageKey
      ? current.progress
      : readProgress(storageKey);
    return currentProgress.completedLessonIds.includes(lessonId)
      ? current
      : {
          storageKey,
          progress: {
            ...currentProgress,
            completedLessonIds: [...currentProgress.completedLessonIds, lessonId],
          },
        };
  });

  const setSkillLevel = (skillLevel: LearnerSkillLevel) => setSnapshot((current) => {
    const currentProgress = current.storageKey === storageKey
      ? current.progress
      : readProgress(storageKey);
    return currentProgress.skillLevel === skillLevel
      ? current
      : { storageKey, progress: { ...currentProgress, skillLevel } };
  });

  return { progress, complete, setSkillLevel };
}

function Header({ progressCount }: { progressCount: number }) {
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();

  return (
    <header className="topbar">
      <Link href="/" className="brand" data-testid="link-academy-home">
        <span className="brand-mark"><Code2 aria-hidden="true" /></span>
        <span>meta</span>
      </Link>
      <nav className="top-links" aria-label="Main navigation">
        <Link href="/" data-testid="link-explore">Explore</Link>
        <Link href="/play" data-testid="link-lesson-play">Lesson Play</Link>
        <a href="/#learning-path" data-testid="link-learning-path">Learning path</a>
        <span className="top-progress" data-testid="status-lessons-completed">
          <span className="progress-dot" />
          {progressCount} / {lessons.length} lessons
        </span>
        {isLoaded && user ? (
          <div className="account-actions" data-testid="section-account">
            <span className="account-name" title={user.primaryEmailAddress?.emailAddress ?? undefined}>
              {user.firstName || user.username || 'Learner'}
            </span>
            <Link href="/account" className="account-signin" data-testid="link-account-settings">Account</Link>
            <button
              type="button"
              className="account-signout"
              onClick={() => void signOut({ redirectUrl: basePath || '/' })}
              data-testid="button-sign-out"
            >
              Sign out
            </button>
          </div>
        ) : isLoaded ? (
          <div className="account-actions">
            <Link href="/sign-in" className="account-signin" data-testid="link-sign-in">Sign in</Link>
            <Link href="/sign-up" className="account-join" data-testid="link-sign-up">Create account</Link>
          </div>
        ) : null}
        <ThemeToggle />
      </nav>
    </header>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const { progress } = useProgress();
  return (
    <div className="app-shell">
      <Header progressCount={progress.completedLessonIds.length} />
      {children}
    </div>
  );
}

function HomePage() {
  const { progress, setSkillLevel } = useProgress();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All paths');
  const [level, setLevel] = useState('All levels');
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return languages.filter((language) => {
      const matchesSearch = !query || `${language.name} ${language.category} ${language.description}`.toLowerCase().includes(query);
      const matchesCategory = category === 'All paths' || language.category === category;
      const matchesLevel = level === 'All levels' || language.level === level;
      return matchesSearch && matchesCategory && matchesLevel;
    });
  }, [search, category, level]);
  const completedCount = progress.completedLessonIds.length;
  const completion = Math.min(100, (completedCount / lessons.length) * 100);

  return (
    <AppShell>
      <main className="home-main">
        <section className="hero" aria-labelledby="home-heading">
          <div className="hero-copy-block">
            <div className="eyebrow"><span className="eyebrow-line" /> A hands-on academy for curious minds</div>
            <h1 id="home-heading">Learn the idea.<br /><em>Then the code.</em></h1>
            <p className="hero-copy">Programming makes more sense when you can see the same idea in different languages. Start with the shared foundations, then follow the syntax wherever your curiosity goes.</p>
            <div className="hero-actions">
              <a href="#learning-path" className="button-primary" data-testid="button-start-learning">Start with lesson one <ArrowRight aria-hidden="true" /></a>
              <a href="#language-library" className="text-link" data-testid="link-browse-languages">Browse languages <ArrowRight aria-hidden="true" /></a>
            </div>
          </div>
          <div className="hero-visual" aria-label="A sample code card showing a greeting in Python">
            <span className="hero-note">FIG. 01 / THE FIRST OUTPUT</span>
            <div className="atlas-card">
              <div className="code-window-head">
                <span className="window-dots"><i /><i /><i /></span>
                <span>hello_world.py</span>
                <span>PY</span>
              </div>
              <div className="code-row"><span className="line-no">01</span><span><span className="code-comment"># A tiny program, a big first step</span></span></div>
              <div className="code-row"><span className="line-no">02</span><span><span className="code-key">print</span>(<span className="code-string">"Hello, world!"</span>)</span></div>
              <div className="code-row"><span className="line-no">03</span><span>&nbsp;</span></div>
              <div className="code-row"><span className="line-no">04</span><span><span className="code-comment"># One idea. Many ways to write it.</span></span></div>
            </div>
            <div className="visual-stamp"><span><b>12</b><br />ways to begin</span></div>
          </div>
        </section>

        <section className="section" id="language-library" aria-labelledby="library-heading">
          <div className="section-heading">
            <div>
              <p className="section-kicker">The language library / 01—12</p>
              <h2 id="library-heading">Pick a path to explore.</h2>
              <p className="section-sub">One shared foundation, expressed in the language you want to learn.</p>
            </div>
            <div className="catalog-tools">
              <label className="search-wrap">
                <Search aria-hidden="true" />
                <input
                  className="search-input"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find a language..."
                  aria-label="Search languages"
                  data-testid="input-search-languages"
                />
              </label>
              <select aria-label="Filter by category" className="filter-select" value={category} onChange={(event) => setCategory(event.target.value)} data-testid="select-language-category">
                <option>All paths</option><option>Web</option><option>General</option><option>Systems</option><option>Data</option>
              </select>
              <select aria-label="Filter by level" className="filter-select" value={level} onChange={(event) => setLevel(event.target.value)} data-testid="select-language-level">
                <option>All levels</option><option>Beginner friendly</option><option>Beginner</option><option>Foundational</option>
              </select>
            </div>
          </div>
          <div className="language-grid" data-testid="list-language-catalog" aria-live="polite">
            {filtered.map((language, index) => (
              <Link
                href="/learn/output"
                key={language.id}
                className="language-card"
                style={{ animationDelay: `${Math.min(index, 8) * 35}ms`, '--tile-color': tileHue(language.id) } as CSSProperties}
                onClick={() => localStorage.setItem(LANGUAGE_KEY, language.id)}
                data-testid={`card-language-${language.id}`}
                aria-label={`Start learning in ${language.name}`}
              >
                <span className="language-card-top">
                  <span className="language-name">{language.name}</span>
                  <span className="language-initial">{language.name.slice(0, 2).toUpperCase()}</span>
                </span>
                <span className="language-description">{language.description}</span>
                <span className="language-meta">
                  <span className="level-label">{language.level}</span>
                  <code className="mini-code">{language.sampleCode}</code>
                </span>
              </Link>
            ))}
            {filtered.length === 0 && (
              <div className="empty-results" data-testid="empty-language-results">
                <strong>No paths found just yet.</strong>
                Try another search, or reset the filters to see the full library.
              </div>
            )}
          </div>
          <div className="library-note" data-testid="text-growing-library">
            <Compass aria-hidden="true" />
            <span><strong>These are twelve good places to begin, not the whole map.</strong> Meta teaches the foundations shared across programming and keeps adding new language paths as the library grows.</span>
          </div>
        </section>


        <LessonPlaySection />

        <section className="pathway" id="learning-path" aria-labelledby="path-heading">
          <div className="pathway-intro">
            <p className="section-kicker">Your first six steps</p>
            <h2 id="path-heading">A little progress<br />adds up.</h2>
            <p>Short, guided lessons make the big ideas feel small enough to try. No setup, no pressure — just one useful concept at a time.</p>
            <div className="path-progress" data-testid="status-path-progress">
              <span>{completedCount} of {lessons.length} complete</span>
              <span className="progress-track" aria-hidden="true"><span className="progress-fill" style={{ width: `${completion}%` }} /></span>
            </div>
          </div>
          <div className="lesson-list">
            {lessons.map((lesson, index) => {
              const done = progress.completedLessonIds.includes(lesson.id);
              return (
                <Link href={`/learn/${lesson.id}`} className={`lesson-link${done ? ' done' : ''}`} key={lesson.id} data-testid={`link-lesson-${lesson.id}`}>
                  <span className="lesson-index">{done ? <Check aria-label="Complete" /> : String(index + 1).padStart(2, '0')}</span>
                  <span className="lesson-link-text"><strong>{lesson.title}</strong><small>{lesson.concept} · {lesson.duration}</small></span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </section>
        <ProgressionSection progress={progress} onSkillLevelChange={setSkillLevel} />
        <footer className="footer">
          <span>META — LEARN THE IDEA, THEN THE CODE.</span>
          <span className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/delete-account">Delete account</Link><a href="mailto:metasupport43@gmail.com">Support</a></span>
        </footer>
      </main>
    </AppShell>
  );
}


function LessonPlaySection() {
  return (
    <section className="play-section" id="lesson-play" aria-labelledby="lesson-play-heading">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Lesson Play / build to learn</p>
          <h2 id="lesson-play-heading">Choose what you want to make.</h2>
          <p className="section-sub">Each track teaches the coding idea, then turns it into a real project instead of stopping at a quiz.</p>
        </div>
        <Link href="/play" className="text-link" data-testid="link-open-lesson-play">
          Open Lesson Play <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <div className="play-grid">
        {playTracks.map((track) => (
          <Link href={`/play/${track.id}`} className="play-card" key={track.id} data-testid={`card-play-${track.id}`}>
            <span className="play-card-icon" aria-hidden="true">{track.shortTitle.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{track.title}</strong>
              <p>{track.description}</p>
            </div>
            <ArrowRight aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function PlayPage() {
  const params = useParams<{ track?: string }>();
  const selected = playTracks.find((track) => track.id === params.track);

  return (
    <AppShell>
      <main className="lesson-main play-page">
        <div className="lesson-head">
          <Link href="/user-portal" className="back-link"><ArrowLeft aria-hidden="true" /> Back to Meta</Link>
          <div className="lesson-heading-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> Lesson Play</div>
              <h1>{selected ? selected.title : 'Build something real.'}</h1>
              <p className="lesson-sub">
                {selected
                  ? selected.description
                  : 'Pick a project track. Meta teaches the concept first, then gives you a guided build mission.'}
              </p>
            </div>
            <div className="lesson-meta"><Play aria-hidden="true" /> Project-based learning</div>
          </div>
        </div>

        {!selected ? (
          <section className="play-hub-grid" aria-label="Lesson Play tracks">
            {playTracks.map((track) => (
              <Link href={`/play/${track.id}`} className="play-hub-card" key={track.id}>
                <span className="play-hub-kicker">{track.shortTitle}</span>
                <h2>{track.title}</h2>
                <p>{track.description}</p>
                <span className="play-outcome">{track.outcome}</span>
                <span className="play-open">Start track <ArrowRight aria-hidden="true" /></span>
              </Link>
            ))}
          </section>
        ) : (
          <section className="play-track-layout">
            <article className="play-track-main">
              <p className="section-kicker">Your mission</p>
              <h2>{selected.outcome}</h2>
              <p className="concept-intro">
                You will move through short explain → try → build steps. Every project is broken into small checkpoints so you learn why the code works instead of only copying it.
              </p>
              <div className="mission-steps">
                {selected.projects.map((project, index) => (
                  <div className="mission-step" key={project}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{project}</strong>
                      <p>{index === 0 ? 'Starter mission — learn the core idea.' : index === 1 ? 'Practice mission — change and extend the idea.' : 'Build mission — combine the skills into your own version.'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/learn/output" className="button-primary">Start with the coding foundation <ArrowRight aria-hidden="true" /></Link>
            </article>
            <aside className="play-track-sidebar">
              <p className="sidebar-title"><span>Skills in this track</span></p>
              {selected.skills.map((skill) => <span className="skill-chip" key={skill}>{skill}</span>)}
              <div className="play-note">
                <strong>Build-first rule</strong>
                <span>Hints explain the next move, but Meta does not hand you the full final project before you try it.</span>
              </div>
            </aside>
          </section>
        )}
      </main>
    </AppShell>
  );
}

function AccountSettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const deleteAccount = async () => {
    if (!user || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await user.delete();
      await signOut({ redirectUrl: basePath || '/' });
    } catch {
      setDeleteError('We could not delete your account right now. Please try again or use the account deletion page for support.');
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <main className="account-page">
        <section className="account-card">
          <p className="section-kicker">Account & privacy</p>
          <h1>Manage your Meta account</h1>
          <p className="account-email">{user?.primaryEmailAddress?.emailAddress ?? 'Signed-in learner'}</p>

          <div className="account-setting-block">
            <h2>Your data</h2>
            <p>Meta stores the account information needed for sign-in and your learning progress so you can continue lessons across sessions.</p>
            <div className="account-setting-links">
              <Link href="/privacy" className="button-secondary">Read privacy policy</Link>
              <Link href="/delete-account" className="button-secondary">Account deletion help</Link>
            </div>
          </div>

          <div className="danger-zone">
            <h2>Delete account</h2>
            <p>Deleting your account permanently removes the account from Meta's authentication system. This cannot be undone.</p>
            {!confirmingDelete ? (
              <button type="button" className="danger-button" onClick={() => setConfirmingDelete(true)}>
                Delete my account
              </button>
            ) : (
              <div className="delete-confirm">
                <strong>Delete this account permanently?</strong>
                <span>You will lose access to this account and its saved learning identity.</span>
                <div>
                  <button type="button" className="danger-button" disabled={deleting} onClick={() => void deleteAccount()}>
                    {deleting ? 'Deleting…' : 'Yes, delete permanently'}
                  </button>
                  <button type="button" className="button-secondary" disabled={deleting} onClick={() => setConfirmingDelete(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {deleteError && <p className="delete-error" role="alert">{deleteError}</p>}
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function DeleteAccountPage() {
  return (
    <main className="policy-page">
      <Link href="/" className="brand policy-brand">
        <span className="brand-mark"><Code2 aria-hidden="true" /></span>
        <span>meta</span>
      </Link>
      <article className="policy-card">
        <p className="section-kicker">Account deletion</p>
        <h1>Delete your Meta account</h1>
        <p>Meta users can start account deletion from inside the app under <strong>Account → Delete account</strong>.</p>
        <h2>If you cannot access the app</h2>
        <p>You can request deletion by emailing <a className="policy-link" href="mailto:metasupport43@gmail.com?subject=Meta%20account%20deletion%20request">metasupport43@gmail.com</a> with the subject “Meta account deletion request”. Include the email address used for your Meta account so the request can be matched to the correct account.</p>
        <h2>What gets deleted</h2>
        <p>The request covers the Meta account and associated learning/account data controlled by Meta. If any information must be kept for a legitimate security, fraud-prevention, or legal reason, that retention should be disclosed in the privacy policy.</p>
        <h2>Need help?</h2>
        <p><a className="policy-link" href="mailto:metasupport43@gmail.com?subject=Meta%20support">Contact Meta Support</a> for account or privacy questions.</p>
      </article>
    </main>
  );
}

function PrivacyPage() {
  return (
    <main className="policy-page">
      <Link href="/" className="brand policy-brand">
        <span className="brand-mark"><Code2 aria-hidden="true" /></span>
        <span>meta</span>
      </Link>
      <article className="policy-card">
        <p className="section-kicker">Privacy</p>
        <h1>Meta privacy overview</h1>
        <p>Meta is a coding-learning app. Account information is handled through the configured authentication provider, and lesson progress may be stored so learners can continue where they left off.</p>
        <h2>What the app may store</h2>
        <p>Account identifiers, profile details supplied during sign-in, selected learning settings, and lesson progress. The app should only request data needed for learning and account functionality.</p>
        <h2>Device permissions</h2>
        <p>The core learning experience does not require contacts, call logs, SMS, precise location, microphone, camera, or background location.</p>
        <h2>Children and families</h2>
        <p>Store listing age targeting and any child-directed features must be configured accurately in Google Play Console. Features and data practices should match the audience selected there.</p>
        <h2>Account deletion and data requests</h2>
        <p>Signed-in users can delete their account from the Account page. Users who cannot access the app can use the public <Link className="policy-link" href="/delete-account">account deletion page</Link> or contact <a className="policy-link" href="mailto:metasupport43@gmail.com">metasupport43@gmail.com</a>. Account deletion is intended to remove the account and associated Meta-controlled learning/account data, subject only to any retention that is legally or security-required.</p>
        <h2>Support contact</h2>
        <p>Privacy, account, and app-support questions can be sent to <a className="policy-link" href="mailto:metasupport43@gmail.com">metasupport43@gmail.com</a>.</p>
      </article>
    </main>
  );
}

function ProgressionSection({
  progress,
  onSkillLevelChange,
}: {
  progress: Progress;
  onSkillLevelChange: (skillLevel: LearnerSkillLevel) => void;
}) {
  const stats = getProgressionStats(progress);
  const skillLevel = progress.skillLevel ?? 'beginner';
  const skillAdvice: Record<LearnerSkillLevel, string> = {
    beginner: 'Recommended pace: follow the lessons in order and use hints whenever you need them.',
    intermediate: 'Recommended pace: try each exercise before opening its hint.',
    pro: 'Recommended pace: use the trail as a quick fundamentals refresher.',
  };

  return (
    <section className="progression-section" aria-labelledby="progression-heading" data-testid="section-progression">
      <div className="progression-summary">
        <p className="section-kicker">Your progression / 01—10</p>
        <div className="progression-level-heading">
          <span className="level-badge" data-testid="text-current-rank">LEVEL {String(stats.level).padStart(2, '0')}</span>
          <div>
            <h2 id="progression-heading">{stats.levelName}</h2>
            <p>{stats.xp} XP earned</p>
          </div>
        </div>
        <div className="level-progress-meta">
          <span>{stats.level === 10 ? 'Top level reached' : `${stats.xpToNextLevel} XP to level ${stats.level + 1}`}</span>
          <span>{stats.levelProgress} / 100 XP</span>
        </div>
        <div
          className="level-progress-track"
          role="progressbar"
          aria-label={stats.level === 10 ? 'Top level reached' : `Progress to level ${stats.level + 1}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={stats.levelProgress}
          data-testid="status-level-progress"
        >
          <span className="level-progress-fill" style={{ width: `${stats.levelProgress}%` }} />
        </div>

        <fieldset className="skill-level-fieldset">
          <legend>Your coding experience</legend>
          <div className="skill-level-options">
            {learnerSkillLevels.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`skill-level-option${skillLevel === option.id ? ' selected' : ''}`}
                onClick={() => onSkillLevelChange(option.id)}
                aria-pressed={skillLevel === option.id}
                data-testid={`button-skill-level-${option.id}`}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
          <p className="skill-level-advice" data-testid="text-skill-level-advice">{skillAdvice[skillLevel]}</p>
        </fieldset>
      </div>

      <div className="rewards-panel">
        <div className="rewards-heading">
          <div>
            <p className="section-kicker">Milestone challenges</p>
            <h3>Earn digital rewards</h3>
          </div>
          <span className="reward-count" data-testid="text-rewards-earned">{stats.earnedRewardCount} / {stats.rewards.length}</span>
        </div>
        <div className="reward-list">
          {stats.rewards.map((reward) => (
            <article
              className={`reward-card${reward.earned ? ' earned' : ''}`}
              key={reward.id}
              data-testid={`card-reward-${reward.id}`}
              aria-label={`${reward.title}: ${reward.earned ? 'earned' : `${reward.progress} of ${reward.lessonsRequired} lessons complete`}`}
            >
              <span className="reward-status" aria-hidden="true">
                {reward.earned ? <CheckCircle2 /> : <CircleHelp />}
              </span>
              <div className="reward-copy">
                <strong>{reward.title}</strong>
                <span>{reward.description}</span>
                <small>{reward.progress} / {reward.lessonsRequired} lessons · +{reward.xpReward} XP</small>
              </div>
              <span className="reward-state">{reward.earned ? 'Earned' : 'Locked'}</span>
            </article>
          ))}
        </div>
        <p className="reward-note">Complete lessons to earn XP and virtual badges. Rewards are digital, not cash or gift cards.</p>
      </div>
    </section>
  );
}

function tileHue(id: string): string {
  const hues: Record<string, string> = {
    python: '209 37% 39%', javascript: '46 61% 43%', typescript: '216 52% 49%', 'html-css': '13 73% 52%',
    java: '4 60% 48%', c: '219 25% 43%', cpp: '214 48% 48%', csharp: '272 29% 47%',
    go: '183 44% 36%', rust: '21 49% 45%', sql: '160 34% 38%', ruby: '350 43% 45%',
  };
  return hues[id] ?? '160 34% 38%';
}

function isAnswerCorrect(answer: string, lesson: Lesson): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '').replace(/;+/g, '');
  const submitted = normalize(answer);
  return submitted.length > 0 && lesson.acceptedAnswers.some((candidate) => normalize(candidate) === submitted);
}

function LessonPage() {
  const params = useParams<{ lessonId: string }>();
  const lesson = lessonFor(params.lessonId);
  const { progress, complete } = useProgress();
  const [languageId, setLanguageId] = useState(() => {
    try {
      return localStorage.getItem(LANGUAGE_KEY) ?? localStorage.getItem('code-atlas-language-v1') ?? 'python';
    } catch {
      return 'python';
    }
  });
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'try-again' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const activeLanguage = languageFor(languageId);

  useEffect(() => {
    setAnswer('');
    setFeedback(null);
    setShowHint(false);
  }, [params.lessonId]);

  if (!lesson) return <NotFound />;

  const currentIndex = lessons.findIndex((item) => item.id === lesson.id);
  const previous = lessons[currentIndex - 1];
  const next = lesson.nextLessonId ? lessonFor(lesson.nextLessonId) : undefined;
  const isComplete = progress.completedLessonIds.includes(lesson.id);
  const example = lesson.examplesByLanguage[languageId];
  const displayExample = example?.replace(/\\n/g, '\n');

  const checkAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isAnswerCorrect(answer, lesson)) {
      setFeedback('correct');
      complete(lesson.id);
    } else {
      setFeedback('try-again');
    }
  };

  const updateLanguage = (value: string) => {
    setLanguageId(value);
    localStorage.setItem(LANGUAGE_KEY, value);
  };

  return (
    <AppShell>
      <main className="lesson-main">
        <div className="lesson-head">
          <Link href="/" className="back-link" data-testid="link-back-to-academy"><ArrowLeft aria-hidden="true" /> Back to the academy</Link>
          <div className="lesson-heading-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> Lesson {String(currentIndex + 1).padStart(2, '0')} / 06</div>
              <h1 data-testid="heading-lesson-title">{lesson.title}</h1>
              <p className="lesson-sub">{lesson.concept} · A shared foundation in {activeLanguage.name}</p>
            </div>
            <div className="lesson-meta"><Clock3 aria-hidden="true" /> {lesson.duration} <span>·</span> <BookOpen aria-hidden="true" /> Hands-on</div>
          </div>
        </div>

        <div className="lesson-layout">
          <article className="lesson-content">
            <p className="concept-intro" data-testid="text-lesson-explanation">
              {lesson.explanation.split('**').map((part, index) => index % 2 === 1 ? <strong key={index}>{part}</strong> : part)}
            </p>
            <blockquote className="concept-quote">{quoteFor(lesson.id)}</blockquote>
            <section className="code-panel" aria-label={`${lesson.concept} example in ${activeLanguage.name}`}>
              <div className="code-panel-head">
                <span className="code-language">{activeLanguage.name} / example</span>
                <label>
                  <span className="sr-only">Choose a language</span>
                  <select value={languageId} onChange={(event) => updateLanguage(event.target.value)} className="language-select" data-testid="select-lesson-language">
                    {languages.map((language) => <option value={language.id} key={language.id}>{language.name}</option>)}
                  </select>
                </label>
              </div>
              <pre className="code-block" data-testid="code-lesson-example"><code>{displayExample ?? `${activeLanguage.name} approaches this idea in its own way. Start with the shared concept, then notice what feels different.`}</code></pre>
              {languageId === 'html-css' && ['conditions', 'loops', 'functions'].includes(lesson.id) && (
                <div className="code-caption">HTML and CSS describe page structure and style; behavior like this is usually handled by JavaScript.</div>
              )}
              {languageId === 'sql' && lesson.id === 'loops' && <div className="code-caption">SQL works with sets of rows rather than repeating a block line by line.</div>}
            </section>
            <section className="explain-block">
              <h2>What to notice</h2>
              <p>{noticeFor(lesson.id, activeLanguage.name)}</p>
              <div className="tip-row"><Lightbulb aria-hidden="true" /><span><strong>Keep this in your pocket:</strong> {tipFor(lesson.id)}</span></div>
            </section>
            <form className="exercise" onSubmit={checkAnswer}>
              <div className="exercise-heading"><Sparkles aria-hidden="true" /> Your turn</div>
              <h2>Try a tiny exercise.</h2>
              <p>{lesson.exercisePrompt} Use {activeLanguage.name} syntax. Your answer is checked right here on the page.</p>
              <textarea
                className="answer-input"
                value={answer}
                onChange={(event) => { setAnswer(event.target.value); setFeedback(null); }}
                placeholder="Write your answer here..."
                aria-label="Your code answer"
                data-testid="input-exercise-answer"
              />
              <div className="exercise-actions">
                <button type="submit" className="button-primary" data-testid="button-check-answer">Check my answer <ArrowRight aria-hidden="true" /></button>
                <button type="button" className="button-secondary" onClick={() => setShowHint((visible) => !visible)} aria-expanded={showHint} data-testid="button-toggle-hint"><CircleHelp aria-hidden="true" /> {showHint ? 'Hide hint' : 'Need a hint?'}</button>
              </div>
              {showHint && <div className="hint-box" data-testid="text-exercise-hint"><strong>Small nudge:</strong> {lesson.hint}</div>}
              {feedback === 'correct' && (
                <div className="feedback correct" role="status" data-testid="status-exercise-feedback"><CheckCircle2 aria-hidden="true" /><span><strong>That works.</strong> {lesson.solutionExplanation}</span></div>
              )}
              {feedback === 'try-again' && (
                <div className="feedback try-again" role="status" data-testid="status-exercise-feedback"><CircleHelp aria-hidden="true" /><span><strong>Not quite yet.</strong> Check the spelling, punctuation, and shape of the example. A hint can help you find the next step.</span></div>
              )}
              {isComplete && feedback !== 'correct' && <div className="feedback correct" role="status" data-testid="status-already-complete"><CheckCircle2 aria-hidden="true" /><span>You’ve completed this lesson before. Feel free to practice again.</span></div>}
            </form>
            <nav className="lesson-nav" aria-label="Lesson navigation">
              {previous ? <Link href={`/learn/${previous.id}`} className="button-secondary" data-testid="button-previous-lesson"><ArrowLeft aria-hidden="true" /> Previous</Link> : <span className="lesson-nav-spacer" />}
              {next ? (
                <Link href={`/learn/${next.id}`} className="button-primary" data-testid="button-next-lesson">Next: {next.concept} <ArrowRight aria-hidden="true" /></Link>
              ) : (
                <Link href="/" className="button-primary" data-testid="button-finish-path">Back to Meta <Compass aria-hidden="true" /></Link>
              )}
            </nav>
          </article>

          <aside className="lesson-sidebar" aria-label="Course lessons">
            <div className="sidebar-title"><span>Foundation trail</span><span>{currentIndex + 1} / {lessons.length}</span></div>
            <div className="sidebar-lessons">
              {lessons.map((item, index) => {
                const done = progress.completedLessonIds.includes(item.id);
                return (
                  <Link href={`/learn/${item.id}`} key={item.id} className={`sidebar-lesson${item.id === lesson.id ? ' active' : ''}${done ? ' done' : ''}`} aria-current={item.id === lesson.id ? 'step' : undefined} data-testid={`sidebar-lesson-${item.id}`}>
                    <span className="lesson-index">{done ? <Check aria-label="Complete" /> : String(index + 1).padStart(2, '0')}</span>
                    <span>{item.concept}</span>
                    {item.id === lesson.id && <ArrowRight aria-hidden="true" />}
                  </Link>
                );
              })}
            </div>
            <div className="sidebar-language"><strong>{activeLanguage.name}</strong> is selected. Choose another language above to compare the same idea in a new syntax.</div>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}

function quoteFor(lessonId: string): string {
  const quotes: Record<string, string> = {
    output: '“The first sign of life from a program is a message back.”',
    values: '“Give information a name, and it becomes something you can work with.”',
    conditions: '“A condition is a question. The answer decides which path comes next.”',
    loops: '“Describe the repetition once; let the computer do it carefully.”',
    functions: '“A good function turns a useful idea into a tool you can reuse.”',
    collections: '“One name can hold a whole handful of related values.”',
  };
  return quotes[lessonId] ?? '“Small ideas connect into bigger programs.”';
}

function noticeFor(lessonId: string, languageName: string): string {
  const observations: Record<string, string> = {
    output: `Look for the instruction that sends text somewhere visible. In ${languageName}, that may be called print, println, puts, or a console method — the job is the same.`,
    values: 'Notice the name on the left and its value on the right. Some languages make the type explicit; others let the value suggest it.',
    conditions: 'The comparison produces a yes-or-no result. The indented or bracketed block belongs to the condition above it.',
    loops: 'Find the start, the stopping point, and the repeated action. Pay attention to whether the end of a range is included.',
    functions: 'The function name makes the action easy to call again. The parameter is a placeholder for the value that will arrive later.',
    collections: 'The brackets group several values, and the comma separates them. Many languages count positions starting at zero.',
  };
  return observations[lessonId] ?? `Notice how ${languageName} expresses the same underlying idea.`;
}

function tipFor(lessonId: string): string {
  const tips: Record<string, string> = {
    output: 'Quotes hold the message; the command decides where it goes.',
    values: 'Names make values easier to reuse and easier to understand.',
    conditions: 'Use == to compare equality in most languages; a single = usually assigns a value.',
    loops: 'A loop needs a clear stopping point so it knows when to move on.',
    functions: 'A parameter is the function’s input; return is its output.',
    collections: 'The first item is often item zero, not item one.',
  };
  return tips[lessonId] ?? 'Build one small piece at a time.';
}

function NotFound() {
  return (
    <AppShell>
      <main className="not-found">
        <div className="not-found-inner">
          <span className="not-found-mark"><Compass aria-hidden="true" /></span>
          <p className="section-kicker">Off the map</p>
          <h1>That path isn’t here.</h1>
          <p>The page may have moved, or this lesson is still waiting to be added. Your next useful step is right back at Meta.</p>
          <Link href="/" className="button-primary" data-testid="button-return-home">Return to the academy <ArrowRight aria-hidden="true" /></Link>
        </div>
      </main>
    </AppShell>
  );
}

function clerkAppearanceFor(theme: ThemeMode) {
  const dark = theme === 'dark';
  const surface = dark ? '#202732' : '#fffdf7';
  const input = dark ? '#252d39' : '#f7f3e8';
  const foreground = dark ? '#f1eee7' : '#263247';
  const muted = dark ? '#b2bac5' : '#6f706b';
  const border = dark ? '#434e5e' : '#d9d4c5';

  return {
    theme: shadcn,
    cssLayerName: 'clerk',
    options: {
      logoPlacement: 'inside' as const,
      logoLinkUrl: basePath || '/',
      logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    },
    variables: {
      colorPrimary: '#c95238',
      colorForeground: foreground,
      colorMutedForeground: muted,
      colorDanger: dark ? '#ffb4a5' : '#a83d31',
      colorBackground: surface,
      colorInput: input,
      colorInputForeground: foreground,
      colorNeutral: border,
      fontFamily: "'DM Sans', sans-serif",
      borderRadius: '10px',
    },
    elements: {
      rootBox: 'w-full flex justify-center',
      cardBox: dark
        ? '!bg-[#202732] !border !border-[#434e5e] !shadow-xl rounded-2xl w-[440px] max-w-full overflow-hidden'
        : '!bg-[#fffdf7] !border !border-[#d9d4c5] !shadow-xl rounded-2xl w-[440px] max-w-full overflow-hidden',
      card: '!shadow-none !border-0 !bg-transparent !rounded-none',
      footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
      headerTitle: dark ? '!text-[#f1eee7] !font-semibold' : '!text-[#263247] !font-semibold',
      headerSubtitle: dark ? '!text-[#b2bac5]' : '!text-[#6f706b]',
      socialButtonsBlockButtonText: dark ? '!text-[#f1eee7] !font-semibold' : '!text-[#263247] !font-semibold',
      formFieldLabel: dark ? '!text-[#f1eee7] !font-medium' : '!text-[#263247] !font-medium',
      footerActionLink: dark ? '!text-[#ffad8f] !font-semibold' : '!text-[#a83d31] !font-semibold',
      footerActionText: dark ? '!text-[#b2bac5]' : '!text-[#6f706b]',
      dividerText: dark ? '!text-[#b2bac5]' : '!text-[#6f706b]',
      identityPreviewEditButton: dark ? '!text-[#ffad8f] !font-semibold' : '!text-[#a83d31] !font-semibold',
      formFieldSuccessText: dark ? '!text-[#91d3a1]' : '!text-[#2f7058]',
      alertText: dark ? '!text-[#ffb4a5]' : '!text-[#8f3028]',
      logoBox: 'mb-3',
      logoImage: 'h-8 w-8',
      socialButtonsBlockButton: dark
        ? '!bg-[#252d39] !border-[#434e5e] hover:!bg-[#303a49]'
        : '!bg-[#fffdf7] !border-[#d9d4c5] hover:!bg-[#f7f3e8]',
      formButtonPrimary: '!bg-[#c95238] hover:!bg-[#ae432e] !text-white',
      formFieldInput: dark
        ? '!bg-[#252d39] !border-[#434e5e] !text-[#f1eee7]'
        : '!bg-[#f7f3e8] !border-[#d9d4c5] !text-[#263247]',
      footerAction: 'pt-4',
      dividerLine: dark ? '!bg-[#434e5e]' : '!bg-[#d9d4c5]',
      alert: dark ? '!bg-[#382525] !border-[#75463b]' : '!bg-[#fff4ef] !border-[#e9b8aa]',
      otpCodeFieldInput: dark
        ? '!bg-[#252d39] !border-[#434e5e] !text-[#f1eee7]'
        : '!bg-[#f7f3e8] !border-[#d9d4c5] !text-[#263247]',
      formFieldRow: 'mb-4',
      main: 'gap-5',
    },
  };
}

const siteFacts = [
  { title: 'Six short lessons', detail: 'Build one useful idea at a time.' },
  { title: 'Twelve language paths', detail: 'Compare the same foundations across languages.' },
  { title: 'Hands-on practice', detail: 'Try each concept, check your answer, and get a hint.' },
  { title: 'Progress saved to your account', detail: 'Pick up where you left off on this browser.' },
];

function SiteFactRotator() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [activeFact, setActiveFact] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [paused, setPaused] = useState(prefersReducedMotion);
  const [typedCharacters, setTypedCharacters] = useState(() => (
    prefersReducedMotion ? siteFacts[0].title.length + siteFacts[0].detail.length : 0
  ));
  const fact = siteFacts[activeFact];
  const totalCharacters = fact.title.length + fact.detail.length;
  const visibleTitle = fact.title.slice(0, Math.min(typedCharacters, fact.title.length));
  const visibleDetail = typedCharacters > fact.title.length
    ? fact.detail.slice(0, typedCharacters - fact.title.length)
    : '';
  const showCaret = !prefersReducedMotion && !paused;

  useEffect(() => {
    if (paused || prefersReducedMotion) return;

    let delay: number;
    let update: () => void;
    if (!deleting && typedCharacters < totalCharacters) {
      delay = typedCharacters === fact.title.length ? 360 : typedCharacters < fact.title.length ? 43 : 30;
      update = () => setTypedCharacters((current) => current + 1);
    } else if (!deleting) {
      delay = 2500;
      update = () => setDeleting(true);
    } else if (typedCharacters > 0) {
      delay = 15;
      update = () => setTypedCharacters((current) => current - 1);
    } else {
      delay = 240;
      update = () => {
        setActiveFact((current) => (current + 1) % siteFacts.length);
        setDeleting(false);
      };
    }

    const timer = window.setTimeout(update, delay);
    return () => window.clearTimeout(timer);
  }, [activeFact, deleting, fact.detail.length, fact.title.length, paused, prefersReducedMotion, totalCharacters, typedCharacters]);

  return (
    <div className="auth-note" aria-label="About Meta" data-paused={paused || prefersReducedMotion} data-testid="section-site-facts">
      <span className="progress-dot" aria-hidden="true" />
      <div className="site-fact-copy" key={activeFact} aria-live="off">
        <strong data-testid="text-site-fact-title">
          {visibleTitle}
          {typedCharacters <= fact.title.length && showCaret && <i className="typing-caret" aria-hidden="true" />}
        </strong>
        <span data-testid="text-site-fact-detail">
          {visibleDetail}
          {typedCharacters > fact.title.length && showCaret && <i className="typing-caret" aria-hidden="true" />}
        </span>
      </div>
      <button
        type="button"
        className="site-fact-toggle"
        onClick={() => setPaused((current) => !current)}
        aria-label={paused ? 'Resume site facts' : 'Pause site facts'}
        aria-pressed={paused}
        data-testid="button-toggle-site-facts"
      >
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </button>
    </div>
  );
}

function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const isSignIn = mode === 'sign-in';

  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <div className="brand auth-brand" data-testid="section-auth-brand">
          <span className="brand-mark"><Code2 aria-hidden="true" /></span>
          <span>meta</span>
        </div>
        <ThemeToggle />
      </div>
      <div className="auth-layout">
        <section className="auth-copy">
          <p className="section-kicker">A good next step</p>
          <h1>{isSignIn ? <>Welcome<br />back to <em>Meta.</em></> : <>Make room<br />for <em>curiosity.</em></>}</h1>
          <p>{isSignIn
            ? 'Sign in to pick up your learning path and keep your lesson progress organized on this browser.'
            : 'Create an account to save a learner profile and keep your progress organized on this browser.'}</p>
          <SiteFactRotator />
        </section>
        <section className="auth-form" aria-label={isSignIn ? 'Sign in to Meta' : 'Create your Meta account'}>
          {isSignIn ? (
            <SignIn
              routing="path"
              path={`${basePath}/sign-in`}
              signUpUrl={`${basePath}/sign-up`}
            />
          ) : (
            <SignUp
              routing="path"
              path={`${basePath}/sign-up`}
              signInUrl={`${basePath}/sign-in`}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function HomeRedirect() {
  return <Redirect to="/user-portal" />;
}

function UserPortal() {
  return <HomePage />;
}

function ProtectedRoutes() {
  const { isLoaded, isSignedIn } = useAuth();
  const [location] = useLocation();

  if (!isLoaded) {
    return <main className="auth-loading" aria-live="polite">Checking your sign-in…</main>;
  }
  if (!isSignedIn) {
    const destination = location === '/' ? `${basePath}/user-portal` : `${basePath}${location}`;
    return <Redirect to={`/sign-in?redirect_url=${encodeURIComponent(destination)}`} />;
  }

  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/user-portal" component={UserPortal} />
      <Route path="/learn/:lessonId" component={LessonPage} />
      <Route path="/play" component={PlayPage} />
      <Route path="/play/:track" component={PlayPage} />
      <Route path="/account" component={AccountSettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { theme } = useTheme();
  const appearance = useMemo(() => clerkAppearanceFor(theme), [theme]);

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={appearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Welcome back to Meta', subtitle: 'Continue your learning path' } },
        signUp: { start: { title: 'Start learning with Meta', subtitle: 'Create your learner account' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Switch>
        <Route path="/sign-in/*?" component={() => <AuthPage mode="sign-in" />} />
        <Route path="/sign-up/*?" component={() => <AuthPage mode="sign-up" />} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/delete-account" component={DeleteAccountPage} />
        <Route component={ProtectedRoutes} />
      </Switch>
    </ClerkProvider>
  );
}

function Router() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router />
    </ThemeProvider>
  );
}

export default App;