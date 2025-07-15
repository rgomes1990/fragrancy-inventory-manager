
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
      const [productsResult, requestsResult] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            categories(name)
          `)
          .eq('is_order_product', true)
          .order('name'),
        supabase
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
          .order('created_at', { ascending: false })
      ]);

      if (productsResult.error) throw productsResult.error;
      if (requestsResult.error) throw requestsResult.error;

      const products = productsResult.data || [];
      const orderRequests = requestsResult.data || [];

      if (products.length === 0 && orderRequests.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum produto de encomenda ou solicitação encontrada.",
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
      
      let yPosition = 40;
      
      // PARTE 1: PRODUTOS MARCADOS COMO ENCOMENDA
      if (products.length > 0) {
        doc.setFontSize(14);
        doc.text('Produtos para Encomenda', 20, yPosition);
        
        yPosition += 10;
        
        // Cabeçalhos
        doc.setFontSize(12);
        doc.text('Nome', 20, yPosition);
        doc.text('Categoria', 80, yPosition);
        doc.text('Preço Custo', 120, yPosition);
        doc.text('Preço Venda', 160, yPosition);
        doc.text('Qtd', 190, yPosition);
        
        yPosition += 5;
        
        // Linha separadora
        doc.line(20, yPosition, 200, yPosition);
        
        yPosition += 5;
        
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
        yPosition += 5;
        doc.line(20, yPosition, 200, yPosition);
        doc.setFontSize(12);
        yPosition += 10;
        doc.text(`Total de produtos para encomenda: ${products.length}`, 20, yPosition);
        
        const totalCost = products.reduce((sum, p) => sum + Number(p.cost_price), 0);
        const totalSale = products.reduce((sum, p) => sum + Number(p.sale_price), 0);
        const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
        
        yPosition += 8;
        doc.text(`Valor total custo: R$ ${totalCost.toFixed(2)}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Valor total venda: R$ ${totalSale.toFixed(2)}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Quantidade total: ${totalQuantity}`, 20, yPosition);
      }

      // PARTE 2: SOLICITAÇÕES DE ENCOMENDA
      if (orderRequests.length > 0) {
        yPosition += 20;
        
        // Verificar se é necessário uma nova página
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Solicitações de Encomenda', 20, yPosition);
        
        yPosition += 10;
        
        // Cabeçalhos
        doc.setFontSize(12);
        doc.text('Produto', 20, yPosition);
        doc.text('Cliente', 80, yPosition);
        doc.text('Qtd. Solicitada', 120, yPosition);
        doc.text('Status', 160, yPosition);
        
        yPosition += 5;
        
        // Linha separadora
        doc.line(20, yPosition, 200, yPosition);
        
        yPosition += 5;
        
        // Dados das solicitações
        doc.setFontSize(10);
        orderRequests.forEach((request) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          
          const productName = request.products?.name || 'Produto não encontrado';
          
          doc.text(productName.substring(0, 25), 20, yPosition);
          doc.text(request.customer_name.substring(0, 20), 80, yPosition);
          doc.text(request.requested_quantity.toString(), 120, yPosition);
          doc.text(request.status, 160, yPosition);
          
          yPosition += 8;
        });
        
        // Totais
        yPosition += 5;
        doc.line(20, yPosition, 200, yPosition);
        doc.setFontSize(12);
        yPosition += 10;
        doc.text(`Total de solicitações: ${orderRequests.length}`, 20, yPosition);
        
        // Contagem por status
        const statusCounts = orderRequests.reduce((acc, req) => {
          acc[req.status] = (acc[req.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        yPosition += 8;
        Object.entries(statusCounts).forEach(([status, count]) => {
          doc.text(`${status}: ${count}`, 20, yPosition);
          yPosition += 8;
        });
        
        // Total de produtos solicitados
        const totalRequestedQty = orderRequests.reduce((sum, req) => sum + req.requested_quantity, 0);
        yPosition += 4;
        doc.text(`Quantidade total solicitada: ${totalRequestedQty}`, 20, yPosition);
      }
      
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
