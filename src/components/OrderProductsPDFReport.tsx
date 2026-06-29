
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { productOrderRequestsApi, productsApi, tenantBrandingApi } from '@/services/apiClient';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import {
  drawPageBackground,
  drawHeader,
  drawAllFooters,
  drawTableHeaderRow,
  drawAlternatingRow,
  drawImageFrame,
  drawSummaryCard,
  newPageIfNeeded,
  preloadImages,
  getColors,
  type TenantBranding,
} from '@/utils/pdfHelpers';

const SUBTITLE = 'Relatorio de Encomendas';

const TABLE_COLUMNS = [
  { label: 'FOTO', x: 16 },
  { label: 'PRODUTO', x: 36 },
  { label: 'QTD', x: 97 },
  { label: 'P.CUSTO', x: 112 },
  { label: 'P.VENDA', x: 142 },
  { label: 'DATA', x: 175 },
];

const OrderProductsPDFReport = () => {

  const generateOrderProductsReport = async () => {
    try {
      // Carregar branding
      let branding: TenantBranding | null = null;
      try {
        branding = await tenantBrandingApi.get();
      } catch { /* usa defaults */ }

      const colors = getColors(branding);

      const [orderRequests, allProducts] = await Promise.all([
        productOrderRequestsApi.list(),
        productsApi.list({ is_order_product: 'true' }),
      ]);

      const orderProducts = (allProducts || []).filter((p: any) => p.is_order_product);

      if ((orderRequests || []).length === 0 && orderProducts.length === 0) {
        toast({ title: "Aviso", description: "Nenhuma encomenda encontrada." });
        return;
      }

      const doc = new jsPDF();
      const ROW_HEIGHT = 20;

      drawPageBackground(doc, colors);
      await drawHeader(doc, SUBTITLE, branding, colors);

      let y = 38;
      y = drawTableHeaderRow(doc, TABLE_COLUMNS, y, colors);

      let totalCostPrice = 0;
      let totalSalePrice = 0;
      let totalQuantity = 0;
      let totalItems = 0;
      let rowIndex = 0;

      const allEntries = [
        ...(orderRequests || []).map((r: any) => ({
          name: r.product_name || 'Produto nao encontrado',
          costPrice: r.cost_price || 0,
          salePrice: r.sale_price || 0,
          quantity: r.requested_quantity,
          imageUrl: r.image_url,
          date: r.created_at,
        })),
        ...orderProducts.map((p: any) => ({
          name: p.name,
          costPrice: p.cost_price || 0,
          salePrice: p.sale_price || 0,
          quantity: p.quantity,
          imageUrl: p.image_url,
          date: p.created_at,
        })),
      ];

      // Pre-carregar imagens
      const imageItems = allEntries.map(e => ({ image_url: e.imageUrl }));
      const imageCache = await preloadImages(imageItems);

      for (const entry of allEntries) {
        const prevY = y;
        y = await newPageIfNeeded(doc, y, ROW_HEIGHT + 5, SUBTITLE, branding, colors);

        if (y < prevY) {
          y = drawTableHeaderRow(doc, TABLE_COLUMNS, y, colors);
          rowIndex = 0;
        }

        drawAlternatingRow(doc, y, rowIndex, ROW_HEIGHT, colors);

        const imageBase64 = entry.imageUrl ? (imageCache.get(entry.imageUrl) || null) : null;
        drawImageFrame(doc, imageBase64, 16, y - 3, 14);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.secondary);
        doc.text(entry.name.substring(0, 22), 36, y + 5);

        doc.setFont('helvetica', 'bold');
        doc.text(entry.quantity.toString(), 100, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.text(`R$ ${entry.costPrice.toFixed(2)}`, 112, y + 5);
        doc.text(`R$ ${entry.salePrice.toFixed(2)}`, 142, y + 5);
        doc.text(new Date(entry.date).toLocaleDateString('pt-BR'), 175, y + 5);

        totalCostPrice += entry.costPrice * entry.quantity;
        totalSalePrice += entry.salePrice * entry.quantity;
        totalQuantity += entry.quantity;
        totalItems += 1;

        y += ROW_HEIGHT;
        rowIndex++;
      }

      // Secao de resumo
      y += 10;
      y = await newPageIfNeeded(doc, y, 65, SUBTITLE, branding, colors);

      doc.setFillColor(...colors.burgundy);
      doc.roundedRect(15, y - 5, 180, 12, 3, 3, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Resumo', 23, y + 2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.secondary);
      y += 16;

      const cardW = 85;
      const cardH = 22;
      const gap = 10;

      drawSummaryCard(doc, 15, y, cardW, cardH, 'Total de Encomendas', totalItems.toString(), colors);
      drawSummaryCard(doc, 15 + cardW + gap, y, cardW, cardH, 'Quantidade Total', totalQuantity.toString(), colors);

      y += cardH + gap;

      drawSummaryCard(doc, 15, y, cardW, cardH, 'Valor Total Custo', `R$ ${totalCostPrice.toFixed(2)}`, colors);
      drawSummaryCard(doc, 15 + cardW + gap, y, cardW, cardH, 'Valor Total Venda', `R$ ${totalSalePrice.toFixed(2)}`, colors);

      drawAllFooters(doc, colors);
      doc.save(`relatorio-encomendas-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({ title: "Sucesso", description: "Relatorio PDF de encomendas gerado com sucesso!" });

    } catch (error) {
      console.error('Erro ao gerar relatorio:', error);
      toast({ title: "Erro", description: "Nao foi possivel gerar o relatorio PDF.", variant: "destructive" });
    }
  };

  return (
    <Button
      onClick={generateOrderProductsReport}
      className="bg-red-600 hover:bg-red-700 text-white"
    >
      <FileText className="w-4 h-4 mr-2" />
      Relatorio PDF Encomendas
    </Button>
  );
};

export default OrderProductsPDFReport;
