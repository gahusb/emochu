import { Lightbulb } from 'lucide-react';

interface Props { tip: string; }

export default function CourseTip({ tip }: Props) {
  if (!tip) return null;
  return (
    <div className="bg-mocha-soft rounded-lg p-4 flex items-start gap-3">
      <Lightbulb size={18} strokeWidth={1.75} className="text-mocha flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm text-ink-2 break-keep">{tip}</p>
    </div>
  );
}
