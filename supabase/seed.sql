-- Zym catalog and default plans
-- Run after schema.sql.

begin;

insert into public.exercises
  (id, owner_id, slug, name, primary_muscle, secondary_muscles, equipment, instructions, tips, demo_type, rest_seconds)
values
  ('10000000-0000-4000-8000-000000000001', null, 'agachamento-livre', 'Agachamento livre', 'Quadríceps', array['Glúteos','Posterior','Core'], 'Barra', array['Apoie a barra sobre a parte alta das costas e firme o tronco.','Desça com joelhos acompanhando a direção dos pés.','Empurre o chão e volte sem perder a posição da coluna.'], array['Mantenha o pé inteiro apoiado.','Use uma amplitude que preserve controle e postura.'], 'squat', 120),
  ('10000000-0000-4000-8000-000000000002', null, 'supino-reto-barra', 'Supino reto com barra', 'Peitoral', array['Tríceps','Ombros'], 'Barra', array['Fixe escápulas e pés antes de retirar a barra.','Desça a barra com controle até a linha média do peito.','Empurre para cima mantendo punhos alinhados.'], array['Não solte os ombros do banco.','Peça ajuda quando treinar perto da falha.'], 'press', 120),
  ('10000000-0000-4000-8000-000000000003', null, 'remada-curvada-barra', 'Remada curvada com barra', 'Costas', array['Bíceps','Posterior','Core'], 'Barra', array['Incline o tronco com a coluna neutra e joelhos destravados.','Puxe a barra em direção ao abdômen.','Desça até estender os braços sem perder a posição.'], array['Pense em levar os cotovelos para trás.','Evite transformar a repetição em um balanço.'], 'pull', 105),
  ('10000000-0000-4000-8000-000000000004', null, 'desenvolvimento-halteres', 'Desenvolvimento com halteres', 'Ombros', array['Tríceps'], 'Halteres', array['Comece com halteres na altura dos ombros.','Empurre acima da cabeça sem arquear excessivamente a lombar.','Retorne devagar até a posição inicial.'], array['Contraia abdômen e glúteos.','Pare antes de perder o alinhamento dos punhos.'], 'press', 90),
  ('10000000-0000-4000-8000-000000000005', null, 'terra-romeno', 'Levantamento terra romeno', 'Posterior', array['Glúteos','Lombar'], 'Barra', array['Segure a barra próxima às coxas e destrave os joelhos.','Leve o quadril para trás mantendo a barra perto das pernas.','Volte estendendo o quadril, sem hiperestender a coluna.'], array['Procure tensão no posterior, não a maior amplitude possível.','Mantenha o pescoço neutro.'], 'hinge', 120),
  ('10000000-0000-4000-8000-000000000006', null, 'puxada-alta', 'Puxada alta', 'Costas', array['Bíceps'], 'Polia', array['Segure a barra um pouco além da largura dos ombros.','Puxe em direção ao alto do peito, levando cotovelos para baixo.','Retorne com controle até alongar as costas.'], array['Evite jogar o tronco para trás.','Inicie o movimento deprimindo as escápulas.'], 'pull', 90),
  ('10000000-0000-4000-8000-000000000007', null, 'afundo-halteres', 'Afundo com halteres', 'Quadríceps', array['Glúteos','Posterior'], 'Halteres', array['Dê um passo confortável e estabilize os pés.','Desça o joelho de trás em direção ao chão.','Suba pressionando o pé da frente.'], array['Mantenha o joelho da frente alinhado ao pé.','Comece sem carga se o equilíbrio limitar o movimento.'], 'lunge', 90),
  ('10000000-0000-4000-8000-000000000008', null, 'rosca-direta', 'Rosca direta', 'Bíceps', array['Antebraços'], 'Barra', array['Mantenha cotovelos próximos ao corpo.','Flexione os braços sem deslocar os ombros à frente.','Desça a barra devagar até quase estender os cotovelos.'], array['Use uma carga que não exija balanço.','Controle a descida por completo.'], 'curl', 75),
  ('10000000-0000-4000-8000-000000000009', null, 'triceps-polia', 'Tríceps na polia', 'Tríceps', '{}', 'Polia', array['Trave os cotovelos ao lado do tronco.','Estenda os braços até contrair o tríceps.','Retorne sem deixar os cotovelos avançarem.'], array['Mantenha os ombros baixos.','Não use o peso do corpo para empurrar.'], 'extension', 75),
  ('10000000-0000-4000-8000-000000000010', null, 'leg-press-45', 'Leg press 45°', 'Quadríceps', array['Glúteos','Posterior'], 'Máquina', array['Posicione os pés na plataforma e apoie toda a lombar.','Desça a plataforma até a amplitude controlada.','Empurre sem travar os joelhos com impacto.'], array['Não deixe o quadril enrolar no fim da descida.','Mantenha joelhos acompanhando os pés.'], 'squat', 105),
  ('10000000-0000-4000-8000-000000000011', null, 'supino-inclinado-halteres', 'Supino inclinado com halteres', 'Peitoral', array['Ombros','Tríceps'], 'Halteres', array['Ajuste o banco em uma inclinação moderada.','Desça os halteres ao lado do peito com controle.','Empurre para cima sem bater os halteres.'], array['Mantenha escápulas apoiadas.','Evite inclinação excessiva do banco.'], 'press', 105),
  ('10000000-0000-4000-8000-000000000012', null, 'remada-baixa', 'Remada baixa', 'Costas', array['Bíceps'], 'Polia', array['Sente com tronco firme e braços estendidos.','Puxe o cabo até o abdômen, aproximando as escápulas.','Retorne sem arredondar a coluna.'], array['Não transforme o movimento em extensão de tronco.','Segure um instante na contração.'], 'pull', 90),
  ('10000000-0000-4000-8000-000000000013', null, 'elevacao-lateral', 'Elevação lateral', 'Ombros', '{}', 'Halteres', array['Segure os halteres ao lado do corpo com cotovelos destravados.','Eleve os braços até perto da linha dos ombros.','Desça devagar sem relaxar completamente.'], array['Conduza o movimento pelos cotovelos.','Evite encolher os ombros.'], 'raise', 60),
  ('10000000-0000-4000-8000-000000000014', null, 'prancha', 'Prancha', 'Core', array['Glúteos','Ombros'], 'Peso corporal', array['Apoie antebraços e pontas dos pés.','Alinhe cabeça, tronco e quadril.','Respire mantendo abdômen e glúteos ativos.'], array['Encerre a série quando perder a posição.','Não prenda a respiração.'], 'core', 60),
  ('10000000-0000-4000-8000-000000000015', null, 'abdominal-polia', 'Abdominal na polia', 'Core', '{}', 'Polia', array['Ajoelhe-se segurando a corda junto à cabeça.','Flexione o tronco aproximando costelas e pelve.','Retorne controlando a carga, sem puxar com os braços.'], array['Pense em enrolar o tronco.','Mantenha o quadril relativamente estável.'], 'core', 60),
  ('10000000-0000-4000-8000-000000000016', null, 'elevacao-pelvica', 'Elevação pélvica', 'Glúteos', array['Posterior'], 'Barra', array['Apoie a parte alta das costas no banco e posicione a barra no quadril.','Eleve o quadril até alinhar joelhos, quadril e ombros.','Desça com controle sem perder a posição dos pés.'], array['Finalize com glúteos, não com a lombar.','Mantenha o queixo levemente recolhido.'], 'hinge', 105),
  ('10000000-0000-4000-8000-000000000017', null, 'barra-fixa', 'Barra fixa', 'Costas', array['Bíceps','Core'], 'Barra fixa', array['Comece pendurado com tronco firme.','Puxe o peito em direção à barra conduzindo pelos cotovelos.','Desça com controle até estender os braços.'], array['Use assistência se necessário.','Evite balanço para contar repetições.'], 'pull', 120),
  ('10000000-0000-4000-8000-000000000018', null, 'levantamento-terra', 'Levantamento terra', 'Posterior', array['Glúteos','Costas','Core'], 'Barra', array['Aproxime a barra das canelas e firme a pegada.','Crie tensão no tronco antes de tirar a barra do chão.','Estenda joelhos e quadril mantendo a barra próxima ao corpo.'], array['Aprenda o padrão com carga leve.','Não arredonde a lombar para buscar a barra.'], 'hinge', 150),
  ('10000000-0000-4000-8000-000000000019', null, 'crucifixo-maquina', 'Crucifixo na máquina', 'Peitoral', array['Ombros'], 'Máquina', array['Ajuste o banco para alinhar as mãos ao peito.','Aproxime os braços mantendo os cotovelos levemente flexionados.','Retorne até alongar o peitoral sem forçar o ombro.'], array['Mantenha costas apoiadas.','Não deixe a carga bater entre repetições.'], 'press', 75),
  ('10000000-0000-4000-8000-000000000020', null, 'mesa-flexora', 'Mesa flexora', 'Posterior', '{}', 'Máquina', array['Ajuste o rolo logo acima dos calcanhares.','Flexione os joelhos mantendo o quadril apoiado.','Retorne controlando a extensão.'], array['Evite levantar o quadril.','Use amplitude sem dor no joelho.'], 'curl', 75),
  ('10000000-0000-4000-8000-000000000021', null, 'cadeira-extensora', 'Cadeira extensora', 'Quadríceps', '{}', 'Máquina', array['Alinhe o eixo da máquina ao joelho.','Estenda as pernas sem dar impulso.','Desça controlando até a posição inicial.'], array['Ajuste o encosto para apoiar o quadril.','Evite impacto no fim da extensão.'], 'extension', 75),
  ('10000000-0000-4000-8000-000000000022', null, 'panturrilha-em-pe', 'Panturrilha em pé', 'Panturrilhas', '{}', 'Máquina', array['Apoie a parte da frente dos pés na plataforma.','Eleve os calcanhares até contrair as panturrilhas.','Desça devagar até sentir alongamento controlado.'], array['Não quique no fundo.','Use apoio para manter equilíbrio.'], 'extension', 60),
  ('10000000-0000-4000-8000-000000000023', null, 'face-pull', 'Face pull', 'Ombros', array['Costas'], 'Polia', array['Ajuste a corda na altura do rosto.','Puxe separando as pontas e levando cotovelos para fora.','Retorne sem perder a posição do tronco.'], array['Use carga moderada.','Termine com as mãos ao lado do rosto.'], 'pull', 60),
  ('10000000-0000-4000-8000-000000000024', null, 'agachamento-goblet', 'Agachamento goblet', 'Quadríceps', array['Glúteos','Core'], 'Halter', array['Segure um halter junto ao peito.','Agache mantendo o tronco firme e joelhos alinhados.','Suba empurrando o chão com o pé inteiro.'], array['É uma boa opção para aprender o agachamento.','Não deixe o halter afastar do corpo.'], 'squat', 90)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  primary_muscle = excluded.primary_muscle,
  secondary_muscles = excluded.secondary_muscles,
  equipment = excluded.equipment,
  instructions = excluded.instructions,
  tips = excluded.tips,
  demo_type = excluded.demo_type,
  rest_seconds = excluded.rest_seconds,
  updated_at = now();

