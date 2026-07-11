import { NextResponse } from "next/server";
import { z } from "zod";
import { mapExercise, mapRoutine } from "@/lib/supabase/mappers";
import { hasSupabaseConfig, requireSupabaseUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const id = z.string().min(1).max(100);
const setType = z.enum(["warmup", "normal", "drop", "failure", "superset"]);

const workoutSetSchema = z.object({
  id,
  setNumber: z.number().int().min(1).max(30),
  type: setType,
  weight: z.number().min(0).max(5000),
  reps: z.number().int().min(0).max(10000),
  rpe: z.number().min(1).max(10).nullable().optional(),
  completed: z.boolean(),
  completedAt: z.string().nullable().optional(),
  previous: z
    .object({ weight: z.number().min(0), reps: z.number().int().min(0) })
    .nullable()
    .optional(),
});

const workoutExerciseSchema = z.object({
  id,
  exerciseId: id,
  order: z.number().int().min(0).max(100),
  notes: z.string().max(1000).optional().default(""),
  restSeconds: z.number().int().min(0).max(1800),
  sets: z.array(workoutSetSchema).min(1).max(30),
});

const routineExerciseSchema = z.object({
  id,
  exerciseId: id,
  order: z.number().int().min(0).max(100),
  sets: z.number().int().min(1).max(30),
  repsMin: z.number().int().min(0).max(10000),
  repsMax: z.number().int().min(0).max(10000),
  restSeconds: z.number().int().min(0).max(1800),
  notes: z.string().max(1000).optional().default(""),
});

const mutationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("save_profile"),
    profile: z.object({
      name: z.string().trim().min(2).max(80),
      goal: z.enum(["hipertrofia", "forca", "condicionamento", "saude"]),
      level: z.enum(["iniciante", "intermediario", "avancado"]),
      daysPerWeek: z.number().int().min(1).max(7),
      unit: z.enum(["kg", "lb"]),
      defaultRestSeconds: z.number().int().min(15).max(600),
      onboardingComplete: z.boolean(),
    }),
  }),
  z.object({
    op: z.literal("start_workout"),
    workout: z.object({
      id,
      name: z.string().trim().min(1).max(120),
      routineId: id.nullable().optional(),
      routineDayId: id.nullable().optional(),
      startedAt: z.string(),
      exercises: z.array(workoutExerciseSchema).min(1).max(40),
    }),
  }),
  z.object({
    op: z.literal("save_set"),
    workoutId: id,
    workoutExerciseId: id,
    set: workoutSetSchema,
  }),
  z.object({
    op: z.literal("save_workout_exercise"),
    workoutId: id,
    exercise: workoutExerciseSchema,
  }),
  z.object({
    op: z.literal("finish_workout"),
    workoutId: id,
    durationSeconds: z.number().int().min(0).max(172800),
    notes: z.string().max(2000).optional().default(""),
  }),
  z.object({ op: z.literal("discard_workout"), workoutId: id }),
  z.object({
    op: z.literal("save_routine"),
    routine: z.object({
      id,
      name: z.string().trim().min(2).max(120),
      goal: z.enum(["hipertrofia", "forca", "condicionamento", "saude"]),
      daysPerWeek: z.number().int().min(1).max(7),
      isActive: z.boolean(),
      sourceTemplateId: id.nullable().optional(),
      days: z
        .array(
          z.object({
            id,
            name: z.string().trim().min(1).max(80),
            order: z.number().int().min(0).max(20),
            exercises: z.array(routineExerciseSchema).min(1).max(40),
          }),
        )
        .min(1)
        .max(7),
    }),
  }),
  z.object({
    op: z.literal("schedule"),
    item: z.object({
      id,
      date: z.string(),
      routineDayId: id.nullable().optional(),
      name: z.string().trim().min(1).max(120),
      completed: z.boolean(),
    }),
  }),
  z.object({
    op: z.literal("create_exercise"),
    exercise: z.object({
      id,
      name: z.string().trim().min(2).max(120),
      slug: z.string().trim().min(2).max(140),
      primaryMuscle: z.string().trim().min(2).max(80),
      secondaryMuscles: z.array(z.string().max(80)).max(12),
      equipment: z.string().trim().min(2).max(80),
      instructions: z.array(z.string().max(400)).min(1).max(10),
      tips: z.array(z.string().max(400)).max(10),
      demoType: z.enum(["press", "pull", "squat", "hinge", "lunge", "curl", "extension", "raise", "core"]),
      restSeconds: z.number().int().min(0).max(1800),
      videoUrl: z.string().url().nullable().optional(),
    }),
  }),
]);

