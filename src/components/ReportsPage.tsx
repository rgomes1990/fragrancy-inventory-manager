
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SalesReport {
  period: string;
  total_sales: number;
  total_revenue: number;
  avg_ticket: number;
}

interface ProductReport {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

interface CustomerReport {
  customer_name: string;
  total_purchases: number;
  total_spent: number;
}

const ReportsPage = () => {
  const [reportType, setReportType] = useState('sales');
  const [period, setPeriod] = useState('30');
  const [salesReport, setSalesReport] = useState<SalesReport[]>([]);
  const [productReport, setProductReport] = useState<ProductReport[]>([]);
  const [customerReport, setCustomerReport] = useState<CustomerReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [reportType, period]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (reportType === 'sales') {
        await fetchSalesReport();
      } else if (reportType === 'products') {
        await fetchProductReport();
      } else if (reportType === 'customers') {
        await fetchCustomerReport();
      }
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesReport = async () => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const { data, error } = await supabase
      .from('sales')
      .select('sale_date, total_price')
      .gte('sale_date', daysAgo.toISOString());

    if (error) throw error;

    // Agrupar por dia
    const grouped = data.reduce((acc: any, sale) => {
      const date = new Date(sale.sale_date).toLocaleDateString('pt-BR');
      if (!acc[date]) {
        acc[date] = { total_sales: 0, total_revenue: 0 };
      }
      acc[date].total_sales += 1;
      acc[date].total_revenue += Number(sale.total_price);
      return acc;
    }, {});

    const report = Object.entries(grouped).map(([date, data]: [string, any]) => ({
      period: date,
      total_sales: data.total_sales,
      total_revenue: data.total_revenue,
      avg_ticket: data.total_revenue / data.total_sales,
    }));

    setSalesReport(report.sort((a, b) => new Date(a.period.split('/').reverse().join('-')).getTime() - new Date(b.period.split('/').reverse().join('-')).getTime()));
  };

  const fetchProductReport = async () => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const { data, error } = await supabase
      .from('sales')
      .select(`
        quantity,
        total_price,
        products(name)
      `)
      .gte('sale_date', daysAgo.toISOString());

    if (error) throw error;

    const grouped = data.reduce((acc: any, sale) => {
      const productName = sale.products?.name || 'Produto não encontrado';
      if (!acc[productName]) {
        acc[productName] = { total_quantity: 0, total_revenue: 0 };
      }
      acc[productName].total_quantity += sale.quantity;
      acc[productName].total_revenue += Number(sale.total_price);
      return acc;
    }, {});

    const report = Object.entries(grouped).map(([name, data]: [string, any]) => ({
      product_name: name,
      total_quantity: data.total_quantity,
      total_revenue: data.total_revenue,
    }));

    setProductReport(report.sort((a, b) => b.total_revenue - a.total_revenue));
  };

  const fetchCustomerReport = async () => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const { data, error } = await supabase
      .from('sales')
      .select(`
        total_price,
        customers(name)
      `)
      .gte('sale_date', daysAgo.toISOString());

    if (error) throw error;

    const grouped = data.reduce((acc: any, sale) => {
      const customerName = sale.customers?.name || 'Cliente não encontrado';
      if (!acc[customerName]) {
        acc[customerName] = { total_purchases: 0, total_spent: 0 };
      }
      acc[customerName].total_purchases += 1;
      acc[customerName].total_spent += Number(sale.total_price);
      return acc;
    }, {});

    const report = Object.entries(grouped).map(([name, data]: [string, any]) => ({
      customer_name: name,
      total_purchases: data.total_purchases,
      total_spent: data.total_spent,
    }));

    setCustomerReport(report.sort((a, b) => b.total_spent - a.total_spent));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
        <div className="flex space-x-4">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Vendas por Período</SelectItem>
              <SelectItem value="products">Produtos Mais Vendidos</SelectItem>
              <SelectItem value="customers">Melhores Clientes</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">Carregando relatório...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {reportType === 'sales' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Vendas por Período - Últimos {period} dias</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Quantidade de Vendas</TableHead>
                      <TableHead>Receita Total</TableHead>
                      <TableHead>Ticket Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesReport.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.period}</TableCell>
                        <TableCell>{item.total_sales}</TableCell>
                        <TableCell>R$ {item.total_revenue.toFixed(2)}</TableCell>
                        <TableCell>R$ {item.avg_ticket.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {salesReport.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma venda encontrada no período selecionado
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {reportType === 'products' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Produtos Mais Vendidos - Últimos {period} dias</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Quantidade Vendida</TableHead>
                      <TableHead>Receita Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productReport.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>{item.total_quantity}</TableCell>
                        <TableCell>R$ {item.total_revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {productReport.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma venda encontrada no período selecionado
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {reportType === 'customers' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Melhores Clientes - Últimos {period} dias</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Compras Realizadas</TableHead>
                      <TableHead>Total Gasto</TableHead>
                      <TableHead>Gasto Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerReport.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.customer_name}</TableCell>
                        <TableCell>{item.total_purchases}</TableCell>
                        <TableCell>R$ {item.total_spent.toFixed(2)}</TableCell>
                        <TableCell>R$ {(item.total_spent / item.total_purchases).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {customerReport.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma venda encontrada no período selecionado
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
