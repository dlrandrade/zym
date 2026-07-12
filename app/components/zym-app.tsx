"use client";

import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CirclePlay,
  Clock3,
  Copy,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  Home,
  Info,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Send,
  Settings2,
  Share,
  ShieldCheck,
  Sparkles,
  Square,
  Timer,
  Trash2,
  TrendingUp,
  Trophy,
  UserRound,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExerciseDemo } from "@/app/components/exercise-demo";
import type {
  ActiveWorkoutDraft,
  BootstrapData,
  CoachMessage,
  Exercise,
  Goal,
  Profile,
  Routine,
  RoutineDay,
  RoutineExercise,
  RoutineTemplate,
  SetType,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "@/lib/types";

type Tab = "home" | "workouts" | "progress" | "profile";
type SyncState = "saved" | "saving" | "error";

const goalLabels: Record<Goal, string> = {
  hipertrofia: "Ganhar massa",
  forca: "Ficar mais forte",
  condicionamento: "Condicionamento",
  saude: "Saúde e constância",
};

const setLabels: Record<SetType, string> = {
  warmup: "A",
  normal: "",
  drop: "D",
  failure: "F",
  superset: "S",
};

const muscles = ["Todos", "Peitoral", "Costas", "Quadríceps", "Posterior", "Glúteos", "Ombros", "Bíceps", "Tríceps", "Core"];

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function formatTimer(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Atleta";
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function localDate(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function weekDays() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      date: localDate(date),
      weekday: ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"][index],
      day: date.getDate(),
      today: localDate(date) === localDate(now),
    };
  });
}

function completedSets(workout: Workout | ActiveWorkoutDraft) {
  return workout.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed);
}

function workoutVolume(workout: Workout | ActiveWorkoutDraft) {
  return completedSets(workout).reduce((total, set) => total + set.weight * set.reps, 0);
}

function totalVolume(workouts: Workout[]) {
  return workouts.reduce((total, workout) => total + workoutVolume(workout), 0);
}

function dateLabel(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(iso))
    .replace(".", "");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function apiMutation(body: unknown) {
  const response = await fetch("/api/mutate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível salvar.");
  return payload;
}

function findExercise(data: BootstrapData, exerciseId: string) {
  return data.exercises.find((exercise) => exercise.id === exerciseId);
}

function latestSetForExercise(data: BootstrapData, exerciseId: string, setIndex: number) {
  for (const workout of data.workouts) {
    const exercise = workout.exercises.find((item) => item.exerciseId === exerciseId);
    if (exercise?.sets[setIndex]?.completed) return exercise.sets[setIndex];
  }
  return null;
}

function draftFromDay(
  data: BootstrapData,
  day: RoutineDay,
  name: string,
  routineId?: string | null,
): ActiveWorkoutDraft {
  const workoutId = makeId("workout");
  return {
    id: workoutId,
    name: `${name} · ${day.name}`,
    routineId: routineId ?? null,
    // Template days live in template_days. Only user-created routines have ids
    // that are valid for the workouts.routine_day_id foreign key.
    routineDayId: routineId ? day.id : null,
    startedAt: new Date().toISOString(),
    durationSeconds: 0,
    exercises: day.exercises.map((routineExercise, exerciseIndex) => {
      const workoutExerciseId = makeId("workout-exercise");
      return {
        id: workoutExerciseId,
        exerciseId: routineExercise.exerciseId,
        order: exerciseIndex + 1,
        notes: routineExercise.notes ?? "",
        restSeconds: routineExercise.restSeconds,
        sets: Array.from({ length: routineExercise.sets }, (_, setIndex) => {
          const previous = latestSetForExercise(data, routineExercise.exerciseId, setIndex);
          return {
            id: makeId("workout-set"),
            setNumber: setIndex + 1,
            type: "normal" as const,
            weight: previous?.weight ?? 0,
            reps: previous?.reps ?? routineExercise.repsMin,
            rpe: null,
            completed: false,
            completedAt: null,
            previous: previous ? { weight: previous.weight, reps: previous.reps } : null,
          };
        }),
      };
    }),
  };
}

function workoutToDraft(workout: Workout): ActiveWorkoutDraft {
  return {
    id: workout.id,
    name: workout.name,
    routineId: workout.routineId,
    routineDayId: workout.routineDayId,
    startedAt: workout.startedAt,
    durationSeconds: workout.durationSeconds,
    exercises: workout.exercises,
  };
}

export function ZymApp() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutDraft | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [routineBuilderOpen, setRoutineBuilderOpen] = useState(false);
  const [exerciseDetail, setExerciseDetail] = useState<Exercise | null>(null);
  const [summaryWorkout, setSummaryWorkout] = useState<Workout | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("saved");
  const handledShortcut = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      if (response.status === 401) {
        setAuthRequired(true);
        setData(null);
        return;
      }
      if (!response.ok) throw new Error("bootstrap_failed");
      const payload = (await response.json()) as BootstrapData;
      setData(payload);
      setAuthRequired(false);
      setActiveWorkout(payload.activeWorkout ? workoutToDraft(payload.activeWorkout) : null);
    } catch {
      setToast("Não foi possível conectar. Verifique sua internet.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const startWorkout = useCallback(
    async (day: RoutineDay, name: string, routineId?: string | null) => {
      if (!data) return;
      const draft = draftFromDay(data, day, name, routineId);
      setSyncState("saving");
      try {
        await apiMutation({ op: "start_workout", workout: draft });
        setActiveWorkout(draft);
        setTab("workouts");
        setSyncState("saved");
      } catch (error) {
        setSyncState("error");
        const detail = error instanceof Error ? error.message : "";
        setToast(detail ? `Não foi possível iniciar o treino: ${detail}` : "Não foi possível iniciar o treino agora.");
      }
    },
    [data],
  );

  const saveProfile = useCallback(
    async (profile: Profile) => {
      if (!data) return;
      await apiMutation({ op: "save_profile", profile });
      setData({ ...data, profile, user: { ...data.user, name: profile.name } });
    },
    [data],
  );

  useEffect(() => {
    if (!data || handledShortcut.current || activeWorkout) return;
    const params = new URLSearchParams(window.location.search);
    handledShortcut.current = true;
    const timeout = window.setTimeout(() => {
      if (params.get("tab") === "progress") setTab("progress");
      if (params.get("action") === "start") {
        const source = nextTraining(data);
        if (source) void startWorkout(source.day, source.name, source.routineId);
      }
      if (params.has("tab") || params.has("action")) window.history.replaceState({}, "", "/");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeWorkout, data, startWorkout]);

  if (loading) return <AppLoading />;
  if (authRequired) return <AuthScreen onAuthenticated={loadData} />;
  if (!data) return <OfflineState onRetry={loadData} />;

  if (!data.profile.onboardingComplete) {
    return <Onboarding profile={data.profile} onSave={saveProfile} />;
  }

  if (activeWorkout) {
    return (
      <>
        <WorkoutLogger
          data={data}
          workout={activeWorkout}
          onChange={setActiveWorkout}
          syncState={syncState}
          setSyncState={setSyncState}
          onToast={setToast}
          onDiscard={async () => {
            try {
              await apiMutation({ op: "discard_workout", workoutId: activeWorkout.id });
              setActiveWorkout(null);
              setSyncState("saved");
            } catch {
              setToast("Não foi possível descartar agora.");
            }
          }}
          onFinish={(workout) => {
            setData({ ...data, workouts: [workout, ...data.workouts], activeWorkout: null });
            setActiveWorkout(null);
            setSummaryWorkout(workout);
            setTab("home");
          }}
          onExercise={(exercise) => setExerciseDetail(exercise)}
          onOpenLibrary={() => setLibraryOpen(true)}
        />
        {exerciseDetail && <ExerciseDetail exercise={exerciseDetail} onClose={() => setExerciseDetail(null)} />}
        {libraryOpen && (
          <ExerciseLibrary
            exercises={data.exercises}
            onClose={() => setLibraryOpen(false)}
            onDetail={setExerciseDetail}
            onCreated={(exercise) => setData({ ...data, exercises: [exercise, ...data.exercises] })}
            onSelect={async (exercise) => {
              const newExercise: WorkoutExercise = {
                id: makeId("workout-exercise"),
                exerciseId: exercise.id,
                order: activeWorkout.exercises.length + 1,
                notes: "",
                restSeconds: exercise.restSeconds,
                sets: [1, 2, 3].map((setNumber) => ({
                  id: makeId("workout-set"),
                  setNumber,
                  type: "normal",
                  weight: 0,
                  reps: 10,
                  rpe: null,
                  completed: false,
                  previous: null,
                })),
              };
              const updated = { ...activeWorkout, exercises: [...activeWorkout.exercises, newExercise] };
              setActiveWorkout(updated);
              setLibraryOpen(false);
              try {
                setSyncState("saving");
                await apiMutation({
                  op: "save_workout_exercise",
                  workoutId: activeWorkout.id,
                  exercise: newExercise,
                });
                setSyncState("saved");
              } catch {
                setSyncState("error");
                setToast("O exercício foi adicionado, mas ainda não sincronizou.");
              }
            }}
          />
        )}
        {toast && <Toast message={toast} />}
      </>
    );
  }

  return (
    <div className="zym-app">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <main className="zym-shell">
        <DesktopRail tab={tab} onTab={setTab} onCoach={() => setCoachOpen(true)} />
        <section className="app-viewport">
          {data.mode === "demo" && (
            <div className="demo-ribbon">
              <span>PRÉVIA</span>
              Os dados reais entram quando o Supabase for conectado
            </div>
          )}
          {tab === "home" && (
            <HomeScreen
              data={data}
              onStart={startWorkout}
              onCoach={() => setCoachOpen(true)}
              onProgress={() => setTab("progress")}
            />
          )}
          {tab === "workouts" && (
            <WorkoutsScreen
              data={data}
              onStart={startWorkout}
              onLibrary={() => setLibraryOpen(true)}
              onBuilder={() => setRoutineBuilderOpen(true)}
              onUseTemplate={async (template) => {
                const routine = cloneTemplate(template);
                try {
                  const result = await apiMutation({ op: "save_routine", routine });
                  const saved = (result.routine ?? routine) as Routine;
                  setData({ ...data, routines: [saved, ...data.routines.filter((item) => item.id !== saved.id)] });
                  setToast(`${template.name} adicionado aos seus treinos.`);
                } catch {
                  setToast("Não foi possível adicionar o plano.");
                }
              }}
            />
          )}
          {tab === "progress" && <ProgressScreen data={data} onExercise={setExerciseDetail} />}
          {tab === "profile" && (
            <ProfileScreen
              data={data}
              onSave={saveProfile}
              onCoach={() => setCoachOpen(true)}
              onLogout={async () => {
                await fetch("/api/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "logout" }),
                });
                await loadData();
              }}
            />
          )}
          <BottomNav
            tab={tab}
            onTab={setTab}
            onQuickStart={() => {
              const source = nextTraining(data);
              if (source) void startWorkout(source.day, source.name, source.routineId);
            }}
          />
        </section>
      </main>

      {coachOpen && <CoachPanel data={data} onClose={() => setCoachOpen(false)} />}
      {libraryOpen && (
        <ExerciseLibrary
          exercises={data.exercises}
          onClose={() => setLibraryOpen(false)}
          onDetail={setExerciseDetail}
          onCreated={(exercise) => setData({ ...data, exercises: [exercise, ...data.exercises] })}
        />
      )}
      {exerciseDetail && <ExerciseDetail exercise={exerciseDetail} onClose={() => setExerciseDetail(null)} />}
      {routineBuilderOpen && (
        <RoutineBuilder
          data={data}
          onClose={() => setRoutineBuilderOpen(false)}
          onSaved={(routine) => {
            setData({ ...data, routines: [routine, ...data.routines] });
            setRoutineBuilderOpen(false);
            setToast("Treino personalizado salvo.");
          }}
        />
      )}
      {summaryWorkout && <WorkoutSummary workout={summaryWorkout} data={data} onClose={() => setSummaryWorkout(null)} />}
      {toast && <Toast message={toast} />}
    </div>
  );
}

function AppLoading() {
  return (
    <main className="splash-screen">
      <LogoMark large />
      <div className="splash-wordmark">ZYM</div>
      <div className="splash-loader"><span /></div>
    </main>
  );
}

function OfflineState({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="center-state">
      <div className="state-icon"><WifiOff size={25} /></div>
      <h1>Sem conexão com o Zym</h1>
      <p>Seus dados continuam seguros. Reconecte-se para carregá-los.</p>
      <button className="primary-button" onClick={onRetry}>Tentar novamente</button>
    </main>
  );
}

function LogoMark({ large = false }: { large?: boolean }) {
  return (
    <div className={`logo-mark ${large ? "is-large" : ""}`} aria-label="Zym">
      <span className="logo-plate plate-left" />
      <strong>Z</strong>
      <span className="logo-plate plate-right" />
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={18} />
      <span>{message}</span>
    </div>
  );
}

function DesktopRail({ tab, onTab, onCoach }: { tab: Tab; onTab: (tab: Tab) => void; onCoach: () => void }) {
  return (
    <aside className="desktop-rail">
      <LogoMark />
      <nav>
        <RailButton active={tab === "home"} label="Início" onClick={() => onTab("home")}><Home /></RailButton>
        <RailButton active={tab === "workouts"} label="Treinos" onClick={() => onTab("workouts")}><Dumbbell /></RailButton>
        <RailButton active={tab === "progress"} label="Progresso" onClick={() => onTab("progress")}><BarChart3 /></RailButton>
        <RailButton active={tab === "profile"} label="Perfil" onClick={() => onTab("profile")}><UserRound /></RailButton>
      </nav>
      <button className="rail-coach" onClick={onCoach} aria-label="Abrir Zym Coach"><Sparkles size={20} /></button>
    </aside>
  );
}

function RailButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return <button className={active ? "active" : ""} onClick={onClick} aria-label={label}>{children}<span>{label}</span></button>;
}

