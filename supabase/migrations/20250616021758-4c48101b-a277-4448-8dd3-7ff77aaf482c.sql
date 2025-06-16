
-- Criar tabela de categorias
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir as categorias padrão
INSERT INTO public.categories (name) VALUES
('Perfumes Masculinos'),
('Perfumes Femininos'),
('Body Splash'),
('Cremes');

-- Criar tabela de encomendas
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  notes TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de itens da encomenda
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  cost_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Atualizar produtos para usar referência à categoria
ALTER TABLE public.products 
DROP COLUMN category;

ALTER TABLE public.products 
ADD COLUMN category_id UUID REFERENCES public.categories(id);

-- Atualizar produtos existentes para usar as novas categorias
UPDATE public.products 
SET category_id = (SELECT id FROM public.categories WHERE name = 'Perfumes Masculinos')
WHERE name LIKE '%Masculino%' OR name LIKE '%Azzaro%';

UPDATE public.products 
SET category_id = (SELECT id FROM public.categories WHERE name = 'Perfumes Femininos')
WHERE name LIKE '%Feminino%' OR name LIKE '%Chanel%';

UPDATE public.products 
SET category_id = (SELECT id FROM public.categories WHERE name = 'Body Splash')
WHERE name LIKE '%Body Splash%' OR name LIKE '%Tropical%';

UPDATE public.products 
SET category_id = (SELECT id FROM public.categories WHERE name = 'Cremes')
WHERE name LIKE '%Creme%' OR name LIKE '%Hidratante%';
