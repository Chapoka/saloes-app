const fs = require('fs');
let content = fs.readFileSync('src/components/customers/CustomerForm.jsx', 'utf8');
content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// Find the exact block by index
const searchStr = 'const isIndependentOrGuardian = customerType';
const idx = content.indexOf(searchStr);

// Find the start of this line (go back to find indentation)
let start = idx;
while (start > 0 && content[start - 1] === ' ') start--;

// Find the end of the if block: look for the closing "}"; after "WhatsApp"
const blockStart = content.indexOf('if (isIndependentOrGuardian) {', idx);
const afterWhatsApp = content.indexOf('WhatsApp é obrigatório para clientes independentes ou responsáveis', blockStart);
const afterQuote = content.indexOf('";', afterWhatsApp) + 2;
let braceCount = 0;
let blockEnd = afterQuote;
for (let i = afterQuote; i < content.length; i++) {
  if (content[i] === '}') {
    blockEnd = i + 1;
    break;
  }
}

const oldBlock = content.substring(start, blockEnd);
console.log('OLD BLOCK length:', oldBlock.length);

const newBlock = '    const isIndependentOrGuardian = customerType === "independent" || customerType === "guardian";\n    const hasPlanOrBilling = formData.plan_id || formData.custom_plan || formData.billing_mode === "consolidated";\n\n    if (isIndependentOrGuardian && hasPlanOrBilling) {\n      if (!cpfValue) {\n        return toast.error("CPF é obrigatório para clientes com plano ou cobrança.");\n      }\n      if (!rgValue) {\n        return toast.error("RG é obrigatório para clientes com plano ou cobrança.");\n      }\n      if (!phoneValue) {\n        return toast.error("WhatsApp é obrigatório para clientes com plano ou cobrança.");\n      }\n    }';

content = content.substring(0, start) + newBlock + content.substring(blockEnd);
fs.writeFileSync('src/components/customers/CustomerForm.jsx', content, 'utf8');
console.log('OK: validation updated');
