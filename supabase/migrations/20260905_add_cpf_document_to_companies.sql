-- Adicionar coluna cpf_document para guardar CPF separado do CNPJ
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cpf_document text;

-- Migrar dados existentes: se cnpj tem 11 dígitos, copiar para cpf_document
UPDATE companies SET cpf_document = cnpj WHERE length(replace(cnpj, E'\\D', '')) = 11;

-- Criar índice para buscas
CREATE INDEX IF NOT EXISTS idx_companies_cpf_document ON companies (cpf_document) WHERE cpf_document IS NOT NULL;
