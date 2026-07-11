import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const destination = new URL("/", request.url);

  if (code) {
    const supabase = await getSupabaseServer();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        destination.searchParams.set("confirmed", "1");
        return NextResponse.redirect(destination);
      }
    }
  }

  destination.searchParams.set("authError", "confirmation");
  return NextResponse.redirect(destination);
}
