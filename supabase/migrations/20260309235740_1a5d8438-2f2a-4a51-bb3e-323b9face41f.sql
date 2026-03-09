-- Reinserir o produto excluído
INSERT INTO products (id, name, cost_price, sale_price, quantity, category_id, image_url, is_order_product, tenant_id, customer_name, created_at, updated_at)
VALUES (
  'd19b237c-9b3d-4fbd-831f-59555bbc8d9b',
  'Yara Tous "laranja" Lattafa Collection Edp 25ml',
  29.44,
  75,
  7,
  '67359195-3438-4c2c-85c4-dff1406897a9',
  'https://zrvpxzsvynxbskahqwug.supabase.co/storage/v1/object/public/product-images/1771611696603.webp',
  false,
  '00000000-0000-0000-0000-000000000001',
  NULL,
  '2026-02-20T18:22:23.668528+00:00',
  now()
);

-- Restaurar o vínculo da venda com o produto
UPDATE sales 
SET product_id = 'd19b237c-9b3d-4fbd-831f-59555bbc8d9b'
WHERE id = 'e9f01d3f-be89-404f-8b5a-84c01378ce84';