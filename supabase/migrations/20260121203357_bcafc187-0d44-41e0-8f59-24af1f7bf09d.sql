-- Corrigir venda com tenant_id nulo (venda da ana-perfumes para tatiane campos)
UPDATE sales 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE id = '8548e9cc-8538-4e99-8826-9073ec94c0e6' 
AND tenant_id IS NULL;

-- Adicionar constraint NOT NULL no tenant_id para evitar que isso aconteça novamente
-- Primeiro verificar se há outras vendas sem tenant_id e corrigir
UPDATE sales 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;