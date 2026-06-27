import * as Icons from "lucide-react";
import { CATEGORIES, type CategoryId } from "@/lib/products";

interface CategoryChipsProps {
  active: CategoryId;
  onChange: (id: CategoryId) => void;
}

export function CategoryChips({ active, onChange }: CategoryChipsProps) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
      {CATEGORIES.map((cat) => {
        const Icon = (Icons[cat.icon as keyof typeof Icons] ||
          Icons.Tag) as React.ComponentType<{
          className?: string;
          strokeWidth?: number;
        }>;
        const isActive = active === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition-all active:scale-95 ${
              isActive
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "border border-border bg-card text-foreground"
            }`}
          >
            <Icon
              className="h-4 w-4"
              strokeWidth={isActive ? 2.4 : 2}
            />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