insert into public.routine_templates
  (id, slug, name, description, goal, level, days_per_week, duration_weeks, session_minutes, tags, is_published)
values
  ('20000000-0000-4000-8000-000000000001', 'base-3x', 'Base 3x', 'Treino de corpo inteiro, simples de seguir e fácil de progredir.', 'hipertrofia', 'iniciante', 3, 8, 50, array['Corpo inteiro','Fundamentos','Academia'], true),
  ('20000000-0000-4000-8000-000000000002', 'superior-inferior-4x', 'Superior / Inferior', 'Mais volume por grupo muscular sem transformar cada treino em uma maratona.', 'hipertrofia', 'intermediario', 4, 10, 60, array['4 dias','Hipertrofia','Progressão'], true),
  ('20000000-0000-4000-8000-000000000003', 'push-pull-legs-5x', 'Push / Pull / Legs', 'Divisão de cinco dias com compostos fortes e acessórios objetivos.', 'forca', 'intermediario', 5, 8, 65, array['5 dias','Força','Volume alto'], true)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  goal = excluded.goal,
  level = excluded.level,
  days_per_week = excluded.days_per_week,
  duration_weeks = excluded.duration_weeks,
  session_minutes = excluded.session_minutes,
  tags = excluded.tags,
  is_published = excluded.is_published,
  updated_at = now();