function BottomNav({ tab, onTab, onQuickStart }: { tab: Tab; onTab: (tab: Tab) => void; onQuickStart: () => void }) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <button className={tab === "home" ? "active" : ""} onClick={() => onTab("home")}><Home /><span>Início</span></button>
      <button className={tab === "workouts" ? "active" : ""} onClick={() => onTab("workouts")}><Dumbbell /><span>Treinos</span></button>
      <button className="quick-start" onClick={onQuickStart} aria-label="Iniciar próximo treino"><Play fill="currentColor" /></button>
      <button className={tab === "progress" ? "active" : ""} onClick={() => onTab("progress")}><BarChart3 /><span>Progresso</span></button>
      <button className={tab === "profile" ? "active" : ""} onClick={() => onTab("profile")}><UserRound /><span>Perfil</span></button>
    </nav>
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: () => Promise<void> }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, name, email, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível entrar.");
      if (payload.needsEmailConfirmation) {
        setConfirmation(true);
      } else {
        await onAuthenticated();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  if (confirmation) {
    return (
      <main className="auth-screen">
        <section className="auth-card confirmation-card">
          <div className="confirmation-icon"><Mail size={28} /></div>
          <p className="eyebrow">Falta um passo</p>
          <h1>Confirme seu e-mail</h1>
          <p>Enviamos o link para <strong>{email}</strong>. Depois de confirmar, volte ao Zym e entre normalmente.</p>
          <button className="secondary-button" onClick={() => { setConfirmation(false); setMode("login"); }}>Voltar para entrar</button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <div className="auth-glow" />
      <section className="auth-card">
        <div className="auth-brand"><LogoMark large /><span>ZYM</span></div>
        <p className="eyebrow">TREINE. REGISTRE. EVOLUA.</p>
        <h1>{mode === "login" ? "Seu treino continua aqui." : "Comece com direção."}</h1>
        <p className="auth-intro">Dados salvos na nuvem, progresso visível e zero distração durante a série.</p>

        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Entrar</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Criar conta</button>
        </div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>
              <span>Nome</span>
              <div className="input-shell"><UserRound size={18} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Como quer ser chamado?" autoComplete="name" required /></div>
            </label>
          )}
          <label>
            <span>E-mail</span>
            <div className="input-shell"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" autoComplete="email" required /></div>
          </label>
          <label>
            <span>Senha</span>
            <div className="input-shell"><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signup" ? "Mínimo de 8 caracteres" : "Sua senha"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : 6} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Mostrar senha">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          </label>
          {error && <div className="form-error"><CircleAlert size={16} />{error}</div>}
          <button className="primary-button auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={19} /> : mode === "login" ? "Entrar no Zym" : "Criar minha conta"}</button>
        </form>
        <div className="privacy-line"><ShieldCheck size={16} />Seus treinos ficam vinculados à sua conta, não a este aparelho.</div>
      </section>
    </main>
  );
}

function Onboarding({ profile, onSave }: { profile: Profile; onSave: (profile: Profile) => Promise<void> }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    setBusy(true);
    setError("");
    try {
      await onSave({ ...draft, onboardingComplete: true });
    } catch {
      setError("Não foi possível salvar suas escolhas agora.");
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    <div className="onboarding-step" key="goal">
      <p className="eyebrow">1 DE 3 · OBJETIVO</p>
      <h1>O que você quer construir?</h1>
      <p>Isso ajusta os planos que o Zym destaca primeiro.</p>
      <div className="option-grid">
        {(Object.keys(goalLabels) as Goal[]).map((goal) => (
          <button className={draft.goal === goal ? "selected" : ""} key={goal} onClick={() => setDraft({ ...draft, goal })}>
            <span>{goal === "hipertrofia" ? "◒" : goal === "forca" ? "◆" : goal === "condicionamento" ? "↗" : "✦"}</span>
            <strong>{goalLabels[goal]}</strong>
            {draft.goal === goal && <Check size={17} />}
          </button>
        ))}
      </div>
    </div>,
    <div className="onboarding-step" key="level">
      <p className="eyebrow">2 DE 3 · EXPERIÊNCIA</p>
      <h1>Qual é o seu momento?</h1>
      <p>Sem ego. O melhor plano é aquele que você consegue sustentar.</p>
      <div className="stacked-options">
        {([
          ["iniciante", "Começando agora", "Menos de 1 ano ou voltando depois de uma pausa"],
          ["intermediario", "Já tenho base", "Treino consistente e conheço os principais movimentos"],
          ["avancado", "Treino há anos", "Progressão estruturada e boa leitura de esforço"],
        ] as const).map(([value, title, description]) => (
          <button className={draft.level === value ? "selected" : ""} key={value} onClick={() => setDraft({ ...draft, level: value })}>
            <div><strong>{title}</strong><span>{description}</span></div>{draft.level === value && <Check size={19} />}
          </button>
        ))}
      </div>
    </div>,
    <div className="onboarding-step" key="days">
      <p className="eyebrow">3 DE 3 · RITMO</p>
      <h1>Quantos dias cabem na vida real?</h1>
      <p>Você poderá mudar isso quando quiser.</p>
      <div className="day-selector">
        {[2, 3, 4, 5, 6].map((value) => <button className={draft.daysPerWeek === value ? "selected" : ""} key={value} onClick={() => setDraft({ ...draft, daysPerWeek: value })}><strong>{value}</strong><span>dias</span></button>)}
      </div>
      <div className="zym-note"><Zap size={19} /><div><strong>Nossa recomendação</strong><span>{draft.level === "iniciante" ? "Três dias bem feitos vencem cinco dias abandonados." : "Escolha o volume que permite recuperar e progredir."}</span></div></div>
    </div>,
  ];

  return (
    <main className="onboarding-screen">
      <header><LogoMark /><div className="onboarding-progress">{[0, 1, 2].map((index) => <span key={index} className={index <= step ? "active" : ""} />)}</div></header>
      <section>{steps[step]}</section>
      {error && <div className="form-error"><CircleAlert size={16} />{error}</div>}
      <footer>
        {step > 0 && <button className="ghost-button" onClick={() => setStep(step - 1)}>Voltar</button>}
        <button className="primary-button" onClick={() => step === 2 ? void finish() : setStep(step + 1)} disabled={busy}>{busy ? <LoaderCircle className="spin" size={20} /> : step === 2 ? "Montar meu Zym" : "Continuar"}</button>
      </footer>
    </main>
  );
}

