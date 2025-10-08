
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

const OrderProductsPDFReport = () => {
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
            image_url,
            categories(name)
          )
        `)
        .order('created_at', { ascending: false });

      // Buscar produtos do tipo encomenda cadastrados
      const orderProductsResult = await supabase
        .from('products')
        .select(`
          *,
          categories(name)
        `)
        .eq('is_order_product', true)
        .order('created_at', { ascending: false });

      if (requestsResult.error) throw requestsResult.error;
      if (orderProductsResult.error) throw orderProductsResult.error;

      const orderRequests = requestsResult.data || [];
      const orderProducts = orderProductsResult.data || [];

      if (orderRequests.length === 0 && orderProducts.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhuma encomenda encontrada.",
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
      doc.text('Foto', 20, yPosition);
      doc.text('Produto', 50, yPosition);
      doc.text('Qtd', 110, yPosition);
      doc.text('Preço Custo', 130, yPosition);
      doc.text('Preço Venda', 165, yPosition);
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
      let totalItems = 0;

      // Adicionar solicitações de encomenda
      for (const request of orderRequests) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        const productName = request.products?.name || 'Produto não encontrado';
        const costPrice = request.cost_price || request.products?.cost_price || 0;
        const salePrice = request.sale_price || request.products?.sale_price || 0;
        const quantity = request.requested_quantity;
        const imageUrl = request.products?.image_url;
        
        // Calcular totais
        totalCostPrice += costPrice * quantity;
        totalSalePrice += salePrice * quantity;
        totalQuantity += quantity;
        totalItems += 1;
        
        // Carregar e adicionar imagem se existir
        if (imageUrl) {
          try {
            const imageBase64 = await loadImageAsBase64(imageUrl);
            if (imageBase64) {
              const imageSize = 15;
              doc.addImage(imageBase64, 'JPEG', 20, yPosition - 12, imageSize, imageSize);
            }
          } catch (error) {
            console.error('Erro ao adicionar imagem:', error);
          }
        }
        
        doc.text(productName.substring(0, 20), 50, yPosition);
        doc.text(quantity.toString(), 110, yPosition);
        doc.text(`R$ ${costPrice.toFixed(2)}`, 130, yPosition);
        doc.text(`R$ ${salePrice.toFixed(2)}`, 165, yPosition);
        doc.text(new Date(request.created_at).toLocaleDateString('pt-BR'), 190, yPosition);
        
        yPosition += 20;
      }

      // Adicionar produtos do tipo encomenda
      for (const product of orderProducts) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        const productName = product.name;
        const costPrice = product.cost_price || 0;
        const salePrice = product.sale_price || 0;
        const quantity = product.quantity;
        const imageUrl = product.image_url;
        
        // Calcular totais
        totalCostPrice += costPrice * quantity;
        totalSalePrice += salePrice * quantity;
        totalQuantity += quantity;
        totalItems += 1;
        
        // Carregar e adicionar imagem se existir
        if (imageUrl) {
          try {
            const imageBase64 = await loadImageAsBase64(imageUrl);
            if (imageBase64) {
              const imageSize = 15;
              doc.addImage(imageBase64, 'JPEG', 20, yPosition - 12, imageSize, imageSize);
            }
          } catch (error) {
            console.error('Erro ao adicionar imagem:', error);
          }
        }
        
        doc.text(productName.substring(0, 20), 50, yPosition);
        doc.text(quantity.toString(), 110, yPosition);
        doc.text(`R$ ${costPrice.toFixed(2)}`, 130, yPosition);
        doc.text(`R$ ${salePrice.toFixed(2)}`, 165, yPosition);
        doc.text(new Date(product.created_at).toLocaleDateString('pt-BR'), 190, yPosition);
        
        yPosition += 20;
      }
      
      // Totais
      yPosition += 10;
      doc.line(20, yPosition, 200, yPosition);
      doc.setFontSize(12);
      yPosition += 10;
      doc.text(`Total de encomendas: ${totalItems}`, 20, yPosition);
      
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
