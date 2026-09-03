import { AlertTriangle, CreditCard, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const alertIcons = {
  credits: AlertTriangle,
  payment: CreditCard,
  schedule: Calendar,
};

const alertStyles = {
  warning: "border-l-salon-warning bg-salon-warning/10",
  danger: "border-l-salon-error bg-salon-error/10",
  info: "border-l-branding bg-branding/5",
};

export default function AlertCard({ type = "warning", alertType = "credits", title, message, action, onAction }) {
  const Icon = alertIcons[alertType] || AlertTriangle;
  
  return (
    <div className={cn(
      "rounded-xl p-4 border-l-4 flex items-start gap-3",
      alertStyles[type]
    )}>
      <Icon className={cn(
        "w-5 h-5 mt-0.5 flex-shrink-0",
        type === "warning" ? "text-salon-warning" : type === "danger" ? "text-salon-error" : "text-branding"
      )} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-main text-sm">{title}</p>
        <p className="text-sm text-text-muted mt-0.5">{message}</p>
        {action && (
          <button 
            onClick={onAction}
            className="mt-2 text-sm font-medium text-branding hover:text-branding-hover transition-colors"
          >
            {action} →
          </button>
        )}
      </div>
    </div>
  );
}