function nextTraining(data: BootstrapData) {
  const activeRoutine = data.routines.find((routine) => routine.isActive) ?? data.routines[0];
  if (activeRoutine?.days.length) {
    const index = data.workouts.filter((workout) => workout.routineId === activeRoutine.id).length % activeRoutine.days.length;
    return { day: activeRoutine.days[index], name: activeRoutine.name, routineId: activeRoutine.id };
  }
  const template = data.templates.find((item) => item.daysPerWeek === data.profile.daysPerWeek) ?? data.templates[0];
  if (!template?.days.length) return null;
  const index = data.workouts.length % template.days.length;
  return { day: template.days[index], name: template.name, routineId: null };
}

function cloneTemplate(template: RoutineTemplate): Routine {
  const routineId = makeId("routine");
  return {
    id: routineId,
    name: template.name,
    goal: template.goal,
    daysPerWeek: template.daysPerWeek,
    isActive: true,
    sourceTemplateId: template.id,
    days: template.days.map((dayItem, dayIndex) => ({
      ...dayItem,
      id: makeId("routine-day"),
      order: dayIndex + 1,
      exercises: dayItem.exercises.map((exercise, exerciseIndex) => ({
        ...exercise,
        id: makeId("routine-exercise"),
        order: exerciseIndex + 1,
      })),
    })),
  };
}

function AppHeader({ title, subtitle, onCoach }: { title?: string; subtitle?: string; onCoach?: () => void }) {
  return (
    <header className="app-header">
      <div className="mobile-brand"><LogoMark /><span>ZYM</span></div>
      <div className="header-copy">
        {subtitle && <span>{subtitle}</span>}
        {title && <h1>{title}</h1>}
      </div>
      <div className="header-actions">
        {onCoach && <button className="icon-button coach-button" onClick={onCoach} aria-label="Abrir Zym Coach"><Sparkles size={19} /></button>}
        <button className="icon-button" aria-label="Notificações"><Bell size={19} /></button>
      </div>
    </header>
  );
}

function HomeScreen({ data, onStart, onCoach, onProgress }: { data: BootstrapData; onStart: (day: RoutineDay, name: string, routineId?: string | null) => Promise<void>; onCoach: () => void; onProgress: () => void }) {
  const source = nextTraining(data);
  const days = weekDays();
  const completedDates = new Set(data.workouts.map((workout) => localDate(new Date(workout.startedAt))));
  const monday = new Date(days[0].date + "T00:00:00");
  const weeklyWorkouts = data.workouts.filter((workout) => new Date(workout.startedAt) >= monday);
  const weeklyVolume = totalVolume(weeklyWorkouts);
  const weeklyMinutes = Math.round(weeklyWorkouts.reduce((total, workout) => total + workout.durationSeconds, 0) / 60);
  const lastWorkout = data.workouts[0];
  const exerciseNames = source?.day.exercises.slice(0, 3).map((item) => findExercise(data, item.exerciseId)?.name).filter(Boolean) ?? [];

  return (
    <div className="screen home-screen">
      <AppHeader subtitle={new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())} onCoach={onCoach} />

      <section className="hero-greeting">
        <p>{greeting()},</p>
        <h1>{firstName(data.profile.name)}<span>.</span></h1>
        <div className="streak-pill"><Flame size={15} fill="currentColor" /> {Math.max(3, weeklyWorkouts.length + 3)} semanas em movimento</div>
      </section>

      <section className="week-strip" aria-label="Semana atual">
        {days.map((day) => {
          const done = completedDates.has(day.date);
          const planned = data.schedule.some((item) => item.date === day.date && !item.completed);
          return (
            <div className={`${day.today ? "today" : ""} ${done ? "done" : ""}`} key={day.date}>
              <span>{day.weekday}</span><strong>{day.day}</strong>
              <i>{done ? <Check size={10} /> : planned ? "•" : ""}</i>
            </div>
          );
        })}
      </section>

      {source ? (
        <section className="next-workout-card">
          <div className="workout-card-top">
            <span className="eyebrow"><Zap size={13} fill="currentColor" /> PRÓXIMO TREINO</span>
            <button aria-label="Mais opções"><MoreHorizontal /></button>
          </div>
          <div className="workout-hero-row">
            <div>
              <h2>{source.day.name}</h2>
              <p>{source.name}</p>
            </div>
            <div className="workout-orbit" aria-hidden="true"><Dumbbell size={27} /><span /><span /></div>
          </div>
          <div className="workout-meta-row">
            <span><Clock3 size={15} /> {Math.max(35, source.day.exercises.length * 10)} min</span>
            <span><Dumbbell size={15} /> {source.day.exercises.length} exercícios</span>
          </div>
          <div className="exercise-preview-list">
            {exerciseNames.map((name, index) => <span key={name}>{index + 1}<strong>{name}</strong></span>)}
            {source.day.exercises.length > 3 && <span className="more-count">+{source.day.exercises.length - 3}</span>}
          </div>
          <button className="start-workout-button" onClick={() => void onStart(source.day, source.name, source.routineId)}><Play size={18} fill="currentColor" /> Começar treino</button>
        </section>
      ) : (
        <section className="empty-card"><Dumbbell /><h2>Seu primeiro treino começa aqui</h2><p>Escolha um dos planos padrão ou monte o seu.</p></section>
      )}

      <section className="section-block">
        <div className="section-heading"><div><span>ESTA SEMANA</span><h2>Seu ritmo</h2></div><button onClick={onProgress}>Ver detalhes <ChevronRight size={15} /></button></div>
        <div className="metric-grid">
          <article className="metric-card accent-metric"><div className="metric-icon"><Activity /></div><span>Treinos</span><strong>{weeklyWorkouts.length}<small> / {data.profile.daysPerWeek}</small></strong><div className="mini-progress"><i style={{ width: `${Math.min(100, weeklyWorkouts.length / data.profile.daysPerWeek * 100)}%` }} /></div></article>
          <article className="metric-card"><div className="metric-icon"><Dumbbell /></div><span>Volume</span><strong>{weeklyVolume >= 1000 ? `${(weeklyVolume / 1000).toFixed(1)}k` : Math.round(weeklyVolume)}<small> kg</small></strong><small className="metric-delta"><TrendingUp size={12} /> {weeklyVolume ? "registrado" : "comece hoje"}</small></article>
          <article className="metric-card"><div className="metric-icon"><Clock3 /></div><span>Tempo</span><strong>{weeklyMinutes}<small> min</small></strong><small className="metric-delta">Foco real</small></article>
        </div>
      </section>

      <button className="coach-insight-card" onClick={onCoach}>
        <div className="coach-avatar"><Bot size={21} /><i /></div>
        <div><span>ZYM COACH</span><strong>{weeklyWorkouts.length >= data.profile.daysPerWeek ? "Meta semanal concluída. Priorize recuperar." : "Seu próximo treino já está pronto."}</strong><p>Use seu histórico para decidir carga, volume e ritmo.</p></div>
        <ChevronRight />
      </button>

      {lastWorkout && (
        <section className="last-workout">
          <div className="section-heading"><div><span>ÚLTIMA SESSÃO</span><h2>{lastWorkout.name}</h2></div><small>{dateLabel(lastWorkout.startedAt)}</small></div>
          <div className="last-workout-row"><span><CheckCircle2 /> {completedSets(lastWorkout).length} séries</span><span>{Math.round(workoutVolume(lastWorkout)).toLocaleString("pt-BR")} kg</span><span>{formatDuration(lastWorkout.durationSeconds)}</span></div>
        </section>
      )}
    </div>
  );
}

