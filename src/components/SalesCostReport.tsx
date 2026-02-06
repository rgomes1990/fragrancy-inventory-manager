
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, FileText, TrendingUp, DollarSign, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';

interface SaleCostData {
  id: string;
  sale_date: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total_sale: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
  customer_name: string;
  seller: string;
}

const SalesCostReport = () => {
  const { tenantId } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesData, setSalesData] = useState<SaleCostData[]>([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({
    totalSales: 0,
    totalCost: 0,
    totalProfit: 0,
    avgMargin: 0
  });

  const fetchSalesCostData = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('sales')
        .select(`
          id,
          sale_date,
          quantity,
          unit_price,
          total_price,
          seller,
          products(name, cost_price),
          customers(name)
        `)
        .eq('tenant_id', tenantId)
        .order('sale_date', { ascending: false });

      if (startDate) {
        query = query.gte('sale_date', startDate);
      }
      if (endDate) {
        query = query.lte('sale_date', endDate + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;

      const processedData: SaleCostData[] = (data || []).map((sale: any) => {
        const costPrice = sale.products?.cost_price || 0;
        const totalCost = costPrice * sale.quantity;
        const totalSale = Number(sale.total_price);
        const profit = totalSale - totalCost;
        const profitMargin = totalSale > 0 ? (profit / totalSale) * 100 : 0;

        return {
          id: sale.id,
          sale_date: sale.sale_date,
          product_name: sale.products?.name || 'Produto não encontrado',
          quantity: sale.quantity,
          unit_price: sale.unit_price,
          cost_price: costPrice,
          total_sale: totalSale,
          total_cost: totalCost,
          profit: profit,
          profit_margin: profitMargin,
          customer_name: sale.customers?.name || 'Sem cliente',
          seller: sale.seller || 'Não informado'
        };
      });

      setSalesData(processedData);

      // Calculate totals
      const totalSales = processedData.reduce((sum, item) => sum + item.total_sale, 0);
      const totalCost = processedData.reduce((sum, item) => sum + item.total_cost, 0);
      const totalProfit = processedData.reduce((sum, item) => sum + item.profit, 0);
      const avgMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

      setTotals({ totalSales, totalCost, totalProfit, avgMargin });
    } catch (error) {
      console.error('Erro ao buscar dados de custo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchSalesCostData();
    }
  }, [tenantId]);

  const handleFilter = () => {
    fetchSalesCostData();
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Custos de Vendas', pageWidth / 2, 20, { align: 'center' });
    
    // Period
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const periodText = startDate && endDate 
      ? `Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`
      : 'Período: Todas as vendas';
    doc.text(periodText, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, 34, { align: 'center' });

    // Summary cards
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(14, 42, 44, 22, 2, 2, 'F');
    doc.roundedRect(62, 42, 44, 22, 2, 2, 'F');
    doc.roundedRect(110, 42, 44, 22, 2, 2, 'F');
    doc.roundedRect(158, 42, 38, 22, 2, 2, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Vendas', 36, 50, { align: 'center' });
    doc.text('Total Custo', 84, 50, { align: 'center' });
    doc.text('Lucro Total', 132, 50, { align: 'center' });
    doc.text('Margem Média', 177, 50, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`R$ ${totals.totalSales.toFixed(2)}`, 36, 58, { align: 'center' });
    doc.text(`R$ ${totals.totalCost.toFixed(2)}`, 84, 58, { align: 'center' });
    doc.text(`R$ ${totals.totalProfit.toFixed(2)}`, 132, 58, { align: 'center' });
    doc.text(`${totals.avgMargin.toFixed(1)}%`, 177, 58, { align: 'center' });

    // Table header
    let yPos = 74;
    doc.setFillColor(59, 130, 246);
    doc.rect(14, yPos, pageWidth - 28, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Data', 16, yPos + 5.5);
    doc.text('Produto', 34, yPos + 5.5);
    doc.text('Qtd', 80, yPos + 5.5);
    doc.text('Custo Un.', 92, yPos + 5.5);
    doc.text('Venda Un.', 114, yPos + 5.5);
    doc.text('Custo Total', 136, yPos + 5.5);
    doc.text('Venda Total', 158, yPos + 5.5);
    doc.text('Lucro', 180, yPos + 5.5);

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    salesData.forEach((sale, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, yPos, pageWidth - 28, 7, 'F');
      }

      doc.setFontSize(6);
      doc.text(new Date(sale.sale_date).toLocaleDateString('pt-BR'), 16, yPos + 4.5);
      doc.text(sale.product_name.substring(0, 22), 34, yPos + 4.5);
      doc.text(sale.quantity.toString(), 80, yPos + 4.5);
      doc.text(`R$ ${sale.cost_price.toFixed(2)}`, 92, yPos + 4.5);
      doc.text(`R$ ${sale.unit_price.toFixed(2)}`, 114, yPos + 4.5);
      doc.text(`R$ ${sale.total_cost.toFixed(2)}`, 136, yPos + 4.5);
      doc.text(`R$ ${sale.total_sale.toFixed(2)}`, 158, yPos + 4.5);
      
      const profitColor = sale.profit >= 0 ? [34, 197, 94] : [239, 68, 68];
      doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
      doc.text(`R$ ${sale.profit.toFixed(2)}`, 180, yPos + 4.5);
      doc.setTextColor(0, 0, 0);

      yPos += 7;
    });

    // Footer
    doc.setFontSize(8);
    doc.text(`Total de vendas: ${salesData.length}`, 14, yPos + 10);

    doc.save(`relatorio-custos-vendas-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Relatório de Custos</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Filtrar por Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Data Final</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-44"
              />
            </div>
            <Button onClick={handleFilter} disabled={loading}>
              {loading ? 'Carregando...' : 'Filtrar'}
            </Button>
            <Button onClick={generatePDF} variant="outline" className="gap-2" disabled={salesData.length === 0}>
              <FileText className="w-4 h-4" />
              Gerar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Vendas</p>
                <p className="text-2xl font-bold text-foreground">R$ {totals.totalSales.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Custo</p>
                <p className="text-2xl font-bold text-red-600">R$ {totals.totalCost.toFixed(2)}</p>
              </div>
              <Package className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lucro Total</p>
                <p className={`text-2xl font-bold ${totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {totals.totalProfit.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Margem Média</p>
                <p className={`text-2xl font-bold ${totals.avgMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totals.avgMargin.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento de Vendas ({salesData.length} registros)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando dados...</div>
          ) : salesData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma venda encontrada no período selecionado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Custo Un.</TableHead>
                    <TableHead className="text-right">Venda Un.</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">Venda Total</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{new Date(sale.sale_date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="font-medium">{sale.product_name}</TableCell>
                      <TableCell>{sale.customer_name}</TableCell>
                      <TableCell className="text-center">{sale.quantity}</TableCell>
                      <TableCell className="text-right">R$ {sale.cost_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">R$ {sale.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-red-600">R$ {sale.total_cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">R$ {sale.total_sale.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-medium ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {sale.profit.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right ${sale.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {sale.profit_margin.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesCostReport;
