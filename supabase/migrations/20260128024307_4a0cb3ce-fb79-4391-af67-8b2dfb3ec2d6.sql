-- Atualizar categoria das despesas de Saque Ana Paula/Danilo para Prolabore
UPDATE expenses 
SET category = 'Prolabore'
WHERE (description ILIKE '%Saque Ana Paula%' OR description ILIKE '%Saque Danilo%')
AND category != 'Prolabore';