function WorkoutsScreen({ data, onStart, onLibrary, onBuilder, onUseTemplate }: { data: BootstrapData; onStart: (day: RoutineDay, name: string, routineId?: string | null) => Promise<void>; onLibrary: () => void; onBuilder: () => void; onUseTemplate: (template: RoutineTemplate) => Promise<void> }) {
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RoutineTemplate | null>(null);

  return (
    <div className="screen workouts-screen">
      <AppHeader title="Treinos" subtitle="PLANEJE MENOS. EXECUTE MELHOR." />
      <section className="workout-actions">
        <button className="action-card primary-action" onClick={onBuilder}><span><Plus size={21} /></span><div><strong>Criar treino</strong><small>Do seu jeito, série por série</small></div><ChevronRight /></button>
        <button className="action-card" onClick={onLibrary}><span><BookOpen size={21} /></span><div><strong>Exercícios</strong><small>Técnica, músculos e equipamentos</small></div><ChevronRight /></button>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span>SUAS ROTINAS</span><h2>{data.routines.length ? "Prontas para começar" : "Ainda sem rotina própria"}</h2></div></div>
        {data.routines.length ? (
          <div className="routine-list">
            {data.routines.map((routine) => (
              <button className="routine-card" key={routine.id} onClick={() => setSelectedRoutine(routine)}>
                <div className="routine-card-icon"><Dumbbell /></div>
                <div><span>{routine.isActive ? "ATIVA" : `${routine.daysPerWeek} DIAS`}</span><strong>{routine.name}</strong><small>{routine.days.map((day) => day.name).join(" · ")}</small></div>
                <ChevronRight />
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-routine"><div><Sparkles /></div><h3>Escolha uma base inteligente</h3><p>Adote um dos planos abaixo e ajuste depois. Não precisa começar do zero.</p></div>
        )}
      </section>

      <section className="section-block template-section">
        <div className="section-heading"><div><span>PLANOS ZYM</span><h2>Estruturas testadas</h2></div><small>{data.templates.length} opções</small></div>
        <div className="template-scroll">
          {data.templates.map((template, index) => (
            <article className={`template-card template-${index % 3}`} key={template.id}>
              <div className="template-card-head"><span>{template.level === "iniciante" ? "BASE" : template.goal === "forca" ? "FORÇA" : "VOLUME"}</span><div className="template-number">0{index + 1}</div></div>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              <div className="template-stats"><span><CalendarDays /> {template.daysPerWeek}x semana</span><span><Clock3 /> {template.sessionMinutes} min</span></div>
              <div className="tag-row">{template.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <button onClick={() => setSelectedTemplate(template)}>Ver plano <ChevronRight /></button>
            </article>
          ))}
        </div>
      </section>

      <section className="quick-workout-card">
        <div><span>TREINO LIVRE</span><h2>Só quer registrar?</h2><p>Comece vazio e adicione exercícios durante a sessão.</p></div>
        <button onClick={onLibrary}><Plus /> Abrir biblioteca</button>
      </section>

      {selectedRoutine && (
        <RoutineDetail
          routine={selectedRoutine}
          data={data}
          onClose={() => setSelectedRoutine(null)}
          onStart={(day) => { setSelectedRoutine(null); void onStart(day, selectedRoutine.name, selectedRoutine.id); }}
        />
      )}
      {selectedTemplate && (
        <TemplateDetail
          template={selectedTemplate}
          data={data}
          onClose={() => setSelectedTemplate(null)}
          onStart={(day) => { setSelectedTemplate(null); void onStart(day, selectedTemplate.name, null); }}
          onUse={async () => { await onUseTemplate(selectedTemplate); setSelectedTemplate(null); }}
        />
      )}
    </div>
  );
}

function RoutineDetail({ routine, data, onClose, onStart }: { routine: Routine; data: BootstrapData; onClose: () => void; onStart: (day: RoutineDay) => void }) {
  return (
    <Sheet onClose={onClose} className="detail-sheet">
      <SheetHeader eyebrow={`${routine.daysPerWeek} DIAS POR SEMANA`} title={routine.name} onClose={onClose} />
      <div className="routine-day-list">
        {routine.days.map((day) => <DayCard key={day.id} day={day} data={data} onStart={() => onStart(day)} />)}
      </div>
    </Sheet>
  );
}

function TemplateDetail({ template, data, onClose, onStart, onUse }: { template: RoutineTemplate; data: BootstrapData; onClose: () => void; onStart: (day: RoutineDay) => void; onUse: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Sheet onClose={onClose} className="detail-sheet">
      <SheetHeader eyebrow={`${template.durationWeeks} SEMANAS · ${template.sessionMinutes} MIN`} title={template.name} onClose={onClose} />
      <p className="sheet-intro">{template.description}</p>
      <div className="plan-facts"><span><Trophy /> {goalLabels[template.goal]}</span><span><Activity /> Nível {template.level}</span><span><CalendarDays /> {template.daysPerWeek} dias</span></div>
      <div className="routine-day-list">
        {template.days.map((day) => <DayCard key={day.id} day={day} data={data} onStart={() => onStart(day)} />)}
      </div>
      <div className="sticky-sheet-action"><button className="secondary-button" onClick={() => { setBusy(true); void onUse().finally(() => setBusy(false)); }} disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Copy />} Usar este plano</button></div>
    </Sheet>
  );
}

function DayCard({ day, data, onStart }: { day: RoutineDay; data: BootstrapData; onStart: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`day-card ${open ? "open" : ""}`}>
      <button className="day-card-header" onClick={() => setOpen((value) => !value)}><div><span>{day.exercises.length} EXERCÍCIOS</span><strong>{day.name}</strong></div><ChevronDown /></button>
      {open && <div className="day-exercises">{day.exercises.map((item) => { const exercise = findExercise(data, item.exerciseId); return <div key={item.id}><span>{item.order}</span><div><strong>{exercise?.name ?? "Exercício"}</strong><small>{item.sets} × {item.repsMin === item.repsMax ? item.repsMin : `${item.repsMin}–${item.repsMax}`} · {formatTimer(item.restSeconds)}</small></div></div>; })}<button className="start-day-button" onClick={onStart}><Play fill="currentColor" /> Começar {day.name}</button></div>}
    </article>
  );
}

function ProgressScreen({ data, onExercise }: { data: BootstrapData; onExercise: (exercise: Exercise) => void }) {
  const [range, setRange] = useState<"30" | "90" | "all">("90");
  const anchor = Math.max(0, ...data.workouts.map((workout) => new Date(workout.startedAt).getTime()));
  const cutoff = range === "all" ? 0 : anchor - Number(range) * 86_400_000;
  const workouts = data.workouts.filter((workout) => new Date(workout.startedAt).getTime() >= cutoff).slice().reverse();
  const chartData = workouts.map((workout) => ({
    date: dateLabel(workout.startedAt),
    volume: Math.round(workoutVolume(workout)),
  }));
  const allSets = data.workouts.flatMap((workout) => workout.exercises.flatMap((exercise) => exercise.sets.map((set) => ({ ...set, exerciseId: exercise.exerciseId }))));
  const prs = Array.from(new Set(allSets.map((set) => set.exerciseId))).map((exerciseId) => {
    const sets = allSets.filter((set) => set.exerciseId === exerciseId && set.completed);
    const best = sets.sort((a, b) => b.weight - a.weight)[0];
    return { exercise: findExercise(data, exerciseId), best };
  }).filter((item) => item.exercise && item.best).sort((a, b) => (b.best?.weight ?? 0) - (a.best?.weight ?? 0)).slice(0, 4);

  const muscleVolume = new Map<string, number>();
  workouts.forEach((workout) => workout.exercises.forEach((workoutExercise) => {
    const exercise = findExercise(data, workoutExercise.exerciseId);
    if (!exercise) return;
    const volume = workoutExercise.sets.filter((set) => set.completed).reduce((sum, set) => sum + set.weight * set.reps, 0);
    muscleVolume.set(exercise.primaryMuscle, (muscleVolume.get(exercise.primaryMuscle) ?? 0) + volume);
  }));
  const muscleRows = Array.from(muscleVolume.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxMuscle = Math.max(1, ...muscleRows.map((row) => row[1]));
  const volume = totalVolume(workouts);
  const totalSeconds = workouts.reduce((sum, workout) => sum + workout.durationSeconds, 0);

  return (
    <div className="screen progress-screen">
      <AppHeader title="Progresso" subtitle="O QUE MELHORA MERECE SER VISTO." />
      <div className="range-filter">{(["30", "90", "all"] as const).map((value) => <button key={value} className={range === value ? "active" : ""} onClick={() => setRange(value)}>{value === "all" ? "Tudo" : `${value} dias`}</button>)}</div>

      <section className="progress-hero">
        <div className="progress-hero-head"><div><span>VOLUME MOVIMENTADO</span><strong>{volume >= 1000 ? `${(volume / 1000).toFixed(1)} mil` : volume.toLocaleString("pt-BR")} <small>kg</small></strong></div><div className="trend-badge"><TrendingUp /> constância</div></div>
        <div className="chart-wrap">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
                <defs><linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dfff37" stopOpacity={0.42} /><stop offset="100%" stopColor="#dfff37" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#2a2a2a" vertical={false} strokeDasharray="3 6" />
                <XAxis dataKey="date" stroke="#747474" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" />
                <YAxis stroke="#747474" tickLine={false} axisLine={false} fontSize={10} width={50} tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)}k` : value} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="volume" stroke="#dfff37" strokeWidth={2.6} fill="url(#volumeGradient)" dot={{ r: 3, fill: "#0b0b0b", stroke: "#dfff37", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#dfff37" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="chart-empty"><BarChart3 /><span>Conclua mais um treino para ver a curva.</span></div>}
        </div>
      </section>

      <section className="progress-metrics">
        <article><div><Dumbbell /></div><span>Treinos</span><strong>{workouts.length}</strong></article>
        <article><div><Clock3 /></div><span>Tempo</span><strong>{formatDuration(totalSeconds)}</strong></article>
        <article><div><Flame /></div><span>Frequência</span><strong>{workouts.length ? `${(workouts.length / Math.max(1, Number(range === "all" ? 90 : range) / 7)).toFixed(1)}x` : "0x"}<small>/sem</small></strong></article>
      </section>

      <section className="section-block muscle-section">
        <div className="section-heading"><div><span>DISTRIBUIÇÃO</span><h2>Grupos trabalhados</h2></div></div>
        <div className="muscle-list">
          {muscleRows.length ? muscleRows.map(([muscle, value], index) => (
            <div key={muscle}><div className="muscle-label"><span>{muscle}</span><strong>{Math.round(value).toLocaleString("pt-BR")} kg</strong></div><div className="muscle-bar"><i style={{ width: `${Math.max(8, value / maxMuscle * 100)}%`, opacity: 1 - index * 0.12 }} /></div></div>
          )) : <p className="empty-copy">Os grupos aparecem depois do primeiro treino concluído.</p>}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span>MELHORES MARCAS</span><h2>Recordes pessoais</h2></div><Trophy size={20} /></div>
        <div className="pr-list">
          {prs.map(({ exercise, best }, index) => exercise && best ? (
            <button key={exercise.id} onClick={() => onExercise(exercise)}><span className="pr-rank">{String(index + 1).padStart(2, "0")}</span><div><strong>{exercise.name}</strong><small>{best.reps} repetições</small></div><b>{best.weight}<small> kg</small></b><ChevronRight /></button>
          ) : null)}
        </div>
      </section>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><span>{label}</span><strong>{payload[0].value.toLocaleString("pt-BR")} kg</strong></div>;
}

function ProfileScreen({ data, onSave, onCoach, onLogout }: { data: BootstrapData; onSave: (profile: Profile) => Promise<void>; onCoach: () => void; onLogout: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const initials = data.profile.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className="screen profile-screen">
      <AppHeader title="Perfil" subtitle="SEU ZYM, SUAS REGRAS." onCoach={onCoach} />
      <section className="profile-hero-card">
        <div className="profile-avatar">{initials}<span /></div>
        <div><span>{data.profile.level.toUpperCase()}</span><h2>{data.profile.name}</h2><p>{goalLabels[data.profile.goal]} · {data.profile.daysPerWeek}x por semana</p></div>
        <button className="icon-button" onClick={() => setEditing(true)} aria-label="Editar perfil"><Pencil size={17} /></button>
      </section>

      <button className="install-card" onClick={() => setInstallOpen(true)}>
        <div className="install-icon"><LogoMark /></div>
        <div><span>APP NO IPHONE</span><strong>Instalar Zym na Tela de Início</strong><small>Abre em tela cheia e fica com ícone próprio.</small></div>
        <ChevronRight />
      </button>

      <section className="settings-group">
        <h3>Treino</h3>
        <button onClick={() => setEditing(true)}><span><Dumbbell /> Objetivo</span><div>{goalLabels[data.profile.goal]} <ChevronRight /></div></button>
        <button onClick={() => setEditing(true)}><span><CalendarDays /> Frequência semanal</span><div>{data.profile.daysPerWeek} dias <ChevronRight /></div></button>
        <button onClick={() => setEditing(true)}><span><Timer /> Descanso padrão</span><div>{formatTimer(data.profile.defaultRestSeconds)} <ChevronRight /></div></button>
        <button onClick={() => setEditing(true)}><span><Settings2 /> Unidade de carga</span><div>{data.profile.unit} <ChevronRight /></div></button>
      </section>

      <section className="settings-group">
        <h3>Inteligência e dados</h3>
        <button onClick={onCoach}><span><Sparkles /> Zym Coach</span><div>Ativo <ChevronRight /></div></button>
        <div className="settings-info"><span><ShieldCheck /> Dados na nuvem</span><p>Treinos, rotinas e progresso são gravados no Supabase. O navegador não é usado como banco de dados.</p></div>
        <div className="settings-info"><span><Info /> Integrações Apple</span><p>HealthKit e Apple Watch exigem um app nativo. A PWA mantém o foco no registro de treino sem prometer uma integração que o Safari não oferece.</p></div>
      </section>

      <section className="settings-group">
        <h3>Conta</h3>
        <div className="account-email"><Mail /> <div><span>E-mail</span><strong>{data.user.email}</strong></div></div>
        {data.mode === "connected" && <button className="logout-button" onClick={() => { setBusy(true); void onLogout().finally(() => setBusy(false)); }} disabled={busy}><LogOut /> {busy ? "Saindo…" : "Sair do Zym"}</button>}
      </section>

      <footer className="profile-footer"><LogoMark /><span>Zym · versão 1.0</span></footer>

      {editing && <ProfileEditor profile={data.profile} onClose={() => setEditing(false)} onSave={async (profile) => { await onSave(profile); setEditing(false); }} />}
      {installOpen && <InstallSheet onClose={() => setInstallOpen(false)} />}
    </div>
  );
}

function ProfileEditor({ profile, onClose, onSave }: { profile: Profile; onClose: () => void; onSave: (profile: Profile) => Promise<void> }) {
  const [draft, setDraft] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Sheet onClose={onClose} className="form-sheet">
      <SheetHeader eyebrow="CONFIGURAÇÕES" title="Ajustar perfil" onClose={onClose} />
      <div className="form-stack">
        <label><span>Nome</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label><span>Objetivo</span><select value={draft.goal} onChange={(event) => setDraft({ ...draft, goal: event.target.value as Goal })}>{(Object.keys(goalLabels) as Goal[]).map((goal) => <option key={goal} value={goal}>{goalLabels[goal]}</option>)}</select></label>
        <label><span>Nível</span><select value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.target.value as Profile["level"] })}><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option></select></label>
        <label><span>Dias por semana</span><input type="number" min={1} max={7} value={draft.daysPerWeek} onChange={(event) => setDraft({ ...draft, daysPerWeek: Number(event.target.value) })} /></label>
        <label><span>Descanso padrão (segundos)</span><input type="number" min={15} max={600} step={15} value={draft.defaultRestSeconds} onChange={(event) => setDraft({ ...draft, defaultRestSeconds: Number(event.target.value) })} /></label>
        <label><span>Unidade</span><select value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value as "kg" | "lb" })}><option value="kg">Quilogramas (kg)</option><option value="lb">Libras (lb)</option></select></label>
      </div>
      {error && <div className="form-error"><CircleAlert />{error}</div>}
      <div className="sticky-sheet-action"><button className="primary-button" disabled={busy || draft.name.trim().length < 2} onClick={() => { setBusy(true); setError(""); void onSave(draft).catch(() => setError("Não foi possível salvar.")).finally(() => setBusy(false)); }}>{busy ? <LoaderCircle className="spin" /> : <Check />} Salvar alterações</button></div>
    </Sheet>
  );
}

function InstallSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose} className="install-sheet">
      <SheetHeader eyebrow="PWA · IPHONE" title="Zym na Tela de Início" onClose={onClose} />
      <div className="install-preview"><div className="home-icon-preview"><LogoMark large /></div><strong>Zym</strong></div>
      <div className="install-steps">
        <div><span>1</span><div><strong>Abra no Safari</strong><p>Use o link publicado do Zym no Safari do iPhone.</p></div></div>
        <div><span>2</span><div><strong>Toque em Compartilhar</strong><p>É o ícone de um quadrado com uma seta para cima.</p></div><Share /></div>
        <div><span>3</span><div><strong>Adicionar à Tela de Início</strong><p>Confirme “Zym”. O app abrirá em tela cheia.</p></div><Plus /></div>
      </div>
      <div className="zym-note"><ShieldCheck /><div><strong>Ícone e encaixe já configurados</strong><span>O projeto inclui manifest, ícones 180/192/512, modo standalone e áreas seguras do iPhone.</span></div></div>
      <button className="primary-button" onClick={onClose}>Entendi</button>
    </Sheet>
  );
}

function CoachPanel({ data, onClose }: { data: BootstrapData; onClose: () => void }) {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Eu uso o que você realmente registrou — não um treino imaginário. Posso ajudar a decidir carga, condensar uma sessão ou interpretar sua evolução.`,
      createdAt: new Date().toISOString(),
      model: "zym",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentWeek = data.workouts.filter((workout) => Date.now() - new Date(workout.startedAt).getTime() < 7 * 86_400_000);
  const context = useMemo(() => ({
    profile: {
      goal: data.profile.goal,
      level: data.profile.level,
      daysPerWeek: data.profile.daysPerWeek,
      unit: data.profile.unit,
    },
    weeklySessions: currentWeek.length,
    weeklyVolume: Math.round(totalVolume(currentWeek)),
    recentWorkouts: data.workouts.slice(0, 5).map((workout) => ({
      name: workout.name,
      date: workout.startedAt,
      durationMinutes: Math.round(workout.durationSeconds / 60),
      volume: Math.round(workoutVolume(workout)),
      exercises: workout.exercises.map((exercise) => ({
        name: findExercise(data, exercise.exerciseId)?.name,
        sets: exercise.sets.filter((set) => set.completed).map((set) => ({ weight: set.weight, reps: set.reps, rpe: set.rpe })),
      })),
    })),
  }), [currentWeek, data]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(message = input) {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    const userMessage: CoachMessage = { id: makeId("message"), role: "user", content: trimmed, createdAt: new Date().toISOString() };
    setMessages((items) => [...items, userMessage]);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, context }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "A IA não respondeu.");
      setMessages((items) => [...items, { id: makeId("message"), role: "assistant", content: payload.answer, createdAt: new Date().toISOString(), model: payload.model }]);
    } catch (error) {
      setMessages((items) => [...items, { id: makeId("message"), role: "assistant", content: error instanceof Error ? error.message : "Não consegui responder agora.", createdAt: new Date().toISOString() }]);
    } finally {
      setBusy(false);
    }
  }

  const suggestions = ["Posso aumentar a carga hoje?", "Condense meu treino para 30 min", "O que meu histórico mostra?"];
  return (
    <div className="coach-overlay" role="dialog" aria-modal="true" aria-label="Zym Coach">
      <div className="coach-panel">
        <header>
          <div className="coach-title"><div><Bot /><i /></div><span><small>SEU COPILOTO DE TREINO</small><strong>Zym Coach</strong></span></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X /></button>
        </header>
        <div className="coach-context"><Sparkles /><span>Analisando {Math.min(5, data.workouts.length)} treinos recentes</span><ShieldCheck /></div>
        <div className="coach-messages" ref={scrollRef}>
          {messages.map((message) => (
            <div className={`coach-message ${message.role}`} key={message.id}>
              {message.role === "assistant" && <div className="message-avatar"><Bot /></div>}
              <div className="message-bubble">{renderCoachText(message.content)}{message.model && message.model !== "zym" && <small className="model-label">via {message.model === "zym-demo" ? "prévia local" : message.model}</small>}</div>
            </div>
          ))}
          {busy && <div className="coach-message assistant"><div className="message-avatar"><Bot /></div><div className="message-bubble typing"><i /><i /><i /></div></div>}
        </div>
        {messages.length < 3 && <div className="coach-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void send(suggestion)}>{suggestion}</button>)}</div>}
        <form className="coach-input" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <textarea rows={1} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pergunte sobre seu treino…" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} />
          <button disabled={!input.trim() || busy} aria-label="Enviar"><Send /></button>
        </form>
        <p className="coach-disclaimer">Sugestões educacionais. Dor ou lesão exigem avaliação profissional.</p>
      </div>
    </div>
  );
}

function renderCoachText(content: string) {
  return content.split(/\n+/).filter(Boolean).map((paragraph, paragraphIndex) => (
    <p key={`${paragraph}-${paragraphIndex}`}>
      {paragraph.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <span key={index}>{part}</span>)}
    </p>
  ));
}

