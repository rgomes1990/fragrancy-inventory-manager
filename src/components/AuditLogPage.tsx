
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AuditLog } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AuditLogPage = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('7');

  useEffect(() => {
    fetchAuditLogs();
  }, [periodFilter]);

  const fetchAuditLogs = async () => {
    try {
      const days = parseInt(periodFilter);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os logs de auditoria.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getOperationBadge = (operation: string) => {
    const variants = {
      INSERT: 'bg-green-100 text-green-800',
      UPDATE: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge className={variants[operation as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {operation}
      </Badge>
    );
  };

  const getTableDisplayName = (tableName: string) => {
    const names = {
      products: 'Produtos',
      categories: 'Categorias',
      customers: 'Clientes',
      sales: 'Vendas',
      orders: 'Encomendas',
      order_items: 'Itens de Encomenda',
    };
    return names[tableName as keyof typeof names] || tableName;
  };

  const formatJsonData = (data: any) => {
    if (!data) return 'Nenhum dado';
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Controle de Alterações</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Período:</span>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Último mês</SelectItem>
              <SelectItem value="60">Últimos 2 meses</SelectItem>
              <SelectItem value="90">Últimos 3 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Log de Auditoria</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando logs...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>ID do Registro</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium">{log.user_name}</TableCell>
                    <TableCell>{getTableDisplayName(log.table_name)}</TableCell>
                    <TableCell>{getOperationBadge(log.operation)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.record_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              Detalhes da Alteração - {getTableDisplayName(log.table_name)}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong>Usuário:</strong> {log.user_name}
                              </div>
                              <div>
                                <strong>Data/Hora:</strong> {new Date(log.created_at).toLocaleString('pt-BR')}
                              </div>
                              <div>
                                <strong>Operação:</strong> {getOperationBadge(log.operation)}
                              </div>
                              <div>
                                <strong>ID do Registro:</strong> {log.record_id}
                              </div>
                            </div>
                            
                            {log.operation !== 'INSERT' && log.old_values && (
                              <div>
                                <h4 className="font-semibold mb-2">Valores Anteriores:</h4>
                                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                                  {formatJsonData(log.old_values)}
                                </pre>
                              </div>
                            )}
                            
                            {log.operation !== 'DELETE' && log.new_values && (
                              <div>
                                <h4 className="font-semibold mb-2">Valores Novos:</h4>
                                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                                  {formatJsonData(log.new_values)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
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

export default AuditLogPage;
