import React, { useState } from 'react';
import { Play, RotateCcw, SkipForward, CheckCircle2, AlertCircle } from 'lucide-react';

interface DemoStep {
  stepNumber: number;
  phase: 'Cotejo' | 'Resolución de conflictos' | 'Disparo' | 'Quiescencia';
  title: string;
  description: string;
  activeRule: string;
  ruleStatus: 'EVALUADA' | 'ACTIVADA' | 'RECHAZADA' | 'EJECUTADA';
  workingMemory: Array<{ key: string; value: string; isNew?: boolean }>;
  explanation: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    stepNumber: 1,
    phase: 'Cotejo',
    title: 'Carga de hechos iniciales en Memoria de Trabajo',
    description:
      'El docente o estudiante define los hechos iniciales del caso de estudio antes de iniciar el ciclo.',
    activeRule: 'R1: SI requisitos_cambiantes = Verdadero ENTONCES metodologia = Scrum',
    ruleStatus: 'EVALUADA',
    workingMemory: [
      { key: 'requisitos_cambiantes', value: 'Verdadero' },
      { key: 'tamano_equipo', value: '5' },
    ],
    explanation:
      'Se inspeccionan las reglas activas comparando sus condiciones contra la Memoria de Trabajo inicial.',
  },
  {
    stepNumber: 2,
    phase: 'Cotejo',
    title: 'Evaluación de condiciones y detección de rechazos',
    description:
      'La regla R2 requiere equipo > 15, por lo que no cumple sus condiciones y queda marcada con motivo explícito.',
    activeRule: 'R2: SI tamano_equipo > 15 ENTONCES metodologia = RUP',
    ruleStatus: 'RECHAZADA',
    workingMemory: [
      { key: 'requisitos_cambiantes', value: 'Verdadero' },
      { key: 'tamano_equipo', value: '5' },
    ],
    explanation:
      'R2 fue rechazada porque tamano_equipo (5) no satisface la condición (> 15). El estudiante observa exactamente qué condición falló.',
  },
  {
    stepNumber: 3,
    phase: 'Resolución de conflictos',
    title: 'Activación de R1 y selección determinista',
    description:
      'R1 satisface todas sus premisas, entra al conjunto de conflicto y es seleccionada por prioridad.',
    activeRule: 'R1 (Prioridad: 10): SI requisitos_cambiantes = Verdadero',
    ruleStatus: 'ACTIVADA',
    workingMemory: [
      { key: 'requisitos_cambiantes', value: 'Verdadero' },
      { key: 'tamano_equipo', value: '5' },
    ],
    explanation:
      'El criterio determinista (Prioridad → Especificidad → Identificador) selecciona R1 como regla ganadora del ciclo.',
  },
  {
    stepNumber: 4,
    phase: 'Disparo',
    title: 'Generación de nuevo hecho y trazabilidad',
    description:
      'Al ejecutarse R1, el hecho deducido se incorpora a la Memoria de Trabajo y se registra en el árbol explicativo.',
    activeRule: 'R1: ENTONCES metodologia = Scrum',
    ruleStatus: 'EJECUTADA',
    workingMemory: [
      { key: 'requisitos_cambiantes', value: 'Verdadero' },
      { key: 'tamano_equipo', value: '5' },
      { key: 'metodologia', value: 'Scrum', isNew: true },
    ],
    explanation:
      'Conclusión alcanzada: metodologia = Scrum (originada por R1). No quedan más reglas aplicables (quiescencia).',
  },
];

const STATUS_BADGE_STYLES: Record<DemoStep['ruleStatus'], string> = {
  EVALUADA: 'bg-slate-100 text-slate-700 border-slate-300',
  ACTIVADA: 'bg-amber-50 text-amber-800 border-amber-300',
  RECHAZADA: 'bg-rose-50 text-rose-800 border-rose-300',
  EJECUTADA: 'bg-emerald-50 text-emerald-800 border-emerald-300',
};

export const ForwardChainingDemo: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const current = DEMO_STEPS[stepIndex]!;
  const isLast = stepIndex === DEMO_STEPS.length - 1;

  return (
    <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs sm:p-8">
      <div className="flex flex-col justify-between gap-4 border-b border-brand-border pb-5 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary-light/70 px-3 py-1 text-xs font-semibold text-brand-primary">
            Presentación técnica interactiva (ilustrativa)
          </span>
          <h3 className="mt-2 font-display text-xl font-bold text-brand-graphite">
            Recorrido conceptual: Encadenamiento hacia adelante (Forward Chaining)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStepIndex(0)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-2 text-xs font-semibold text-brand-slate hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reiniciar
          </button>
          <button
            type="button"
            onClick={() => setStepIndex((prev) => (prev < DEMO_STEPS.length - 1 ? prev + 1 : 0))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover"
          >
            {isLast ? (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Volver al paso 1
              </>
            ) : (
              <>
                <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                Siguiente paso
              </>
            )}
          </button>
        </div>
      </div>

      {/* Step indicators */}
      <div className="mt-5 grid grid-cols-4 gap-2" role="tablist" aria-label="Pasos de demostración">
        {DEMO_STEPS.map((step, idx) => (
          <button
            key={step.stepNumber}
            type="button"
            role="tab"
            aria-selected={idx === stepIndex}
            onClick={() => setStepIndex(idx)}
            className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
              idx === stepIndex
                ? 'border-brand-primary bg-brand-primary-light/40 font-semibold text-brand-primary'
                : 'border-brand-border bg-brand-surface text-brand-muted hover:text-brand-graphite'
            }`}
          >
            <span className="block">Paso {step.stepNumber}</span>
            <span className="hidden truncate sm:block">{step.phase}</span>
          </button>
        ))}
      </div>

      {/* Main visual stage */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                Fase: {current.phase}
              </span>
              <span
                className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                  STATUS_BADGE_STYLES[current.ruleStatus]
                }`}
              >
                {current.ruleStatus}
              </span>
            </div>
            <h4 className="mt-2 font-display text-lg font-bold text-brand-graphite">
              {current.title}
            </h4>
            <p className="mt-1.5 text-sm leading-relaxed text-brand-slate">
              {current.description}
            </p>
            <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-xs text-brand-graphite">
              {current.activeRule}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-start gap-2.5">
              {current.ruleStatus === 'RECHAZADA' ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
              ) : (
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent-dark"
                  aria-hidden="true"
                />
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-graphite">
                  Trazabilidad del razonamiento
                </p>
                <p className="mt-1 text-sm text-brand-slate">{current.explanation}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="h-full rounded-xl border border-brand-border bg-slate-950 p-5 text-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Memoria de Trabajo (Estado actual)
            </p>
            <ul className="mt-4 space-y-2.5">
              {current.workingMemory.map((fact) => (
                <li
                  key={fact.key}
                  className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs ${
                    fact.isNew
                      ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-200'
                      : 'border-slate-800 bg-slate-900 text-slate-200'
                  }`}
                >
                  <span className="font-mono">{fact.key}</span>
                  <span className="flex items-center gap-2 font-mono font-semibold">
                    {fact.value}
                    {fact.isNew && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                        Deducido
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-slate-800 pt-3 text-[11px] leading-relaxed text-slate-400">
              Nota: Esta animación ilustra de forma didáctica cómo opera el ciclo de inferencia en
              ExpertEdu Studio. La ejecución real de reglas se realiza en la plataforma.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