function ExerciseLibrary({ exercises, onClose, onDetail, onSelect, onCreated }: { exercises: Exercise[]; onClose: () => void; onDetail: (exercise: Exercise) => void; onSelect?: (exercise: Exercise) => void | Promise<void>; onCreated?: (exercise: Exercise) => void }) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("Todos");
  const [customOpen, setCustomOpen] = useState(false);
  const [localExercises, setLocalExercises] = useState(exercises);
  const filtered = localExercises.filter((exercise) => {
    const matchesQuery = `${exercise.name} ${exercise.primaryMuscle} ${exercise.equipment}`.toLowerCase().includes(query.toLowerCase());
    const matchesMuscle = muscle === "Todos" || exercise.primaryMuscle === muscle || exercise.secondaryMuscles.includes(muscle);
    return matchesQuery && matchesMuscle;
  });

  return (
    <Sheet onClose={onClose} className="library-sheet">
      <SheetHeader eyebrow={`${localExercises.length} MOVIMENTOS`} title={onSelect ? "Adicionar exercício" : "Biblioteca"} onClose={onClose} />
      <div className="search-shell"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar exercício, músculo ou equipamento" />{query && <button onClick={() => setQuery("")}><X /></button>}</div>
      <div className="filter-scroll">{muscles.map((item) => <button key={item} className={muscle === item ? "active" : ""} onClick={() => setMuscle(item)}>{item}</button>)}</div>
      <button className="custom-exercise-button" onClick={() => setCustomOpen(true)}><Plus /><div><strong>Criar exercício personalizado</strong><small>Inclua instruções, descanso e vídeo próprio</small></div><ChevronRight /></button>
      <div className="exercise-list">
        {filtered.map((exercise) => (
          <article key={exercise.id}>
            <button className="exercise-list-main" onClick={() => onSelect ? void onSelect(exercise) : onDetail(exercise)}>
              <ExerciseDemo type={exercise.demoType} compact />
              <div><strong>{exercise.name}</strong><span>{exercise.primaryMuscle} · {exercise.equipment}</span>{exercise.isCustom && <small>PERSONALIZADO</small>}</div>
              {onSelect ? <Plus /> : <ChevronRight />}
            </button>
            {onSelect && <button className="exercise-info-button" onClick={() => onDetail(exercise)} aria-label={`Ver ${exercise.name}`}><Info /></button>}
          </article>
        ))}
        {!filtered.length && <div className="list-empty"><Search /><strong>Nenhum exercício encontrado</strong><span>Tente outro termo ou grupo muscular.</span></div>}
      </div>
      {customOpen && <CustomExerciseForm onClose={() => setCustomOpen(false)} onSaved={(exercise) => { setLocalExercises((items) => [exercise, ...items]); onCreated?.(exercise); setCustomOpen(false); }} />}
    </Sheet>
  );
}

