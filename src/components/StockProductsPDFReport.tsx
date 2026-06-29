import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { productsApi, categoriesApi } from '@/services/apiClient';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  drawPageBackground,
  drawHeader,
  drawAllFooters,
  drawCategoryHeader,
  drawTableHeaderRow,
  drawAlternatingRow,
  drawImageFrame,
  newPageIfNeeded,
  loadImageAsBase64,
  COLORS,
} from '@/utils/pdfHelpers';

interface CategoryOption {
  id: string;
  name: string;
}

const SUBTITLE = 'Catalogo de Estoque';

const TABLE_COLUMNS = [
  { label: 'FOTO', x: 20 },
  { label: 'PRODUTO', x: 45 },
  { label: 'QTD', x: 148 },
  { label: 'PRECO', x: 165 },
];

const StockProductsPDFReport = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    const data = await categoriesApi.list();
    if (data) {
      const filtered = data.filter((c: any) => c.name !== 'Tg');
      setCategories(filtered);
      setSelectedCategories(filtered.map((c: any) => c.name));
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

  const generateStockProductsReport = async () => {
    try {
      if (selectedCategories.length === 0) {
        toast({ title: "Aviso", description: "Selecione pelo menos uma categoria." });
        return;
      }

      setLoading(true);

      const stockProducts = await productsApi.list({ is_order_product: 'false', min_quantity: '1' });

      const filteredProducts = (stockProducts || []).filter((product: any) => {
        const catName = product.category_name || 'Sem categoria';
        return selectedCategories.includes(catName)
          && !product.is_order_product
          && Number(product.quantity) > 0;
      });

      if (filteredProducts.length === 0) {
        toast({ title: "Aviso", description: "Nenhum produto encontrado nas categorias selecionadas." });
        setLoading(false);
        return;
      }

      // Agrupar por categoria
      const productsByCategory: { [key: string]: typeof filteredProducts } = {};
      for (const product of filteredProducts) {
        const categoryName = product.category_name || 'Sem categoria';
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
      const ROW_HEIGHT = 20;

      // Primeira pagina
      drawPageBackground(doc);
      drawHeader(doc, SUBTITLE);

      let y = 38;

      for (const categoryName of sortedCategories) {
        const categoryProducts = productsByCategory[categoryName];

        // Espaco para header da categoria + header da tabela + pelo menos 1 linha
        y = newPageIfNeeded(doc, y, 40, SUBTITLE);

        y = drawCategoryHeader(doc, categoryName, y);
        y = drawTableHeaderRow(doc, TABLE_COLUMNS, y);

        let rowIndex = 0;
        for (const product of categoryProducts) {
          y = newPageIfNeeded(doc, y, ROW_HEIGHT + 5, SUBTITLE);

          if (y < 40) {
            // Nova pagina — redesenhar header da categoria e tabela
            y = drawCategoryHeader(doc, `${categoryName} (continuacao)`, y);
            y = drawTableHeaderRow(doc, TABLE_COLUMNS, y);
            rowIndex = 0;
          }

          drawAlternatingRow(doc, y, rowIndex, ROW_HEIGHT);

          // Imagem
          let imageBase64: string | null = null;
          if (product.image_url) {
            imageBase64 = await loadImageAsBase64(product.image_url);
          }
          drawImageFrame(doc, imageBase64, 20, y - 3, 14);

          // Texto do produto
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.charcoal);
          doc.text(product.name.substring(0, 35), 45, y + 5);

          // Quantidade
          doc.setFont('helvetica', 'bold');
          doc.text((product.quantity || 0).toString(), 150, y + 5);

          // Preco
          doc.setFont('helvetica', 'normal');
          doc.text(`R$ ${(product.sale_price || 0).toFixed(2)}`, 165, y + 5);

          y += ROW_HEIGHT;
          rowIndex++;
        }

        y += 8;
      }

      drawAllFooters(doc);
      doc.save(`catalogo-estoque-${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "Sucesso", description: "Catalogo PDF gerado com sucesso!" });
      setShowDialog(false);
    } catch (error) {
      console.error('Erro ao gerar catalogo:', error);
      toast({ title: "Erro", description: "Nao foi possivel gerar o catalogo PDF.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={handleOpen} className="bg-green-600 hover:bg-green-700 text-white">
        <FileText className="w-4 h-4 mr-2" />
        Catalogo PDF Estoque
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
              {loading ? 'Gerando...' : 'Gerar Catalogo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StockProductsPDFReport;
