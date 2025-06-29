
-- Criar bucket de storage para fotos dos produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Criar políticas para o bucket de fotos dos produtos
CREATE POLICY "Allow public read access on product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated insert on product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated update on product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated delete on product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

-- Adicionar coluna image_url na tabela products
ALTER TABLE products 
ADD COLUMN image_url TEXT;