function CustomExerciseForm({ onClose, onSaved }: { onClose: () => void; onSaved: (exercise: Exercise) => void }) {
  const [name, setName] = useState("");
  const [primaryMuscle, setPrimaryMuscle] = useState("Peitoral");
  const [equipment, setEquipment] = useState("Halteres");
  const [instruction, setInstruction] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [restSeconds, setRestSeconds] = useState(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const exercise: Exercise = {
      id: makeId("exercise"),
      name: name.trim(),
      slug: slugify(name),
      primaryMuscle,
      secondaryMuscles: [],
      equipment,
      instructions: [instruction.trim()],
      tips: [],
      demoType: primaryMuscle === "Costas" || primaryMuscle === "Bíceps" ? "pull" : primaryMuscle === "Quadríceps" || primaryMuscle === "Glúteos" ? "squat" : primaryMuscle === "Core" ? "core" : "press",
      restSeconds,
      videoUrl: videoUrl.trim() || null,
      isCustom: true,
    };
    setBusy(true);
    setError("");
    try {
      const result = await apiMutation({ op: "create_exercise", exercise });
      onSaved((result.exercise ?? exercise) as Exercise);
    } catch {
      setError("Não foi possível criar o exercício.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="nested-sheet">
      <div className="nested-sheet-panel">
        <SheetHeader eyebrow="NOVO MOVIMENTO" title="Exercício personalizado" onClose={onClose} />
        <div className="form-stack">
          <label><span>Nome</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Remada unilateral no banco" autoFocus /></label>
          <label><span>Grupo principal</span><select value={primaryMuscle} onChange={(event) => setPrimaryMuscle(event.target.value)}>{muscles.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Equipamento</span><input value={equipment} onChange={(event) => setEquipment(event.target.value)} /></label>
          <label><span>Como executar</span><textarea rows={4} value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Descreva o movimento de forma objetiva" /></label>
          <label><span>Vídeo (opcional)</span><input type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://…" /></label>
          <label><span>Descanso (segundos)</span><input type="number" min={0} max={1800} step={15} value={restSeconds} onChange={(event) => setRestSeconds(Number(event.target.value))} /></label>
        </div>
        {error && <div className="form-error"><CircleAlert />{error}</div>}
        <button className="primary-button" disabled={busy || name.trim().length < 2 || instruction.trim().length < 4} onClick={() => void save()}>{busy ? <LoaderCircle className="spin" /> : <Plus />} Criar exercício</button>
      </div>
    </div>
  );
}

function ExerciseDetail({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} className="exercise-detail-sheet">
      <SheetHeader eyebrow={`${exercise.primaryMuscle.toUpperCase()} · ${exercise.equipment.toUpperCase()}`} title={exercise.name} onClose={onClose} />
      {exercise.videoUrl ? <div className="video-shell"><video src={exercise.videoUrl} controls playsInline preload="metadata" /><span><CirclePlay /> Vídeo de execução</span></div> : <ExerciseDemo type={exercise.demoType} />}
      <section className="instruction-section"><h3>Execução</h3><ol>{exercise.instructions.map((instruction, index) => <li key={instruction}><span>{String(index + 1).padStart(2, "0")}</span><p>{instruction}</p></li>)}</ol></section>
      {exercise.tips.length > 0 && <section className="tips-section"><h3>Pontos de atenção</h3>{exercise.tips.map((tip) => <div key={tip}><CheckCircle2 /><p>{tip}</p></div>)}</section>}
      <div className="exercise-facts"><span><Timer /> Descanso sugerido <strong>{formatTimer(exercise.restSeconds)}</strong></span><span><Activity /> Secundários <strong>{exercise.secondaryMuscles.join(", ") || "—"}</strong></span></div>
      <div className="safety-copy"><Info /><p>Use esta demonstração como referência visual. Ajustes de técnica e carga devem respeitar sua mobilidade e orientação profissional.</p></div>
    </Sheet>
  );
}

function Sheet({ children, onClose, className = "" }: { children: React.ReactNode; onClose: () => void; className?: string }) {
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`sheet-panel ${className}`} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        {children}
      </section>
    </div>
  );
}

function SheetHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
  return <header className="sheet-header"><div><span>{eyebrow}</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X /></button></header>;
}

