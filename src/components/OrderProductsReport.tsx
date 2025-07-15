
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OrderProductsPDFReport from './OrderProductsPDFReport';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OrderProductsReport = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Relatórios de Encomendas</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/product-order-requests')}
            variant="outline"
          >
            <FileText className="w-4 h-4 mr-2" />
            Ver Solicitações de Encomenda
          </Button>
          <OrderProductsPDFReport />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Relatórios de Produtos para Encomendas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Utilize o botão "Relatório PDF Encomendas" para gerar um relatório completo 
            de todos os produtos marcados como encomenda e todas as solicitações de encomenda pendentes.
          </p>
          <p className="mt-4 text-gray-500">
            Para gerenciar solicitações de encomenda, clique em "Ver Solicitações de Encomenda".
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderProductsReport;
