
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Product } from '@/types/database';
import jsPDF from 'jspdf';

interface ExtendedProduct extends Product {
  categories?: {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
  } | null;
}

const OrderProductsReport = () => {
  const [orderProducts, setOrderProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderProducts();
  }, []);

  const fetchOrderProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          cost_price,
          sale_price,
          quantity,
          category_id,
          image_url,
          created_at,
          updated_at,
          is_order_product,
          categories (
            id,
            name,
            created_at,
            updated_at
          )
        `)
        .eq('is_order_product', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrderProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos de encomenda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos de encomenda.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(20);
      doc.text('Relatório de Produtos de Encomenda', 20, 20);
      
      // Data do relatório
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
      
      // Cabeçalho da tabela
      doc.setFontSize(12);
      let y = 50;
      doc.text('Nome', 20, y);
      doc.text('Categoria', 80, y);
      doc.text('Preço Custo', 130, y);
      doc.text('Preço Venda', 170, y);
      
      // Linha horizontal
      doc.line(20, y + 2, 190, y + 2);
      
      // Dados
      doc.setFontSize(10);
      orderProducts.forEach((product, index) => {
        y += 10;
        
        // Nova página se necessário
        if (y > 270) {
          doc.addPage();
          y = 30;
        }
        
        doc.text(product.name.substring(0, 25), 20, y);
        doc.text(product.categories?.name || 'Sem categoria', 80, y);
        doc.text(`R$ ${product.cost_price.toFixed(2)}`, 130, y);
        doc.text(`R$ ${product.sale_price.toFixed(2)}`, 170, y);
      });
      
      // Resumo
      y += 15;
      if (y > 270) {
        doc.addPage();
        y = 30;
      }
      
      doc.setFontSize(12);
      doc.text(`Total de produtos de encomenda: ${orderProducts.length}`, 20, y);
      
      const totalCost = orderProducts.reduce((sum, p) => sum + Number(p.cost_price), 0);
      const totalSale = orderProducts.reduce((sum, p) => sum + Number(p.sale_price), 0);
      
      doc.text(`Valor total de custo: R$ ${totalCost.toFixed(2)}`, 20, y + 10);
      doc.text(`Valor total de venda: R$ ${totalSale.toFixed(2)}`, 20, y + 20);
      
      // Salvar PDF
      const fileName = `produtos-encomenda-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "Sucesso",
        description: "Relatório exportado para PDF com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar o relatório.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p>Carregando produtos de encomenda...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Produtos de Encomenda</h2>
        <Button 
          onClick={exportToPDF}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          disabled={orderProducts.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">
              Total de produtos de encomenda: {orderProducts.length}
            </span>
          </div>
          {orderProducts.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-yellow-700">Valor total de custo:</span>
                <p className="font-bold text-yellow-800">
                  R$ {orderProducts.reduce((sum, p) => sum + Number(p.cost_price), 0).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-yellow-700">Valor total de venda:</span>
                <p className="font-bold text-yellow-800">
                  R$ {orderProducts.reduce((sum, p) => sum + Number(p.sale_price), 0).toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Lista de Produtos de Encomenda</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orderProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum produto de encomenda encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço de Custo</TableHead>
                  <TableHead>Preço de Venda</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.categories?.name || 'Sem categoria'}</TableCell>
                    <TableCell>R$ {product.cost_price.toFixed(2)}</TableCell>
                    <TableCell>R$ {product.sale_price.toFixed(2)}</TableCell>
                    <TableCell>
                      {new Date(product.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderProductsReport;