function WorkoutLogger({ data, workout, onChange, syncState, setSyncState, onToast, onDiscard, onFinish, onExercise, onOpenLibrary }: { data: BootstrapData; workout: ActiveWorkoutDraft; onChange: (workout: ActiveWorkoutDraft) => void; syncState: SyncState; setSyncState: (state: SyncState) => void; onToast: (message: string) => void; onDiscard: () => Promise<void>; onFinish: (workout: Workout) => void; onExercise: (exercise: Exercise) => void; onOpenLibrary: () => void }) {
  const [elapsed, setElapsed] = useState(workout.durationSeconds);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(workout.startedAt).getTime()) / 1000))), 1000);
    return () => window.clearInterval(interval);
  }, [workout.startedAt]);

  useEffect(() => {
    if (restRemaining <= 0) return;
    const timeout = window.setTimeout(() => setRestRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [restRemaining]);

  const persistSet = useCallback(async (workoutExerciseId: string, set: WorkoutSet) => {
    setSyncState("saving");
    try {
      await apiMutation({ op: "save_set", workoutId: workout.id, workoutExerciseId, set });
      setSyncState("saved");
    } catch {
      setSyncState("error");
      onToast("Alteração pendente. Mantenha o app aberto e tente novamente.");
    }
  }, [onToast, setSyncState, workout.id]);

  function updateSet(exerciseId: string, setId: string, patch: Partial<WorkoutSet>) {
    const updated: ActiveWorkoutDraft = {
      ...workout,
      exercises: workout.exercises.map((exercise) => exercise.id === exerciseId ? {
        ...exercise,
        sets: exercise.sets.map((set) => set.id === setId ? { ...set, ...patch } : set),
      } : exercise),
    };
    onChange(updated);
    return updated.exercises.find((exercise) => exercise.id === exerciseId)?.sets.find((set) => set.id === setId);
  }

  function toggleSet(exercise: WorkoutExercise, set: WorkoutSet) {
    const completed = !set.completed;
    const updated = updateSet(exercise.id, set.id, { completed, completedAt: completed ? new Date().toISOString() : null });
    if (updated) void persistSet(exercise.id, updated);
    if (completed) {
      setRestRemaining(exercise.restSeconds);
      setRestTotal(exercise.restSeconds);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(20);
    }
  }

  function cycleSetType(exercise: WorkoutExercise, set: WorkoutSet) {
    const sequence: SetType[] = ["normal", "warmup", "drop", "failure", "superset"];
    const type = sequence[(sequence.indexOf(set.type) + 1) % sequence.length];
    const updated = updateSet(exercise.id, set.id, { type });
    if (updated) void persistSet(exercise.id, updated);
  }

  async function addSet(exercise: WorkoutExercise) {
    const last = exercise.sets[exercise.sets.length - 1];
    const newSet: WorkoutSet = {
      id: makeId("workout-set"),
      setNumber: exercise.sets.length + 1,
      type: "normal",
      weight: last?.weight ?? 0,
      reps: last?.reps ?? 10,
      rpe: null,
      completed: false,
      previous: null,
    };
    const updatedExercise = { ...exercise, sets: [...exercise.sets, newSet] };
    onChange({ ...workout, exercises: workout.exercises.map((item) => item.id === exercise.id ? updatedExercise : item) });
    setSyncState("saving");
    try {
      await apiMutation({ op: "save_workout_exercise", workoutId: workout.id, exercise: updatedExercise });
      setSyncState("saved");
    } catch {
      setSyncState("error");
    }
  }

  async function finishWorkout() {
    if (!completedSets(workout).length) {
      onToast("Conclua pelo menos uma série antes de finalizar.");
      return;
    }
    setFinishing(true);
    try {
      await apiMutation({ op: "finish_workout", workoutId: workout.id, durationSeconds: elapsed, notes: "" });
      const completed: Workout = {
        ...workout,
        durationSeconds: elapsed,
        endedAt: new Date().toISOString(),
        status: "completed",
      };
      onFinish(completed);
    } catch {
      onToast("Não foi possível finalizar porque o treino ainda não sincronizou.");
    } finally {
      setFinishing(false);
    }
  }

  const progress = restTotal ? (restTotal - restRemaining) / restTotal * 100 : 0;
  return (
    <main className="workout-logger">
      <header className="logger-header">
        <button className="icon-button" onClick={() => onToast("Finalize ou descarte o treino para sair com segurança.")} aria-label="Voltar"><ArrowLeft /></button>
        <div><span>{formatTimer(elapsed)}</span><small className={`sync-label ${syncState}`}>{syncState === "saved" ? <><Check /> Salvo</> : syncState === "saving" ? <><LoaderCircle className="spin" /> Salvando</> : <><CircleAlert /> Pendente</>}</small></div>
        <button className="finish-top-button" onClick={() => void finishWorkout()} disabled={finishing}>{finishing ? <LoaderCircle className="spin" /> : "Finalizar"}</button>
      </header>

      <section className="logger-summary">
        <div><span>Treino</span><strong>{workout.name}</strong></div>
        <div className="live-metrics"><span><strong>{completedSets(workout).length}</strong> séries</span><span><strong>{Math.round(workoutVolume(workout)).toLocaleString("pt-BR")}</strong> kg</span><span><strong>{workout.exercises.length}</strong> exercícios</span></div>
      </section>

      {restRemaining > 0 && (
        <div className="rest-timer-bar">
          <button className="rest-ring" style={{ background: `conic-gradient(#dfff37 ${progress}%, #353535 ${progress}% 100%)` }} onClick={() => setRestRemaining(0)} aria-label="Encerrar descanso"><span>{formatTimer(restRemaining)}</span></button>
          <div><span>DESCANSO</span><strong>{restRemaining > 15 ? "Respire. A próxima série vem limpa." : "Prepare-se para a próxima série."}</strong></div>
          <button onClick={() => { setRestRemaining((value) => value + 30); setRestTotal((value) => value + 30); }}>+30s</button>
          <button className="timer-close" onClick={() => setRestRemaining(0)} aria-label="Fechar"><X /></button>
        </div>
      )}

      <div className="logger-exercises">
        {workout.exercises.map((workoutExercise, exerciseIndex) => {
          const exercise = findExercise(data, workoutExercise.exerciseId);
          if (!exercise) return null;
          return (
            <article className="logger-exercise" key={workoutExercise.id}>
              <header>
                <button className="logger-exercise-title" onClick={() => onExercise(exercise)}><ExerciseDemo type={exercise.demoType} compact /><div><span>{String(exerciseIndex + 1).padStart(2, "0")} · {exercise.primaryMuscle.toUpperCase()}</span><h2>{exercise.name}</h2></div><ChevronRight /></button>
                <button className="icon-button" aria-label="Opções"><MoreHorizontal /></button>
              </header>
              <textarea className="exercise-note" placeholder="Adicionar nota para este exercício…" value={workoutExercise.notes ?? ""} onChange={(event) => onChange({ ...workout, exercises: workout.exercises.map((item) => item.id === workoutExercise.id ? { ...item, notes: event.target.value } : item) })} onBlur={async (event) => { const updatedExercise = { ...workoutExercise, notes: event.target.value }; try { setSyncState("saving"); await apiMutation({ op: "save_workout_exercise", workoutId: workout.id, exercise: updatedExercise }); setSyncState("saved"); } catch { setSyncState("error"); } }} />
              <div className="set-table">
                <div className="set-table-head"><span>SÉRIE</span><span>ANTERIOR</span><span>{data.profile.unit.toUpperCase()}</span><span>REPS</span><span><Check /></span></div>
                {workoutExercise.sets.map((set) => (
                  <div className={`set-row ${set.completed ? "completed" : ""} type-${set.type}`} key={set.id}>
                    <button className="set-number" onClick={() => cycleSetType(workoutExercise, set)} title="Alterar tipo de série">{setLabels[set.type] || set.setNumber}</button>
                    <span className="previous-set">{set.previous ? `${set.previous.weight} × ${set.previous.reps}` : "—"}</span>
                    <input inputMode="decimal" aria-label={`Carga da série ${set.setNumber}`} value={set.weight || ""} placeholder="0" onFocus={(event) => event.currentTarget.select()} onChange={(event) => updateSet(workoutExercise.id, set.id, { weight: Number(event.target.value) })} onBlur={() => { const current = workout.exercises.find((item) => item.id === workoutExercise.id)?.sets.find((item) => item.id === set.id); if (current) void persistSet(workoutExercise.id, current); }} />
                    <input inputMode="numeric" aria-label={`Repetições da série ${set.setNumber}`} value={set.reps || ""} placeholder="0" onFocus={(event) => event.currentTarget.select()} onChange={(event) => updateSet(workoutExercise.id, set.id, { reps: Number(event.target.value) })} onBlur={() => { const current = workout.exercises.find((item) => item.id === workoutExercise.id)?.sets.find((item) => item.id === set.id); if (current) void persistSet(workoutExercise.id, current); }} />
                    <button className="complete-set" onClick={() => toggleSet(workoutExercise, set)} aria-label={set.completed ? "Desmarcar série" : "Concluir série"}>{set.completed ? <Check /> : <Square />}</button>
                  </div>
                ))}
              </div>
              <button className="add-set-button" onClick={() => void addSet(workoutExercise)}><Plus /> Adicionar série</button>
            </article>
          );
        })}
      </div>

      <div className="logger-bottom-actions">
        <button className="secondary-button" onClick={onOpenLibrary}><Plus /> Adicionar exercício</button>
        <button className="primary-button" onClick={() => void finishWorkout()} disabled={finishing}><CheckCircle2 /> Finalizar treino</button>
        <button className="discard-button" onClick={() => setConfirmDiscard(true)}><Trash2 /> Descartar treino</button>
      </div>

      {confirmDiscard && <div className="confirm-overlay"><div><CircleAlert /><h2>Descartar este treino?</h2><p>As séries registradas nesta sessão serão mantidas apenas se você finalizar.</p><button className="danger-button" onClick={() => void onDiscard()}>Descartar</button><button className="ghost-button" onClick={() => setConfirmDiscard(false)}>Continuar treinando</button></div></div>}
    </main>
  );
}

function WorkoutSummary({ workout, data, onClose }: { workout: Workout; data: BootstrapData; onClose: () => void }) {
  const sets = completedSets(workout);
  const volume = workoutVolume(workout);
  const bestSet = workout.exercises.flatMap((item) => item.sets.map((set) => ({ set, exerciseId: item.exerciseId }))).filter((item) => item.set.completed).sort((a, b) => b.set.weight - a.set.weight)[0];
  return (
    <Sheet onClose={onClose} className="summary-sheet">
      <div className="summary-badge"><Trophy /><i /></div>
      <p className="eyebrow">TREINO CONCLUÍDO</p>
      <h2>{workout.name}</h2>
      <p className="summary-date">{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(workout.startedAt))}</p>
      <div className="summary-grid"><article><Dumbbell /><span>Volume</span><strong>{Math.round(volume).toLocaleString("pt-BR")}<small> kg</small></strong></article><article><CheckCircle2 /><span>Séries</span><strong>{sets.length}</strong></article><article><Clock3 /><span>Tempo</span><strong>{formatDuration(workout.durationSeconds)}</strong></article></div>
      {bestSet && <div className="best-set-card"><span>MELHOR SÉRIE</span><div><strong>{findExercise(data, bestSet.exerciseId)?.name}</strong><b>{bestSet.set.weight} kg × {bestSet.set.reps}</b></div></div>}
      <div className="summary-exercises">{workout.exercises.map((item) => { const exercise = findExercise(data, item.exerciseId); const itemSets = item.sets.filter((set) => set.completed); return <div key={item.id}><span>{item.order}</span><div><strong>{exercise?.name}</strong><small>{itemSets.length} séries · {Math.round(itemSets.reduce((sum, set) => sum + set.weight * set.reps, 0)).toLocaleString("pt-BR")} kg</small></div><Check /></div>; })}</div>
      <button className="primary-button" onClick={onClose}>Voltar ao início</button>
    </Sheet>
  );
}

