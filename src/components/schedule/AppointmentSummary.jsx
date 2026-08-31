import { useState } from "react";
import { useCheckout } from "@/hooks/useCheckout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, CreditCard } from "lucide-react";

/**
 * Exemplo de componente que usa o useCheckout no resumo do agendamento.
 *
 * Recebe como props:
 *   - service: objeto do serviço selecionado
 *   - customerPlans: CustomerPlan[] do cliente
 *   - customerCombos: CustomerCombo[] do cliente
 *   - plans: Plan[] (catálogo)
 *   - combos: Combo[] (catálogo)
 *   - onConfirm: callback ao confirmar
 */
export default function AppointmentSummary({
  service,
  customerPlans,
  customerCombos,
  plans,
  combos,
  onConfirm,
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  const { finalPrice, discountMethod, tag, planName, comboName } =
    useCheckout({
      service,
      customerPlans,
      customerCombos,
      plans,
      combos,
    });

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm({
        serviceId: service.id,
        price: finalPrice,
        discountMethod,
      });
      toast.success("Agendamento confirmado!");
    } catch {
      toast.error("Erro ao confirmar agendamento");
    } finally {
      setIsConfirming(false);
    }
  };

  const hasDiscount = discountMethod !== null;
  const originalPrice = Number(service?.preco) || 0;

  return (
    <div className="rounded-2xl border border-outline-variant/30 p-5 space-y-4">
      <h3 className="font-semibold text-on-surface">Resumo do Agendamento</h3>

      {/* Serviço */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-on-surface-variant">{service?.nome}</span>
        <div className="flex items-center gap-2">
          {hasDiscount && (
            <span className="text-sm text-on-surface-variant line-through">
              R$ {originalPrice.toFixed(2).replace(".", ",")}
            </span>
          )}
          <span className="text-lg font-bold text-on-surface">
            R$ {finalPrice.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>

      {/* Tag de desconto */}
      {tag && (
        <div className="flex items-center gap-2">
          {discountMethod === "plan" ? (
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              {tag} — {planName}
            </Badge>
          ) : (
            <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <CreditCard className="w-3 h-3 mr-1" />
              {tag} — {comboName}
            </Badge>
          )}
        </div>
      )}

      {/* Botão confirmar */}
      <Button
        onClick={handleConfirm}
        disabled={isConfirming}
        className="w-full bg-branding-primary text-white rounded-xl"
      >
        {isConfirming ? "Confirmando..." : "Confirmar Agendamento"}
      </Button>
    </div>
  );
}
