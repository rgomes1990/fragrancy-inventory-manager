
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

const OrderProductsPDFReport = () => {
  const generateOrderProductsReport = async () => {
    try {
      // Buscar produtos do tipo encomenda
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(name)
        `)
        .eq('is_order_product', true)
        .order('name');

      if (error) throw error;

      if (!products || products.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum produto de encomenda encontrado.",
        });
        return;
      }

      // Criar PDF
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text('Relatório de Produtos - Encomendas', 20, 20);
      
      // Data de geração
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
      
      let yPosition = 50;
      
      // Cabeçalhos
      doc.setFontSize(12);
      doc.text('Nome', 20, yPosition);
      doc.text('Categoria', 80, yPosition);
      doc.text('Preço Custo', 120, yPosition);
      doc.text('Preço Venda', 160, yPosition);
      doc.text('Qtd', 190, yPosition);
      
      yPosition += 10;
      
      // Linha separadora
      doc.line(20, yPosition - 5, 200, yPosition - 5);
      
      // Dados dos produtos
      doc.setFontSize(10);
      products.forEach((product) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        const categoryName = product.categories?.name || 'Sem categoria';
        
        doc.text(product.name.substring(0, 25), 20, yPosition);
        doc.text(categoryName.substring(0, 20), 80, yPosition);
        doc.text(`R$ ${Number(product.cost_price).toFixed(2)}`, 120, yPosition);
        doc.text(`R$ ${Number(product.sale_price).toFixed(2)}`, 160, yPosition);
        doc.text(product.quantity.toString(), 190, yPosition);
        
        yPosition += 8;
      });
      
      // Totais
      yPosition += 10;
      doc.line(20, yPosition - 5, 200, yPosition - 5);
      doc.setFontSize(12);
      doc.text(`Total de produtos: ${products.length}`, 20, yPosition);
      
      const totalCost = products.reduce((sum, p) => sum + Number(p.cost_price), 0);
      const totalSale = products.reduce((sum, p) => sum + Number(p.sale_price), 0);
      const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
      
      yPosition += 8;
      doc.text(`Valor total custo: R$ ${totalCost.toFixed(2)}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Valor total venda: R$ ${totalSale.toFixed(2)}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Quantidade total: ${totalQuantity}`, 20, yPosition);
      
      // Salvar PDF
      doc.save(`relatorio-produtos-encomendas-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Sucesso",
        description: "Relatório PDF gerado com sucesso!",
      });
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button 
      onClick={generateOrderProductsReport}
      className="bg-red-600 hover:bg-red-700 text-white"
    >
      <FileText className="w-4 h-4 mr-2" />
      Relatório PDF Encomendas
    </Button>
  );
};

export default OrderProductsPDFReport;
