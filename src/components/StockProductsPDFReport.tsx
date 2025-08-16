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

      // Criar PDF
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text('Catálogo de Produtos em Estoque', 20, 20);
      
      // Data de geração
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
      
      let yPosition = 50;
      
      // Cabeçalhos
      doc.setFontSize(12);
      doc.text('Foto', 20, yPosition);
      doc.text('Produto', 50, yPosition);
      doc.text('Categoria', 110, yPosition);
      doc.text('Quantidade', 150, yPosition);
      doc.text('Preço', 180, yPosition);
      
      yPosition += 5;
      
      // Linha separadora
      doc.line(20, yPosition, 200, yPosition);
      
      yPosition += 10;
      
      // Dados dos produtos
      doc.setFontSize(10);

      for (const product of stockProducts) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        const productName = product.name;
        const categoryName = product.categories?.name || 'Sem categoria';
        const quantity = product.quantity;
        const salePrice = product.sale_price || 0;
        
        // Carregar e adicionar imagem se existir
        if (product.image_url) {
          try {
            const imageBase64 = await loadImageAsBase64(product.image_url);
            if (imageBase64) {
              const imageSize = 15; // Tamanho da imagem
              doc.addImage(imageBase64, 'JPEG', 20, yPosition - 12, imageSize, imageSize);
            }
          } catch (error) {
            console.error('Erro ao adicionar imagem:', error);
          }
        }
        
        doc.text(productName.substring(0, 20), 50, yPosition);
        doc.text(categoryName.substring(0, 15), 110, yPosition);
        doc.text(quantity.toString(), 150, yPosition);
        doc.text(`R$ ${salePrice.toFixed(2)}`, 180, yPosition);
        
        yPosition += 20; // Aumentar espaçamento para acomodar as imagens
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