-- Corrigir produtos órfãos (sem tenant_id) - atribuir ao tenant "Perfumes Principal"
UPDATE products 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;