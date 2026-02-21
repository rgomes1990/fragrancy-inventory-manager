import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { useTenantFilter } from '@/hooks/useTenantFilter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CategoryOption {
  id: string;
  name: string;
}

const StockProductsPDFReport = () => {
  const { tenantId, isAdmin } = useTenantFilter();
  const [showDialog, setShowDialog] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    let query = supabase.from('categories').select('id, name').order('name');
    if (!isAdmin && tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    const { data } = await query;
    if (data) {
      const filtered = data.filter(c => c.name !== 'Tg');
      setCategories(filtered);
      setSelectedCategories(filtered.map(c => c.name));
    }
  };

  const handleOpen = () => {
    fetchCategories();
    setShowDialog(true);
  };

  const toggleCategory = (name: string) => {
    setSelectedCategories(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const selectAll = () => setSelectedCategories(categories.map(c => c.name));
  const selectNone = () => setSelectedCategories([]);

  const loadImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erro ao carregar imagem:', error);
      return null;
    }
  };

  const generateStockProductsReport = async () => {
    try {
      if (!isAdmin && !tenantId) {
        toast({ title: "Aviso", description: "Não foi possível identificar sua empresa." });
        return;
      }

      if (selectedCategories.length === 0) {
        toast({ title: "Aviso", description: "Selecione pelo menos uma categoria." });
        return;
      }

      setLoading(true);

      let stockProductsQuery = supabase
        .from('products')
        .select(`*, categories(name)`)
        .eq('is_order_product', false)
        .gt('quantity', 0)
        .order('name');

      if (!isAdmin && tenantId) {
        stockProductsQuery = stockProductsQuery.eq('tenant_id', tenantId);
      }

      const stockProductsResult = await stockProductsQuery;
      if (stockProductsResult.error) throw stockProductsResult.error;

      const stockProducts = stockProductsResult.data || [];

      // Filtrar por categorias selecionadas
      const filteredProducts = stockProducts.filter(product => {
        const catName = product.categories?.name || 'Sem categoria';
        return selectedCategories.includes(catName);
      });

      if (filteredProducts.length === 0) {
        toast({ title: "Aviso", description: "Nenhum produto encontrado nas categorias selecionadas." });
        setLoading(false);
        return;
      }

      // Agrupar por categoria
      const productsByCategory: { [key: string]: typeof filteredProducts } = {};
      for (const product of filteredProducts) {
        const categoryName = product.categories?.name || 'Sem categoria';
        if (!productsByCategory[categoryName]) {
          productsByCategory[categoryName] = [];
        }
        productsByCategory[categoryName].push(product);
      }

      const categoryOrder = [
        'Perfumes Femininos', 'Perfumes Masculinos', 'Body Splash', 'Cremes', 'Sem categoria'
      ];

      const sortedCategories = Object.keys(productsByCategory).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      });

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Catálogo de Produtos em Estoque', 20, 20);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);

      let yPosition = 50;

      for (const categoryName of sortedCategories) {
        const categoryProducts = productsByCategory[categoryName];

        if (yPosition > 240) { doc.addPage(); yPosition = 20; }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(categoryName, 20, yPosition);
        yPosition += 8;
        doc.setDrawColor(100, 100, 100);
        doc.line(20, yPosition, 190, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Foto', 20, yPosition);
        doc.text('Produto', 50, yPosition);
        doc.text('Qtd', 140, yPosition);
        doc.text('Preço', 160, yPosition);
        yPosition += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPosition, 190, yPosition);
        yPosition += 8;
        doc.setFont('helvetica', 'normal');

        for (const product of categoryProducts) {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${categoryName} (continuação)`, 20, yPosition);
            yPosition += 10;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
          }

          if (product.image_url) {
            try {
              const imageBase64 = await loadImageAsBase64(product.image_url);
              if (imageBase64) {
                doc.addImage(imageBase64, 'JPEG', 20, yPosition - 12, 15, 15);
              }
            } catch (error) {
              console.error('Erro ao adicionar imagem:', error);
            }
          }

          doc.text(product.name.substring(0, 30), 50, yPosition);
          doc.text((product.quantity || 0).toString(), 140, yPosition);
          doc.text(`R$ ${(product.sale_price || 0).toFixed(2)}`, 160, yPosition);
          yPosition += 20;
        }
        yPosition += 5;
      }

      doc.save(`catalogo-estoque-${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "Sucesso", description: "Catálogo PDF gerado com sucesso!" });
      setShowDialog(false);
    } catch (error) {
      console.error('Erro ao gerar catálogo:', error);
      toast({ title: "Erro", description: "Não foi possível gerar o catálogo PDF.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={handleOpen} className="bg-green-600 hover:bg-green-700 text-white">
        <FileText className="w-4 h-4 mr-2" />
        Catálogo PDF Estoque
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecione as categorias</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex gap-2 mb-3">
              <Button variant="outline" size="sm" onClick={selectAll}>Selecionar todas</Button>
              <Button variant="outline" size="sm" onClick={selectNone}>Limpar</Button>
            </div>
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center space-x-2">
                <Checkbox
                  id={cat.id}
                  checked={selectedCategories.includes(cat.name)}
                  onCheckedChange={() => toggleCategory(cat.name)}
                />
                <Label htmlFor={cat.id} className="cursor-pointer">{cat.name}</Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button
              onClick={generateStockProductsReport}
              disabled={loading || selectedCategories.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? 'Gerando...' : 'Gerar Catálogo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StockProductsPDFReport;
