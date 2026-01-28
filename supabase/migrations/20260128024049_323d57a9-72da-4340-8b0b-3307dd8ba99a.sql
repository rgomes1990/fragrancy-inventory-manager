-- Atualizar categoria das despesas de Pro labore para Prolabore
UPDATE expenses 
SET category = 'Prolabore'
WHERE (description ILIKE '%Pro labore Danilo%' OR description ILIKE '%Pro labore Ana%')
AND category != 'Prolabore';