function setRow(workoutExerciseId: string, set: z.infer<typeof workoutSetSchema>) {
  return {
    id: set.id,
    workout_exercise_id: workoutExerciseId,
    set_number: set.setNumber,
    set_type: set.type,
    weight: set.weight,
    reps: set.reps,
    rpe: set.rpe ?? null,
    completed: set.completed,
    completed_at: set.completed ? set.completedAt ?? new Date().toISOString() : null,
    previous: set.previous ?? null,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = mutationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "mutation_invalid", fields: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  const { supabase, user, error: authError } = await requireSupabaseUser();
  if (authError || !supabase || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = parsed.data;

  if (payload.op === "save_profile") {
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      name: payload.profile.name,
      goal: payload.profile.goal,
      level: payload.profile.level,
      days_per_week: payload.profile.daysPerWeek,
      unit: payload.profile.unit,
      default_rest_seconds: payload.profile.defaultRestSeconds,
      onboarding_complete: payload.profile.onboardingComplete,
      updated_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (payload.op === "start_workout") {
    const workout = payload.workout;
    const { error: workoutError } = await supabase.from("workouts").insert({
      id: workout.id,
      user_id: user.id,
      routine_id: workout.routineId ?? null,
      routine_day_id: workout.routineDayId ?? null,
      name: workout.name,
      started_at: workout.startedAt,
      status: "active",
      duration_seconds: 0,
    });

    if (workoutError) return NextResponse.json({ error: workoutError.message }, { status: 500 });

    const exerciseRows = workout.exercises.map((exercise) => ({
      id: exercise.id,
      workout_id: workout.id,
      exercise_id: exercise.exerciseId,
      position: exercise.order,
      notes: exercise.notes,
      rest_seconds: exercise.restSeconds,
    }));

    const { error: exerciseError } = await supabase.from("workout_exercises").insert(exerciseRows);
    if (exerciseError) {
      await supabase.from("workouts").delete().eq("id", workout.id);
      return NextResponse.json({ error: exerciseError.message }, { status: 500 });
    }

    const setRows = workout.exercises.flatMap((exercise) =>
      exercise.sets.map((set) => setRow(exercise.id, set)),
    );
    const { error: setsError } = await supabase.from("workout_sets").insert(setRows);
    if (setsError) {
      await supabase.from("workouts").delete().eq("id", workout.id);
      return NextResponse.json({ error: setsError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, workoutId: workout.id });
  }

  if (payload.op === "save_set") {
    const { error } = await supabase
      .from("workout_sets")
      .upsert(setRow(payload.workoutExerciseId, payload.set));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (payload.op === "save_workout_exercise") {
    const exercise = payload.exercise;
    const { error: exerciseError } = await supabase.from("workout_exercises").upsert({
      id: exercise.id,
      workout_id: payload.workoutId,
      exercise_id: exercise.exerciseId,
      position: exercise.order,
      notes: exercise.notes,
      rest_seconds: exercise.restSeconds,
    });
    if (exerciseError) return NextResponse.json({ error: exerciseError.message }, { status: 500 });
    const { error: setError } = await supabase
      .from("workout_sets")
      .upsert(exercise.sets.map((set) => setRow(exercise.id, set)));
    if (setError) return NextResponse.json({ error: setError.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (payload.op === "finish_workout") {
    const { error } = await supabase
      .from("workouts")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        duration_seconds: payload.durationSeconds,
        notes: payload.notes,
      })
      .eq("id", payload.workoutId)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (payload.op === "discard_workout") {
    const { error } = await supabase
      .from("workouts")
      .update({ status: "discarded", ended_at: new Date().toISOString() })
      .eq("id", payload.workoutId)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (payload.op === "save_routine") {
    const routine = payload.routine;
    if (routine.isActive) {
      await supabase.from("routines").update({ is_active: false }).eq("user_id", user.id);
    }
    const { error: routineError } = await supabase.from("routines").upsert({
      id: routine.id,
      user_id: user.id,
      name: routine.name,
      goal: routine.goal,
      days_per_week: routine.daysPerWeek,
      is_active: routine.isActive,
      source_template_id: routine.sourceTemplateId ?? null,
      updated_at: new Date().toISOString(),
    });
    if (routineError) return NextResponse.json({ error: routineError.message }, { status: 500 });

    const { error: deleteError } = await supabase.from("routine_days").delete().eq("routine_id", routine.id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    const dayRows = routine.days.map((day) => ({
      id: day.id,
      routine_id: routine.id,
      name: day.name,
      position: day.order,
    }));
    const { error: dayError } = await supabase.from("routine_days").insert(dayRows);
    if (dayError) return NextResponse.json({ error: dayError.message }, { status: 500 });

    const exerciseRows = routine.days.flatMap((day) =>
      day.exercises.map((exercise) => ({
        id: exercise.id,
        routine_day_id: day.id,
        exercise_id: exercise.exerciseId,
        position: exercise.order,
        sets: exercise.sets,
        reps_min: exercise.repsMin,
        reps_max: exercise.repsMax,
        rest_seconds: exercise.restSeconds,
        notes: exercise.notes,
      })),
    );
    const { error: exerciseError } = await supabase.from("routine_exercises").insert(exerciseRows);
    if (exerciseError) return NextResponse.json({ error: exerciseError.message }, { status: 500 });

    const { data, error: fetchError } = await supabase
      .from("routines")
      .select(`*, routine_days (*, routine_exercises (*))`)
      .eq("id", routine.id)
      .single();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    return NextResponse.json({ ok: true, routine: mapRoutine(data) });
  }

  if (payload.op === "schedule") {
    const { error } = await supabase.from("scheduled_workouts").upsert({
      id: payload.item.id,
      user_id: user.id,
      scheduled_for: payload.item.date,
      routine_day_id: payload.item.routineDayId ?? null,
      name: payload.item.name,
      completed: payload.item.completed,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const exercise = payload.exercise;
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      id: exercise.id,
      owner_id: user.id,
      name: exercise.name,
      slug: `${exercise.slug}-${user.id.slice(0, 8)}`,
      primary_muscle: exercise.primaryMuscle,
      secondary_muscles: exercise.secondaryMuscles,
      equipment: exercise.equipment,
      instructions: exercise.instructions,
      tips: exercise.tips,
      demo_type: exercise.demoType,
      rest_seconds: exercise.restSeconds,
      video_url: exercise.videoUrl ?? null,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, exercise: mapExercise(data) });
}
