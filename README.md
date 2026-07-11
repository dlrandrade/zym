# Zym

PWA de treino em português, inspirada na eficiência de registro do Hevy e construída com identidade própria em preto e verde-limão.

## O que já está pronto

- autenticação por e-mail e senha com sessão em cookies; nenhum treino usa `localStorage` como fonte de verdade;
- Supabase com Row Level Security para isolar todos os dados por usuário;
- registro de treino com carga, repetições, séries anteriores, aquecimento, drop-set, falha e supersérie;
- cronômetro automático de descanso por exercício;
- retomada de treino ativo em outro aparelho;
- biblioteca inicial com 24 exercícios, demonstrações animadas, instruções e pontos de atenção;
- criação de exercícios personalizados com vídeo opcional;
- três planos configurados: Base 3x, Superior/Inferior 4x e Push/Pull/Legs 5x;
- criação de rotinas próprias com vários dias;
- gráficos de volume, distribuição muscular, recordes e histórico;
- Zym Coach com contexto real dos últimos treinos e fallback sequencial entre três modelos OpenRouter;
- PWA com manifest, service worker seguro, ícones 180/192/512, ícone maskable e áreas seguras do iPhone;
- modo de demonstração automático quando o Supabase ainda não foi conectado.

## Stack

- Next.js 16 / React 19 / TypeScript
- Supabase Auth + Postgres + RLS
- Vercel AI SDK + provider OpenRouter
- Recharts e Lucide
- Vercel para publicação

## Configuração do banco

1. Crie um projeto no Supabase.
2. No SQL Editor, execute `supabase/schema.sql`.
3. Depois execute `supabase/seed.sql`.
4. Em Authentication > URL Configuration, configure o domínio final e os redirects permitidos.
5. Copie `.env.example` para `.env.local` e preencha URL e anon key.

O projeto não utiliza `SUPABASE_SERVICE_ROLE_KEY`. Todas as operações respeitam a sessão do usuário e as políticas RLS.

## Configuração do Zym Coach

Preencha a chave OpenRouter e os três IDs de modelo. A rota tenta o modelo primário por 12 segundos e, em caso de erro ou ausência de resposta, avança para cada fallback. A chave existe apenas no servidor.

```env
OPENROUTER_API_KEY=...
OPENROUTER_MODEL_PRIMARY=provider/modelo-1
OPENROUTER_MODEL_FALLBACK_1=provider/modelo-2
OPENROUTER_MODEL_FALLBACK_2=provider/modelo-3
```

O Coach recebe somente um resumo estruturado do perfil e dos cinco treinos recentes. As mensagens ficam vinculadas ao usuário no Supabase.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Publicação na Vercel

1. Importe o repositório no painel da Vercel.
2. Cadastre as variáveis de `.env.example` nos ambientes desejados.
3. Publique. O `vercel.json` garante o cabeçalho correto do service worker e headers de segurança.

No iPhone, abra o endereço no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.

## Decisões de escopo

As decisões sobre o que entrou, saiu e foi adaptado do produto de referência estão documentadas em `docs/PRODUCT_DECISIONS.md`.
