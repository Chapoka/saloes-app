import { useState, useRef, useEffect } from "react";
import { ChevronDown, Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CompanyMultiSelect({ companies, selectedIds, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (id) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(i => i !== id)
        : [...selectedIds, id]
    );
  };

  const selectedNames = companies
    .filter(c => selectedIds.includes(c.id))
    .map(c => c.name);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full border rounded-xl px-3 py-2 text-sm text-left flex items-center justify-between gap-2 transition-colors",
          open ? "border-branding-primary ring-2 ring-branding-primary/20" : "border-input bg-background hover:border-gray-400"
        )}
      >
        <span className={selectedNames.length === 0 ? "text-gray-500" : "text-gray-700"}>
          {selectedNames.length === 0
            ? "Nenhum salão"
            : selectedNames.length === 1
              ? selectedNames[0]
              : `${selectedNames.length} salões selecionados`}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {companies.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-500 text-center">Nenhum salão cadastrado</p>
          )}
          {companies.map((c) => {
            const isSelected = selectedIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left hover:bg-gray-50",
                  isSelected && "bg-branding-primary/5"
                )}
              >
                <span className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                  isSelected ? "bg-branding-primary border-branding-primary" : "border-gray-300"
                )}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className={cn("flex-1", isSelected ? "text-branding-primary font-medium" : "text-gray-700")}>
                  {c.name}
                </span>
                <Building2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}