insert into public.template_days (id, template_id, name, position)
values
  ('21000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Treino A',1),
  ('21000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Treino B',2),
  ('21000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','Treino C',3),
  ('21000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002','Superior A',1),
  ('21000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000002','Inferior A',2),
  ('21000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000002','Superior B',3),
  ('21000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000002','Inferior B',4),
  ('21000000-0000-4000-8000-000000000008','20000000-0000-4000-8000-000000000003','Push A',1),
  ('21000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000003','Pull A',2),
  ('21000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000003','Legs A',3),
  ('21000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000003','Push B',4),
  ('21000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000003','Pull B',5)
on conflict (id) do update set name = excluded.name, position = excluded.position;

delete from public.template_exercises where template_day_id in (
  select id from public.template_days where template_id in (
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003'
  )
);

insert into public.template_exercises
  (template_day_id, exercise_id, position, sets, reps_min, reps_max, rest_seconds, notes)
values
  -- Base 3x
  ('21000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,3,6,8,120,''),
  ('21000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',2,3,6,10,120,''),
  ('21000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003',3,3,8,10,105,''),
  ('21000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004',4,3,8,12,90,''),
  ('21000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000014',5,3,30,45,60,'Repetições representam segundos'),
  ('21000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000005',1,3,8,10,120,''),
  ('21000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000006',2,3,8,12,90,''),
  ('21000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000007',3,3,8,10,90,'Repetições por perna'),
  ('21000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000008',4,2,10,12,75,''),
  ('21000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000009',5,2,10,12,75,''),
  ('21000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000010',1,3,10,12,105,''),
  ('21000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000011',2,3,8,12,105,''),
  ('21000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000012',3,3,8,12,90,''),
  ('21000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000013',4,3,12,15,60,''),
  ('21000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000015',5,3,12,15,60,''),
  -- Upper / Lower
  ('21000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002',1,4,5,8,120,''),
  ('21000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003',2,4,6,10,105,''),
  ('21000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004',3,3,8,10,90,''),
  ('21000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000006',4,3,8,12,90,''),
  ('21000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000009',5,3,10,14,75,''),
  ('21000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000008',6,3,10,14,75,''),
  ('21000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001',1,4,5,8,135,''),
  ('21000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000005',2,3,8,10,120,''),
  ('21000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000010',3,3,10,12,105,''),
  ('21000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000020',4,3,10,14,75,''),
  ('21000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000022',5,4,10,15,60,''),
  ('21000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000011',1,4,8,10,105,''),
  ('21000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000017',2,4,6,10,120,''),
  ('21000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000012',3,3,10,12,90,''),
  ('21000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000013',4,4,12,16,60,''),
  ('21000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000023',5,3,12,15,60,''),
  ('21000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000008',6,3,10,12,75,''),
  ('21000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000018',1,3,3,5,150,''),
  ('21000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000007',2,3,8,10,90,''),
  ('21000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000016',3,4,8,12,105,''),
  ('21000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000021',4,3,12,15,75,''),
  ('21000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000015',5,3,12,18,60,''),
  -- Push / Pull / Legs
  ('21000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000002',1,4,4,6,135,''),
  ('21000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000004',2,3,6,8,105,''),
  ('21000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000011',3,3,8,10,90,''),
  ('21000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000013',4,4,12,16,60,''),
  ('21000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000009',5,3,10,14,75,''),
  ('21000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000003',1,4,5,8,120,''),
  ('21000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000017',2,4,6,10,120,''),
  ('21000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000012',3,3,8,12,90,''),
  ('21000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000023',4,3,12,15,60,''),
  ('21000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000008',5,3,8,12,75,''),
  ('21000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001',1,4,4,6,150,''),
  ('21000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000005',2,4,6,10,120,''),
  ('21000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000010',3,3,10,12,105,''),
  ('21000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000020',4,3,10,14,75,''),
  ('21000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000022',5,4,12,16,60,''),
  ('21000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011',1,4,6,10,105,''),
  ('21000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000004',2,4,6,8,105,''),
  ('21000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000019',3,3,12,15,75,''),
  ('21000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000013',4,4,12,18,60,''),
  ('21000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000009',5,4,10,14,75,''),
  ('21000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000018',1,3,3,5,150,''),
  ('21000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000006',2,4,8,12,90,''),
  ('21000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000012',3,4,8,12,90,''),
  ('21000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000023',4,3,12,16,60,''),
  ('21000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000008',5,4,10,14,75,'');

commit;