function RoutineBuilder({ data, onClose, onSaved }: { data: BootstrapData; onClose: () => void; onSaved: (routine: Routine) => void }) {
  const [firstDayId] = useState(() => makeId("routine-day"));
  const [routine, setRoutine] = useState<Routine>({
    id: makeId("routine"),
    name: "",
    goal: data.profile.goal,
    daysPerWeek: 1,
    isActive: data.routines.length === 0,
    sourceTemplateId: null,
    days: [{ id: firstDayId, name: "Treino A", order: 1, exercises: [] }],
  });
  const [activeDayId, setActiveDayId] = useState(firstDayId);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeDay = routine.days.find((day) => day.id === activeDayId) ?? routine.days[0];

  function updateDay(updater: (day: RoutineDay) => RoutineDay) {
    setRoutine((current) => ({ ...current, days: current.days.map((day) => day.id === activeDayId ? updater(day) : day) }));
  }

  function addDay() {
    if (routine.days.length >= 7) return;
    const idValue = makeId("routine-day");
    const dayItem: RoutineDay = { id: idValue, name: `Treino ${String.fromCharCode(65 + routine.days.length)}`, order: routine.days.length + 1, exercises: [] };
    setRoutine({ ...routine, days: [...routine.days, dayItem], daysPerWeek: routine.days.length + 1 });
    setActiveDayId(idValue);
  }

  function addExercise(exercise: Exercise) {
    const item: RoutineExercise = {
      id: makeId("routine-exercise"),
      exerciseId: exercise.id,
      order: activeDay.exercises.length + 1,
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      restSeconds: exercise.restSeconds,
      notes: "",
    };
    updateDay((day) => ({ ...day, exercises: [...day.exercises, item] }));
    setLibraryOpen(false);
  }

  async function save() {
    const cleaned = { ...routine, name: routine.name.trim(), daysPerWeek: routine.days.length };
    setBusy(true);
    setError("");
    try {
      const result = await apiMutation({ op: "save_routine", routine: cleaned });
      onSaved((result.routine ?? cleaned) as Routine);
    } catch {
      setError("Não foi possível salvar a rotina.");
    } finally {
      setBusy(false);
    }
  }

  const valid = routine.name.trim().length >= 2 && routine.days.every((day) => day.name.trim() && day.exercises.length > 0);
  return (
    <Sheet onClose={onClose} className="builder-sheet">
      <SheetHeader eyebrow="ROTINA PERSONALIZADA" title="Criar treino" onClose={onClose} />
      <div className="builder-meta">
        <label><span>Nome da rotina</span><input value={routine.name} onChange={(event) => setRoutine({ ...routine, name: event.target.value })} placeholder="Ex.: Treino de hipertrofia" autoFocus /></label>
        <label><span>Objetivo</span><select value={routine.goal} onChange={(event) => setRoutine({ ...routine, goal: event.target.value as Goal })}>{(Object.keys(goalLabels) as Goal[]).map((goal) => <option key={goal} value={goal}>{goalLabels[goal]}</option>)}</select></label>
      </div>
      <div className="builder-day-tabs">
        {routine.days.map((day) => <button key={day.id} className={day.id === activeDayId ? "active" : ""} onClick={() => setActiveDayId(day.id)}>{day.name || `Dia ${day.order}`}</button>)}
        <button className="add-day-tab" onClick={addDay}><Plus /></button>
      </div>
      <div className="day-builder">
        <div className="day-builder-head">
          <label><span>NOME DO DIA</span><input value={activeDay.name} onChange={(event) => updateDay((day) => ({ ...day, name: event.target.value }))} /></label>
          {routine.days.length > 1 && <button className="icon-button danger-icon" onClick={() => { const remaining = routine.days.filter((day) => day.id !== activeDay.id).map((day, index) => ({ ...day, order: index + 1 })); setRoutine({ ...routine, days: remaining, daysPerWeek: remaining.length }); setActiveDayId(remaining[0].id); }}><Trash2 /></button>}
        </div>
        <div className="builder-exercises">
          {activeDay.exercises.map((item, index) => {
            const exercise = findExercise(data, item.exerciseId);
            return (
              <article key={item.id}>
                <header><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{exercise?.name}</strong><small>{exercise?.primaryMuscle}</small></div><button onClick={() => updateDay((day) => ({ ...day, exercises: day.exercises.filter((exerciseItem) => exerciseItem.id !== item.id).map((exerciseItem, exerciseIndex) => ({ ...exerciseItem, order: exerciseIndex + 1 })) }))}><X /></button></header>
                <div className="builder-set-controls">
                  <label><span>SÉRIES</span><input type="number" min={1} max={20} value={item.sets} onChange={(event) => updateDay((day) => ({ ...day, exercises: day.exercises.map((exerciseItem) => exerciseItem.id === item.id ? { ...exerciseItem, sets: Number(event.target.value) } : exerciseItem) }))} /></label>
                  <label><span>REPS MÍN.</span><input type="number" min={0} max={10000} value={item.repsMin} onChange={(event) => updateDay((day) => ({ ...day, exercises: day.exercises.map((exerciseItem) => exerciseItem.id === item.id ? { ...exerciseItem, repsMin: Number(event.target.value) } : exerciseItem) }))} /></label>
                  <label><span>REPS MÁX.</span><input type="number" min={0} max={10000} value={item.repsMax} onChange={(event) => updateDay((day) => ({ ...day, exercises: day.exercises.map((exerciseItem) => exerciseItem.id === item.id ? { ...exerciseItem, repsMax: Number(event.target.value) } : exerciseItem) }))} /></label>
                  <label><span>DESCANSO</span><input type="number" min={0} max={1800} step={15} value={item.restSeconds} onChange={(event) => updateDay((day) => ({ ...day, exercises: day.exercises.map((exerciseItem) => exerciseItem.id === item.id ? { ...exerciseItem, restSeconds: Number(event.target.value) } : exerciseItem) }))} /></label>
                </div>
              </article>
            );
          })}
          {!activeDay.exercises.length && <div className="builder-empty"><Dumbbell /><strong>Este dia está vazio</strong><span>Adicione o primeiro exercício.</span></div>}
        </div>
        <button className="secondary-button add-exercise-builder" onClick={() => setLibraryOpen(true)}><Plus /> Adicionar exercício</button>
      </div>
      <label className="active-routine-toggle"><input type="checkbox" checked={routine.isActive} onChange={(event) => setRoutine({ ...routine, isActive: event.target.checked })} /><span><i><Check /></i><div><strong>Definir como rotina ativa</strong><small>O Zym usará estes dias no próximo treino.</small></div></span></label>
      {error && <div className="form-error"><CircleAlert />{error}</div>}
      <div className="sticky-sheet-action"><button className="primary-button" disabled={!valid || busy} onClick={() => void save()}>{busy ? <LoaderCircle className="spin" /> : <Check />} Salvar rotina</button></div>
      {libraryOpen && <ExerciseLibrary exercises={data.exercises} onClose={() => setLibraryOpen(false)} onDetail={() => {}} onSelect={addExercise} />}
    </Sheet>
  );
}
