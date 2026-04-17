import { CheckroomIcon, GenerateIcon, ApparelIcon } from "@/app/shared/components/icons";
import type { HowItWorksStep } from "@/app/landing/types";

interface HowItWorksSectionProps {
  steps: HowItWorksStep[];
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  generate: GenerateIcon,
  apparel: ApparelIcon,
  checkroom: CheckroomIcon,
};

export function HowItWorksSection({ steps }: HowItWorksSectionProps) {
  return (
    <section className="flex flex-col gap-6 px-4 py-10">
      <h2 className="text-[22px] font-normal leading-[1.4] text-text-primary">How it Works?</h2>

      <div className="relative flex flex-col">
        {steps.map((step, idx) => {
          const Icon = ICON_MAP[step.icon];
          return (
            <div key={step.number} className="relative flex gap-4 pb-4">
              {idx < steps.length - 1 && (
                <div className="absolute bottom-0 left-5 top-10 w-px border-l-2 border-dashed border-text-hint" />
              )}
              <div
                className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "radial-gradient(circle at 79% 13%, #FFCF1E 0%, #EDA403 100%)",
                }}
              >
                <span className="text-lg font-normal leading-none text-white">{step.number}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2 rounded-[16px] bg-landing-step-bg p-5">
                {Icon && <Icon size={28} color="white" />}
                <h3 className="text-sm font-normal leading-[1.5] text-white">{step.title}</h3>
                <p className="text-sm font-normal leading-[1.5] text-white/80">{step.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
