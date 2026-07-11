export type AppMode = "demo" | "connected";

export type Goal = "hipertrofia" | "forca" | "condicionamento" | "saude";

export type ExperienceLevel = "iniciante" | "intermediario" | "avancado";

export type SetType = "warmup" | "normal" | "drop" | "failure" | "superset";

export type DemoType =
  | "press"
  | "pull"
  | "squat"
  | "hinge"
  | "lunge"
  | "curl"
  | "extension"
  | "raise"
  | "core";

export interface UserSummary {
  id: string;
  email: string;
  name: string;
}

export interface Profile {
  id: string;
  name: string;
  goal: Goal;
  level: ExperienceLevel;
  daysPerWeek: number;
  unit: "kg" | "lb";
  defaultRestSeconds: number;
  onboardingComplete: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  slug: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  instructions: string[];
  tips: string[];
  demoType: DemoType;
  restSeconds: number;
  videoUrl?: string | null;
  ownerId?: string | null;
  isCustom?: boolean;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  order: number;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  notes?: string;
}

export interface RoutineDay {
  id: string;
  name: string;
  order: number;
  exercises: RoutineExercise[];
}

export interface RoutineTemplate {
  id: string;
  name: string;
  slug: string;
  level: ExperienceLevel;
  goal: Goal;
  daysPerWeek: number;
  durationWeeks: number;
  sessionMinutes: number;
  description: string;
  tags: string[];
  days: RoutineDay[];
}

export interface Routine {
  id: string;
  name: string;
  goal: Goal;
  daysPerWeek: number;
  isActive: boolean;
  sourceTemplateId?: string | null;
  days: RoutineDay[];
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  type: SetType;
  weight: number;
  reps: number;
  rpe?: number | null;
  completed: boolean;
  completedAt?: string | null;
  previous?: {
    weight: number;
    reps: number;
  } | null;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  order: number;
  notes?: string;
  restSeconds: number;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  name: string;
  routineId?: string | null;
  routineDayId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  status: "active" | "completed" | "discarded";
  notes?: string;
  exercises: WorkoutExercise[];
}

export interface ScheduleItem {
  id: string;
  date: string;
  routineDayId?: string | null;
  name: string;
  completed: boolean;
}

export interface BootstrapData {
  mode: AppMode;
  user: UserSummary;
  profile: Profile;
  exercises: Exercise[];
  templates: RoutineTemplate[];
  routines: Routine[];
  workouts: Workout[];
  schedule: ScheduleItem[];
  activeWorkout?: Workout | null;
}

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  model?: string;
}

export interface ActiveWorkoutDraft {
  id: string;
  name: string;
  routineId?: string | null;
  routineDayId?: string | null;
  startedAt: string;
  durationSeconds: number;
  exercises: WorkoutExercise[];
}
