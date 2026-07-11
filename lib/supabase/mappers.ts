import type {
  Exercise,
  Profile,
  Routine,
  RoutineDay,
  RoutineExercise,
  RoutineTemplate,
  ScheduleItem,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "@/lib/types";

type Row = Record<string, unknown>;

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function mapProfile(row: Row | null, userId: string, fallbackName: string): Profile {
  return {
    id: String(row?.id ?? userId),
    name: String(row?.name ?? fallbackName),
    goal: (row?.goal as Profile["goal"]) ?? "hipertrofia",
    level: (row?.level as Profile["level"]) ?? "iniciante",
    daysPerWeek: asNumber(row?.days_per_week, 3),
    unit: (row?.unit as Profile["unit"]) ?? "kg",
    defaultRestSeconds: asNumber(row?.default_rest_seconds, 90),
    onboardingComplete: Boolean(row?.onboarding_complete),
  };
}

export function mapExercise(row: Row): Exercise {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    primaryMuscle: String(row.primary_muscle),
    secondaryMuscles: asStrings(row.secondary_muscles),
    equipment: String(row.equipment),
    instructions: asStrings(row.instructions),
    tips: asStrings(row.tips),
    demoType: (row.demo_type as Exercise["demoType"]) ?? "press",
    restSeconds: asNumber(row.rest_seconds, 90),
    videoUrl: row.video_url ? String(row.video_url) : null,
    ownerId: row.owner_id ? String(row.owner_id) : null,
    isCustom: Boolean(row.owner_id),
  };
}

function mapRoutineExercise(row: Row): RoutineExercise {
  return {
    id: String(row.id),
    exerciseId: String(row.exercise_id),
    order: asNumber(row.position, 0),
    sets: asNumber(row.sets, 3),
    repsMin: asNumber(row.reps_min, 8),
    repsMax: asNumber(row.reps_max, 12),
    restSeconds: asNumber(row.rest_seconds, 90),
    notes: row.notes ? String(row.notes) : "",
  };
}

function mapRoutineDay(row: Row, exerciseKey: string): RoutineDay {
  return {
    id: String(row.id),
    name: String(row.name),
    order: asNumber(row.position, 0),
    exercises: asRows(row[exerciseKey]).map(mapRoutineExercise).sort((a, b) => a.order - b.order),
  };
}

export function mapTemplate(row: Row): RoutineTemplate {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    level: (row.level as RoutineTemplate["level"]) ?? "iniciante",
    goal: (row.goal as RoutineTemplate["goal"]) ?? "hipertrofia",
    daysPerWeek: asNumber(row.days_per_week, 3),
    durationWeeks: asNumber(row.duration_weeks, 8),
    sessionMinutes: asNumber(row.session_minutes, 50),
    description: String(row.description ?? ""),
    tags: asStrings(row.tags),
    days: asRows(row.template_days)
      .map((dayRow) => mapRoutineDay(dayRow, "template_exercises"))
      .sort((a, b) => a.order - b.order),
  };
}

export function mapRoutine(row: Row): Routine {
  return {
    id: String(row.id),
    name: String(row.name),
    goal: (row.goal as Routine["goal"]) ?? "hipertrofia",
    daysPerWeek: asNumber(row.days_per_week, 3),
    isActive: Boolean(row.is_active),
    sourceTemplateId: row.source_template_id ? String(row.source_template_id) : null,
    days: asRows(row.routine_days)
      .map((dayRow) => mapRoutineDay(dayRow, "routine_exercises"))
      .sort((a, b) => a.order - b.order),
  };
}

function mapWorkoutSet(row: Row): WorkoutSet {
  const previous = row.previous && typeof row.previous === "object" ? (row.previous as Row) : null;
  return {
    id: String(row.id),
    setNumber: asNumber(row.set_number, 1),
    type: (row.set_type as WorkoutSet["type"]) ?? "normal",
    weight: asNumber(row.weight, 0),
    reps: asNumber(row.reps, 0),
    rpe: row.rpe == null ? null : asNumber(row.rpe),
    completed: Boolean(row.completed),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    previous: previous
      ? { weight: asNumber(previous.weight, 0), reps: asNumber(previous.reps, 0) }
      : null,
  };
}

function mapWorkoutExercise(row: Row): WorkoutExercise {
  return {
    id: String(row.id),
    exerciseId: String(row.exercise_id),
    order: asNumber(row.position, 0),
    notes: row.notes ? String(row.notes) : "",
    restSeconds: asNumber(row.rest_seconds, 90),
    sets: asRows(row.workout_sets).map(mapWorkoutSet).sort((a, b) => a.setNumber - b.setNumber),
  };
}

export function mapWorkout(row: Row): Workout {
  return {
    id: String(row.id),
    name: String(row.name),
    routineId: row.routine_id ? String(row.routine_id) : null,
    routineDayId: row.routine_day_id ? String(row.routine_day_id) : null,
    startedAt: String(row.started_at),
    endedAt: row.ended_at ? String(row.ended_at) : null,
    durationSeconds: asNumber(row.duration_seconds, 0),
    status: (row.status as Workout["status"]) ?? "completed",
    notes: row.notes ? String(row.notes) : "",
    exercises: asRows(row.workout_exercises)
      .map(mapWorkoutExercise)
      .sort((a, b) => a.order - b.order),
  };
}

export function mapSchedule(row: Row): ScheduleItem {
  return {
    id: String(row.id),
    date: String(row.scheduled_for),
    routineDayId: row.routine_day_id ? String(row.routine_day_id) : null,
    name: String(row.name),
    completed: Boolean(row.completed),
  };
}
