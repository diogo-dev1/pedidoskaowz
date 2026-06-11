import { CheckCircle2, Circle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepId = 'whatsapp' | 'texts' | 'finishes' | 'prices' | 'discounts' | 'bainha' | 'images';

interface Step {
  id: StepId;
  label: string;
  description: string;
  help: string;
}

interface ConfigProgressProps {
  steps: Step[];
  currentStep: StepId;
  onStepClick: (stepId: StepId) => void;
  completedSteps: StepId[];
}

export function ConfigProgress({
  steps,
  currentStep,
  onStepClick,
  completedSteps,
}: ConfigProgressProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const progressPercent = Math.round(((currentIndex + 1) / steps.length) * 100);

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      {/* Barra de progresso linear */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Configuração do Produto</h3>
          <span className="text-xs font-medium text-muted-foreground">
            {currentIndex + 1} de {steps.length}
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Etapas horizontais (desktop) / verticais (mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3">
        {steps.map((step, idx) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;

          return (
            <button
              key={step.id}
              onClick={() => onStepClick(step.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2 rounded-lg border transition',
                isCurrent
                  ? 'border-primary bg-primary/10'
                  : isCompleted
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-border bg-background hover:bg-muted'
              )}
              title={step.description}
            >
              <div className="relative">
                {isCompleted ? (
                  <CheckCircle2 size={20} className="text-green-600" />
                ) : isCurrent ? (
                  <Circle size={20} className="text-primary fill-primary/20" />
                ) : (
                  <Circle size={20} className="text-muted-foreground" />
                )}
                {isCurrent && (
                  <div className="absolute inset-0 animate-pulse rounded-full border border-primary" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium text-center leading-tight',
                  isCurrent ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Card de ajuda contextual */}
      <div className="mt-6 p-3 sm:p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <div className="flex gap-3">
          <HelpCircle size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
              {steps[currentIndex]?.label}
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              {steps[currentIndex]?.help}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
