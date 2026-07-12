import { NextResponse } from "next/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { hasSupabaseConfig, requireSupabaseUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const requestSchema = z.object({
  message: z.string().trim().min(2).max(2000),
  context: z.record(z.string(), z.unknown()).optional().default({}),
});

const coachInstructions = `Você é o Zym Coach, um copiloto de treino de força em português do Brasil.
Seu papel é transformar o histórico real fornecido em uma próxima ação simples, prudente e mensurável.

Regras:
- Seja direto, específico e breve. Use no máximo 180 palavras.
- Nunca invente pesos, repetições, lesões ou dados ausentes.
- Diferencie dado observado de sugestão.
- Priorize consistência, técnica, recuperação e progressão gradual.
- Não diagnostique nem substitua médico, fisioterapeuta ou profissional de educação física.
- Se houver dor aguda, tontura, falta de ar incomum ou relato de lesão, recomende interromper e buscar avaliação profissional.
- Não proponha progressão quando o histórico mostrar RPE alto, queda de repetições ou recuperação ruim.
- Termine com uma única ação chamada "Próximo passo".
- Use formatação Markdown simples, sem tabelas.`;

const defaultModels = [
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "google/gemma-4-31b-it:free",
];

function configuredModels() {
  const configured = [
    process.env.OPENROUTER_MODEL_PRIMARY,
    process.env.OPENROUTER_MODEL_FALLBACK_1,
    process.env.OPENROUTER_MODEL_FALLBACK_2,
  ].filter((model): model is string => Boolean(model?.trim()));

  return configured.length > 0 ? Array.from(new Set(configured)) : defaultModels;
}

function demoAnswer(message: string, context: Record<string, unknown>) {
  const lower = message.toLowerCase();
  const volume = Number(context.weeklyVolume ?? 0);
  const sessions = Number(context.weeklySessions ?? 0);

  if (lower.includes("tempo") || lower.includes("rápido") || lower.includes("30 min")) {
    return `**Hoje, corte volume — não qualidade.**\n\nFaça os três primeiros exercícios do treino, mantenha as séries principais e retire apenas os acessórios. Use o descanso programado; encurtá-lo demais costuma reduzir a qualidade das séries seguintes.${sessions ? ` Você já registrou ${sessions} treino${sessions === 1 ? "" : "s"} nesta semana.` : ""}\n\n**Próximo passo:** comece o treino e marque como concluídas somente séries executadas com técnica estável.`;
  }

  if (lower.includes("aument") || lower.includes("carga") || lower.includes("progred")) {
    return `**A progressão mais segura vem das repetições, não da pressa.**\n\nSe você completou o topo da faixa de repetições em todas as séries e terminou com 2–3 repetições em reserva, aumente a menor fração disponível na próxima sessão. Se a última série já chegou perto da falha, repita a carga e tente melhorar uma repetição.${volume ? ` Seu volume registrado na semana é de ${Math.round(volume).toLocaleString("pt-BR")} kg.` : ""}\n\n**Próximo passo:** compare a primeira série de hoje com a última execução antes de decidir a carga.`;
  }

  return `**O dado mais útil agora é a qualidade da próxima série.**\n\nMantenha a faixa de repetições do plano, registre carga e esforço percebido e só progrida quando todas as séries estiverem consistentes. O Zym usará esses registros para sugerir a próxima sessão sem adivinhar.${sessions ? ` Você já fez ${sessions} treino${sessions === 1 ? "" : "s"} nesta semana.` : ""}\n\n**Próximo passo:** escolha o treino planejado e use o desempenho anterior como referência, não como obrigação.`;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
  }

  const serializedContext = JSON.stringify(parsed.data.context);
  if (serializedContext.length > 24_000) {
    return NextResponse.json({ error: "Contexto muito grande." }, { status: 413 });
  }

  let supabase: Awaited<ReturnType<typeof requireSupabaseUser>>["supabase"] = null;
  let user: Awaited<ReturnType<typeof requireSupabaseUser>>["user"] = null;

  if (hasSupabaseConfig()) {
    const auth = await requireSupabaseUser();
    if (auth.error || !auth.user || !auth.supabase) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    supabase = auth.supabase;
    user = auth.user;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const models = configuredModels();

  if (!apiKey) {
    if (hasSupabaseConfig()) {
      return NextResponse.json(
        {
          error: "A chave da IA não está disponível nesta publicação. Confirme OPENROUTER_API_KEY no ambiente Production da Vercel e faça um novo deploy.",
          configuration: { hasApiKey: false, models: models.length },
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      answer: demoAnswer(parsed.data.message, parsed.data.context),
      model: "zym-demo",
      fallbackIndex: 0,
    });
  }

  const openrouter = createOpenRouter({
    apiKey,
    appName: "Zym",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://zym.app",
  });

  const prompt = `Pergunta do usuário:\n${parsed.data.message}\n\nContexto de treino (JSON confiável do aplicativo):\n${serializedContext}`;
  let lastError: unknown = null;

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    try {
      const result = await generateText({
        model: openrouter(model),
        instructions: coachInstructions,
        prompt,
        temperature: 0.25,
        maxOutputTokens: 420,
        maxRetries: 0,
        timeout: 12_000,
      });

      const answer = result.text.trim();
      if (!answer) throw new Error("empty_response");

      if (supabase && user) {
        await supabase.from("ai_messages").insert([
          {
            user_id: user.id,
            role: "user",
            content: parsed.data.message,
            context: parsed.data.context,
          },
          {
            user_id: user.id,
            role: "assistant",
            content: answer,
            model,
            context: { fallback_index: index },
          },
        ]);
      }

      return NextResponse.json({ answer, model, fallbackIndex: index });
    } catch (error) {
      lastError = error;
    }
  }

  console.error("Zym AI routing exhausted", lastError);
  return NextResponse.json(
    { error: "Os modelos de IA não responderam. Tente novamente em instantes." },
    { status: 503 },
  );
}
