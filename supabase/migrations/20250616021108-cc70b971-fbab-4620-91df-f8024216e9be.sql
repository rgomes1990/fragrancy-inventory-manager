
-- Adicionar coluna de categoria na tabela products
ALTER TABLE public.products 
ADD COLUMN category TEXT NOT NULL DEFAULT 'Perfumes Masculinos';

-- Adicionar alguns produtos de exemplo com categorias
INSERT INTO public.products (name, cost_price, sale_price, quantity, category) VALUES
('Perfume Masculino Azzaro', 45.00, 89.90, 10, 'Perfumes Masculinos'),
('Perfume Feminino Chanel', 60.00, 120.00, 8, 'Perfumes Femininos'),
('Body Splash Tropical', 15.00, 29.90, 20, 'Body Splash'),
('Creme Hidratante Premium', 25.00, 49.90, 15, 'Cremes');

-- Adicionar alguns clientes de exemplo
INSERT INTO public.customers (name, whatsapp, email) VALUES
('Maria Silva', '(11) 99999-1234', 'maria@email.com'),
('João Santos', '(11) 99999-5678', 'joao@email.com'),
('Ana Costa', '(11) 99999-9012', 'ana@email.com');
