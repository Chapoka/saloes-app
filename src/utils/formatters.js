export function formatPhone(value) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d{0,4})(\d{0,4}).*/, "($1) $2-$3")
      .replace(/-$/, "");
  }
  return d
    .replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3")
    .replace(/-$/, "");
}

export function formatCPF(value) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d)$/, "$1-$2");
}

export function formatRG(value) {
  const d = value.replace(/\D/g, "").slice(0, 9);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function formatCNPJ(value) {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/(\d{3})(\d)$/, "$1-$2");
}

export function formatCEP(value) {
  const d = value.replace(/\D/g, "").slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}
