import { AlertTriangle, CreditCard, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const alertIcons = {
  credits: AlertTriangle,
  payment: CreditCard,
  schedule: Calendar,
};

const alertColors = {
  warning: "border-amber-200 bg-amber-50",
  danger: "border-red-200 bg-red-50",
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
        type === "warning" ? "text-amber-600" : type === "danger" ? "text-red-600" : "text-branding-primary"
      )} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{title}</p>
        <p className="text-sm text-gray-600 mt-0.5">{message}</p>
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