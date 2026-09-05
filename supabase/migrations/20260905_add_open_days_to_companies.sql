-- Adiciona coluna open_days para controlar quais dias da semana o salão abre
-- Default: seg a sab ( seg,ter,qua,qui,sex,sab )
ALTER TABLE companies ADD COLUMN IF NOT EXISTS open_days TEXT[] DEFAULT ARRAY['seg','ter','qua','qui','sex','sab'];
