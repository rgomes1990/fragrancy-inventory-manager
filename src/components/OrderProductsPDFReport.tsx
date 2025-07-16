
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

const OrderProductsPDFReport = () => {
  const generateOrderProductsReport = async () => {
    try {
      // Buscar todas as solicitações de encomenda
      const requestsResult = await supabase
        .from('product_order_requests')
        .select(`
          *,
          products(
            name, 
            cost_price,
            sale_price,
            categories(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (requestsResult.error) throw requestsResult.error;

      const orderRequests = requestsResult.data || [];

      if (orderRequests.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhuma solicitação de encomenda encontrada.",
        });
        return;
      }

      // Criar PDF
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text('Relatório de Encomendas', 20, 20);
      
      // Data de geração
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
      
      let yPosition = 50;
      
      // Cabeçalhos
      doc.setFontSize(12);
      doc.text('Produto', 20, yPosition);
      doc.text('Cliente', 60, yPosition);
      doc.text('Qtd', 100, yPosition);
      doc.text('Preço Custo', 120, yPosition);
      doc.text('Preço Venda', 160, yPosition);
      doc.text('Data', 190, yPosition);
      
      yPosition += 5;
      
      // Linha separadora
      doc.line(20, yPosition, 200, yPosition);
      
      yPosition += 5;
      
      // Dados das solicitações
      doc.setFontSize(10);
      let totalCostPrice = 0;
      let totalSalePrice = 0;
      let totalQuantity = 0;

      orderRequests.forEach((request) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        const productName = request.products?.name || 'Produto não encontrado';
        const costPrice = request.cost_price || request.products?.cost_price || 0;
        const salePrice = request.sale_price || request.products?.sale_price || 0;
        const quantity = request.requested_quantity;
        
        // Calcular totais
        totalCostPrice += costPrice * quantity;
        totalSalePrice += salePrice * quantity;
        totalQuantity += quantity;
        
        doc.text(productName.substring(0, 20), 20, yPosition);
        doc.text(request.customer_name.substring(0, 15), 60, yPosition);
        doc.text(quantity.toString(), 100, yPosition);
        doc.text(`R$ ${costPrice.toFixed(2)}`, 120, yPosition);
        doc.text(`R$ ${salePrice.toFixed(2)}`, 160, yPosition);
        doc.text(new Date(request.created_at).toLocaleDateString('pt-BR'), 190, yPosition);
        
        yPosition += 8;
      });
      
      // Totais
      yPosition += 10;
      doc.line(20, yPosition, 200, yPosition);
      doc.setFontSize(12);
      yPosition += 10;
      doc.text(`Total de solicitações: ${orderRequests.length}`, 20, yPosition);
      
      yPosition += 8;
      doc.text(`Quantidade total: ${totalQuantity}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Valor total custo: R$ ${totalCostPrice.toFixed(2)}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Valor total venda: R$ ${totalSalePrice.toFixed(2)}`, 20, yPosition);
      
      // Salvar PDF
      doc.save(`relatorio-encomendas-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Sucesso",
        description: "Relatório PDF de encomendas gerado com sucesso!",
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
