import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

const StockProductsPDFReport = () => {
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
      // Buscar produtos em estoque (quantity > 0 e não é produto de encomenda)
      const stockProductsResult = await supabase
        .from('products')
        .select(`
          *,
          categories(name)
        `)
        .eq('is_order_product', false)
        .gt('quantity', 0)
        .order('name');

      if (stockProductsResult.error) throw stockProductsResult.error;

      const stockProducts = stockProductsResult.data || [];

      if (stockProducts.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum produto em estoque encontrado.",
        });
        return;
      }

      // Filtrar produtos excluindo a categoria "Tg"
      const filteredProducts = stockProducts.filter(
        product => product.categories?.name !== 'Tg'
      );

      if (filteredProducts.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum produto em estoque encontrado (excluindo categoria Tg).",
        });
        return;
      }

      // Agrupar produtos por categoria
      const productsByCategory: { [key: string]: typeof filteredProducts } = {};
      
      for (const product of filteredProducts) {
        const categoryName = product.categories?.name || 'Sem categoria';
        if (!productsByCategory[categoryName]) {
          productsByCategory[categoryName] = [];
        }
        productsByCategory[categoryName].push(product);
      }

      // Ordem personalizada das categorias
      const categoryOrder = [
        'Perfumes Femininos',
        'Perfumes Masculinos',
        'Body Splash',
        'Cremes',
        'Sem categoria'
      ];
      
      const sortedCategories = Object.keys(productsByCategory).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        
        // Se ambos estão na lista de prioridade
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        // Se apenas A está na lista de prioridade
        if (indexA !== -1) return -1;
        // Se apenas B está na lista de prioridade
        if (indexB !== -1) return 1;
        // Se nenhum está na lista, ordenar alfabeticamente
        return a.localeCompare(b);
      });

      // Criar PDF
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text('Catálogo de Produtos em Estoque', 20, 20);
      
      // Data de geração
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
      
      let yPosition = 50;

      // Iterar por cada categoria
      for (const categoryName of sortedCategories) {
        const categoryProducts = productsByCategory[categoryName];
        
        // Verificar se precisa de nova página para o cabeçalho da categoria
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Cabeçalho da categoria
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(categoryName, 20, yPosition);
        yPosition += 8;
        
        // Linha separadora da categoria
        doc.setDrawColor(100, 100, 100);
        doc.line(20, yPosition, 190, yPosition);
        yPosition += 8;
        
        // Cabeçalhos das colunas
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Foto', 20, yPosition);
        doc.text('Produto', 50, yPosition);
        doc.text('Preço', 160, yPosition);
        
        yPosition += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPosition, 190, yPosition);
        yPosition += 8;
        
        doc.setFont('helvetica', 'normal');
        
        // Produtos da categoria
        for (const product of categoryProducts) {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
            
            // Repetir cabeçalho da categoria na nova página
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${categoryName} (continuação)`, 20, yPosition);
            yPosition += 10;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
          }
          
          const productName = product.name;
          const salePrice = product.sale_price || 0;
          
          // Carregar e adicionar imagem se existir
          if (product.image_url) {
            try {
              const imageBase64 = await loadImageAsBase64(product.image_url);
              if (imageBase64) {
                const imageSize = 15;
                doc.addImage(imageBase64, 'JPEG', 20, yPosition - 12, imageSize, imageSize);
              }
            } catch (error) {
              console.error('Erro ao adicionar imagem:', error);
            }
          }
          
          doc.text(productName.substring(0, 35), 50, yPosition);
          doc.text(`R$ ${salePrice.toFixed(2)}`, 160, yPosition);
          
          yPosition += 20;
        }
        
        // Espaço entre categorias
        yPosition += 5;
      }
      
      // Salvar PDF
      doc.save(`catalogo-estoque-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Sucesso",
        description: "Catálogo PDF de produtos em estoque gerado com sucesso!",
      });
      
    } catch (error) {
      console.error('Erro ao gerar catálogo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o catálogo PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button 
      onClick={generateStockProductsReport}
      className="bg-green-600 hover:bg-green-700 text-white"
    >
      <FileText className="w-4 h-4 mr-2" />
      Catálogo PDF Estoque
    </Button>
  );
};

export default StockProductsPDFReport;