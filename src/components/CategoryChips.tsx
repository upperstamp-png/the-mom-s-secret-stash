import * as Icons from "lucide-react";
import { CATEGORIES, type CategoryId } from "@/lib/products";

interface CategoryChipsProps {
  active: CategoryId;
  onChange: (id: CategoryId) => void;
}

export function CategoryChips({ active, onChange }: CategoryChipsProps) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-2">
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
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition-all active:scale-95 duration-200 ${
              isActive
                ? "bg-primary text-white shadow-soft"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
            }`}
          >
            <Icon
              className="h-3.5 w-3.5"
              strokeWidth={isActive ? 2.5 : 2}
            />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
