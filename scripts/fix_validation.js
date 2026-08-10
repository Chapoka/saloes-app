const fs = require('fs');
let content = fs.readFileSync('src/components/customers/CustomerForm.jsx', 'utf8');

// Normalize line endings first
content = content.replace(/\r\n/g, '\n');

const oldBlock = `    const isIndependentOrGuardian = customerType === "independent" || customerType === "guardian";

    if (isIndependentOrGuardian) {
      if (!cpfValue) {
        return toast.error("CPF é obrigatório para clientes independentes ou responsáveis.");
      }
      if (!rgValue) {
        return toast.error("RG é obrigatório para clientes independentes ou responsáveis.");
      }
      if (!phoneValue) {
        return toast.error("WhatsApp é obrigatório para clientes independentes ou responsáveis.");
      }
    }`;

const newBlock = `    const isIndependentOrGuardian = customerType === "independent" || customerType === "guardian";
    const hasPlanOrBilling = formData.plan_id || formData.custom_plan || formData.billing_mode === "consolidated";

    if (isIndependentOrGuardian && hasPlanOrBilling) {
      if (!cpfValue) {
        return toast.error("CPF é obrigatório para clientes com plano ou cobrança.");
      }
      if (!rgValue) {
        return toast.error("RG é obrigatório para clientes com plano ou cobrança.");
      }
      if (!phoneValue) {
        return toast.error("WhatsApp é obrigatório para clientes com plano ou cobrança.");
      }
    }`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync('src/components/customers/CustomerForm.jsx', content, 'utf8');
  console.log('OK');
} else {
  console.log('NOT FOUND');
}
