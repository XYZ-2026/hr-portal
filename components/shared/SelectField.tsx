// Styled select wrapper that works in both light and dark mode.
// Native <select> dropdown menus on Windows/Linux render with OS chrome,
// so we set explicit background-color on the <select> itself.

import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  className?: string;
}

export function SelectField({
  id,
  value,
  onChange,
  placeholder,
  options,
  className,
}: SelectFieldProps) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-10 pl-3 pr-8 rounded-xl border border-border text-sm',
          'text-foreground outline-none cursor-pointer appearance-none',
          'bg-[hsl(var(--card))] focus:border-primary/50 transition-colors',
          // Ensure option dropdown is readable
          '[color-scheme:dark] dark:[color-scheme:dark]',
          !value && 'text-muted-foreground'
        )}
      >
        {placeholder && (
          <option value="" disabled={false}>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            style={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
          >
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}
