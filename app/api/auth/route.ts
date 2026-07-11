import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer, hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("login"),
    email: z.email(),
    password: z.string().min(6),
  }),
  z.object({
    action: z.literal("signup"),
    name: z.string().trim().min(2).max(80),
    email: z.email(),
    password: z.string().min(8).max(100),
  }),
  z.object({ action: z.literal("logout") }),
]);

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fields: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }

  if (parsed.data.action === "logout") {
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "login") {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 },
      );
    }

    return NextResponse.json({ ok: true, userId: data.user.id });
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
      emailRedirectTo: new URL("/api/auth/callback", request.url).toString(),
    },
  });

  if (error) {
    const message = error.message.toLowerCase().includes("already")
      ? "Já existe uma conta com este e-mail."
      : "Não foi possível criar a conta agora.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    userId: data.user?.id,
    needsEmailConfirmation: !data.session,
  });
}
