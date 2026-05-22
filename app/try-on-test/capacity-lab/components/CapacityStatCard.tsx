interface CapacityStatCardProps {
  label: string;
  value: string;
  helper?: string;
  tone?: "blue" | "green" | "red" | "neutral";
}

const toneClasses = {
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  green: "border-emerald-100 bg-emerald-50 text-emerald-700",
  red: "border-red-100 bg-red-50 text-red-700",
  neutral: "border-gray-200 bg-white text-text-primary",
};

export function CapacityStatCard({ label, value, helper, tone = "neutral" }: CapacityStatCardProps) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {helper && <p className="mt-1 text-xs opacity-70">{helper}</p>}
    </div>
  );
}
