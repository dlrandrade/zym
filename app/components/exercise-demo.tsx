import type { DemoType } from "@/lib/types";

const labels: Record<DemoType, { start: string; action: string; finish: string }> = {
  press: { start: "Carga próxima ao corpo", action: "Empurre com controle", finish: "Finalize sem travar" },
  pull: { start: "Braços estendidos", action: "Conduza pelos cotovelos", finish: "Aproxime as escápulas" },
  squat: { start: "Pés firmes no chão", action: "Quadril desce entre os pés", finish: "Suba mantendo o eixo" },
  hinge: { start: "Tronco firme", action: "Leve o quadril para trás", finish: "Estenda o quadril" },
  lunge: { start: "Passo estável", action: "Desça em linha vertical", finish: "Pressione o pé da frente" },
  curl: { start: "Cotovelos ao lado", action: "Flexione sem balanço", finish: "Controle a descida" },
  extension: { start: "Articulação alinhada", action: "Estenda sem impulso", finish: "Retorne devagar" },
  raise: { start: "Ombros baixos", action: "Eleve pelos cotovelos", finish: "Pare na linha do ombro" },
  core: { start: "Coluna neutra", action: "Crie tensão no abdômen", finish: "Respire e sustente" },
};

export function ExerciseDemo({ type, compact = false }: { type: DemoType; compact?: boolean }) {
  const copy = labels[type];

  return (
    <div className={`exercise-demo demo-${type} ${compact ? "is-compact" : ""}`} aria-label={`Demonstração: ${copy.action}`}>
      <div className="demo-stage">
        <div className="demo-floor" />
        <div className="demo-body" aria-hidden="true">
          <span className="demo-head" />
          <span className="demo-torso" />
          <span className="demo-arm demo-arm-left" />
          <span className="demo-arm demo-arm-right" />
          <span className="demo-leg demo-leg-left" />
          <span className="demo-leg demo-leg-right" />
          <span className="demo-weight demo-weight-left" />
          <span className="demo-weight demo-weight-right" />
        </div>
        <div className="demo-path" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        {!compact && <div className="demo-badge">DEMO</div>}
      </div>
      {!compact && (
        <div className="demo-copy">
          <span>{copy.start}</span>
          <strong>{copy.action}</strong>
          <span>{copy.finish}</span>
        </div>
      )}
    </div>
  );
}
