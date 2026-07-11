import { NextResponse } from "next/server";
import { getDemoBootstrap } from "@/lib/demo-data";
import {
  mapExercise,
  mapProfile,
  mapRoutine,
  mapSchedule,
  mapTemplate,
  mapWorkout,
} from "@/lib/supabase/mappers";
import { hasSupabaseConfig, requireSupabaseUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const workoutSelection = `
  *,
  workout_exercises (
    *,
    workout_sets (*)
  )
`;

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(getDemoBootstrap(), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { supabase, user, error: authError } = await requireSupabaseUser();

  if (authError || !supabase || !user) {
    return NextResponse.json(
      { error: "unauthorized", configured: true },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const [
    profileResult,
    exercisesResult,
    templatesResult,
    routinesResult,
    workoutsResult,
    activeWorkoutResult,
    scheduleResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("exercises")
      .select("*")
      .or(`owner_id.is.null,owner_id.eq.${user.id}`)
      .order("name"),
    supabase
      .from("routine_templates")
      .select(`
        *,
        template_days (
          *,
          template_exercises (*)
        )
      `)
      .eq("is_published", true)
      .order("days_per_week"),
    supabase
      .from("routines")
      .select(`
        *,
        routine_days (
          *,
          routine_exercises (*)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("workouts")
      .select(workoutSelection)
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(30),
    supabase
      .from("workouts")
      .select(workoutSelection)
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("scheduled_workouts")
      .select("*")
      .eq("user_id", user.id)
      .gte("scheduled_for", new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10))
      .order("scheduled_for")
      .limit(30),
  ]);

  const firstError = [
    profileResult.error,
    exercisesResult.error,
    templatesResult.error,
    routinesResult.error,
    workoutsResult.error,
    activeWorkoutResult.error,
    scheduleResult.error,
  ].find(Boolean);

  if (firstError) {
    return NextResponse.json(
      { error: "bootstrap_failed", detail: firstError.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const emailName = user.email?.split("@")[0] ?? "Atleta";
  const name =
    (user.user_metadata?.name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    emailName;

  return NextResponse.json(
    {
      mode: "connected",
      user: { id: user.id, email: user.email ?? "", name },
      profile: mapProfile(profileResult.data, user.id, name),
      exercises: (exercisesResult.data ?? []).map(mapExercise),
      templates: (templatesResult.data ?? []).map(mapTemplate),
      routines: (routinesResult.data ?? []).map(mapRoutine),
      workouts: (workoutsResult.data ?? []).map(mapWorkout),
      activeWorkout: activeWorkoutResult.data ? mapWorkout(activeWorkoutResult.data) : null,
      schedule: (scheduleResult.data ?? []).map(mapSchedule),
    },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
