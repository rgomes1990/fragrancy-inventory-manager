import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

const StockProductsPDFReport = () => {
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
      doc.text('Produto', 20, yPosition);
      doc.text('Categoria', 80, yPosition);
      doc.text('Quantidade', 130, yPosition);
      doc.text('Preço de Venda', 170, yPosition);
      
      yPosition += 5;
      
      // Linha separadora
      doc.line(20, yPosition, 200, yPosition);
      
      yPosition += 10;
      
      // Dados dos produtos
      doc.setFontSize(10);
      let totalProducts = 0;
      let totalValue = 0;

      stockProducts.forEach((product) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        const productName = product.name;
        const categoryName = product.categories?.name || 'Sem categoria';
        const quantity = product.quantity;
        const salePrice = product.sale_price || 0;
        
        // Calcular totais
        totalProducts += quantity;
        totalValue += salePrice * quantity;
        
        doc.text(productName.substring(0, 25), 20, yPosition);
        doc.text(categoryName.substring(0, 20), 80, yPosition);
        doc.text(quantity.toString(), 130, yPosition);
        doc.text(`R$ ${salePrice.toFixed(2)}`, 170, yPosition);
        
        yPosition += 8;
      });
      
      // Totais
      yPosition += 10;
      doc.line(20, yPosition, 200, yPosition);
      doc.setFontSize(12);
      yPosition += 10;
      doc.text(`Total de produtos diferentes: ${stockProducts.length}`, 20, yPosition);
      
      yPosition += 8;
      doc.text(`Quantidade total em estoque: ${totalProducts}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Valor total do estoque: R$ ${totalValue.toFixed(2)}`, 20, yPosition);
      
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