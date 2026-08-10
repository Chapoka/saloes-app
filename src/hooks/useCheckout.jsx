import { useMemo } from "react";

/**
 * Calcula o preço de um agendamento com base nos planos e combos do cliente.
 *
 * Regras de negócio:
 *   a) Se o cliente tem CustomerPlan ativo com cota_restante > 0 → R$ 0,00 (Cobrado do Plano)
 *   b) Se o cliente tem CustomerCombo com servicos_restantes > 0 → R$ 0,00 (Cobrado do Combo)
 *   c) Caso contrário → preço integral do serviço
 *
 * @param {Object} params
 * @param {Object} params.service - O serviço agendado { id, nome, preco, ... }
 * @param {Array}  params.customerPlans - CustomerPlan[] do cliente
 * @param {Array}  params.customerCombos - CustomerCombo[] do cliente
 * @param {Array}  params.plans - Plan[] (catálogo de planos)
 * @param {Array}  params.combos - Combo[] (catálogo de combos)
 *
 * @returns {{ finalPrice: number, discountMethod: string|null, tag: string|null }}
 */
export function calculateAppointmentPrice({
  service,
  customerPlans = [],
  customerCombos = [],
  plans = [],
  combos = [],
}) {
  if (!service) {
    return { finalPrice: 0, discountMethod: null, tag: null };
  }

  const servicePrice = Number(service.preco) || 0;

  // a) Verificar plano ativo com cota restante
  const activePlan = customerPlans.find(
    (cp) => cp.status === "ativo" && cp.cota_restante > 0
  );
  if (activePlan) {
    const plan = plans.find((p) => p.id === activePlan.planId);
    return {
      finalPrice: 0,
      discountMethod: "plan",
      tag: "Cobrado do Plano",
      planName: plan?.nome || "Plano",
      cotaRestante: activePlan.cota_restante,
    };
  }

  // b) Verificar combo com serviços restantes
  const activeCombo = customerCombos.find(
    (cc) => cc.servicos_restantes > 0
  );
  if (activeCombo) {
    const combo = combos.find((c) => c.id === activeCombo.comboId);
    return {
      finalPrice: 0,
      discountMethod: "combo",
      tag: "Cobrado do Combo",
      comboName: combo?.nome || "Combo",
      servicosRestantes: activeCombo.servicos_restantes,
    };
  }

  // c) Preço integral
  return {
    finalPrice: servicePrice,
    discountMethod: null,
    tag: null,
  };
}

/**
 * Custom Hook que encapsula a lógica de cálculo de preço do agendamento.
 *
 * Uso:
 *   const { finalPrice, discountMethod, tag } = useCheckout({
 *     service,
 *     customerPlans,
 *     customerCombos,
 *     plans,
 *     combos,
 *   });
 */
export function useCheckout({
  service,
  customerPlans = [],
  customerCombos = [],
  plans = [],
  combos = [],
}) {
  const result = useMemo(
    () =>
      calculateAppointmentPrice({
        service,
        customerPlans,
        customerCombos,
        plans,
        combos,
      }),
    [service, customerPlans, customerCombos, plans, combos]
  );

  return result;
}

export default useCheckout;
