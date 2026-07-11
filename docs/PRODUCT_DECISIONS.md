# Decisões de produto — Zym 1.0

## O núcleo mantido

O valor do Hevy não está na quantidade de menus; está na velocidade do registro. Por isso, o Zym mantém visíveis durante a sessão apenas o que muda uma decisão: série anterior, carga, repetições, tipo da série, conclusão e descanso.

Também entram na primeira versão: rotinas ilimitadas, exercícios personalizados, calendário, histórico, recordes, volume, distribuição muscular e planos padrão.

## O que foi melhorado

- O treino seguinte aparece na primeira tela e começa com um toque.
- Toda mutação é salva no Supabase; o navegador guarda somente estado visual transitório.
- Um treino ativo pode ser retomado em outro aparelho.
- A biblioteca oferece demonstração local quando não há vídeo, evitando telas vazias ou dependência obrigatória de conteúdo externo.
- A IA não gera um “treino mágico”. Ela lê histórico, informa o que observou e propõe uma única próxima ação.
- O roteamento da IA pertence ao servidor e tenta três modelos em sequência, sem expor a chave OpenRouter.

## O que não entrou na 1.0

### Rede social e cópia de treinos de amigos

Exige descoberta de pessoas, relações de amizade, privacidade granular, denúncias e moderação. É uma segunda linha de produto e tiraria foco do registro confiável. A estrutura atual permite incluir compartilhamento de rotinas depois, sem reescrever os treinos.

### HealthKit, CareKit e Apple Watch

Uma PWA não recebe as APIs nativas necessárias para uma integração HealthKit completa nem oferece um aplicativo real de Apple Watch. Prometer isso em um site instalado seria enganoso. O Zym 1.0 assume com clareza o limite; uma versão nativa pode reutilizar o mesmo Supabase no futuro.

### Funcionamento offline com edição

Salvar treino offline exigiria uma fila local — exatamente o tipo de dado autoritativo no navegador que o projeto deve evitar. O service worker guarda apenas ícones e a tela de indisponibilidade; nunca guarda respostas de API ou histórico privado.

### Calorias, passos e frequência cardíaca

Sem um sensor confiável, esses números seriam estimativas decorativas. A tela de progresso usa apenas o que o Zym mede de fato: exercícios, séries, repetições, carga, duração e frequência.

## Próximas extensões coerentes

1. compartilhamento por link somente de rotinas escolhidas;
2. exportação CSV/PDF e portabilidade de dados;
3. upload de vídeos para Supabase Storage;
4. versão nativa iOS/Watch usando o mesmo backend;
5. acesso opcional para treinador acompanhar alunos.
