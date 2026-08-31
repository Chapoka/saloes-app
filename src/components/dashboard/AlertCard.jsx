import { AlertTriangle, CreditCard, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const alertIcons = {
  credits: AlertTriangle,
  payment: CreditCard,
  schedule: Calendar,
};

const alertColors = {
  warning: "border-amber-500/30 bg-amber-500/10",
  danger: "border-red-500/30 bg-red-500/10",
  info: "border-branding-primary/20 bg-branding-primary/5",
};

export default function AlertCard({ type = "warning", alertType = "credits", title, message, action, onAction }) {
  const Icon = alertIcons[alertType] || AlertTriangle;
  
  return (
    <div className={cn(
      "rounded-xl p-4 border-l-4 flex items-start gap-3",
      alertColors[type]
    )}>
      <Icon className={cn(
        "w-5 h-5 mt-0.5 flex-shrink-0",
        type === "warning" ? "text-amber-400" : type === "danger" ? "text-red-400" : "text-branding-primary"
      )} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-on-surface text-sm">{title}</p>
        <p className="text-sm text-on-surface-variant mt-0.5">{message}</p>
        {action && (
          <button 
            onClick={onAction}
            className="mt-2 text-sm font-medium text-branding-primary hover:text-branding-primary transition-colors"
          >
            {action} →
          </button>
        )}
      </div>
    </div>
  );
}