
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, Search, AlertTriangle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AuditLog } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AuditLogPage = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('30');
  const [tableFilter, setTableFilter] = useState('all');
  const [operationFilter, setOperationFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStockChanges, setShowStockChanges] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, [periodFilter]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const days = parseInt(periodFilter);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

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

  const filteredLogs = useMemo(() => {
    let filtered = auditLogs;

    // Filtro por tabela
    if (tableFilter !== 'all') {
      filtered = filtered.filter(log => log.table_name === tableFilter);
    }

    // Filtro por operação
    if (operationFilter !== 'all') {
      filtered = filtered.filter(log => log.operation === operationFilter);
    }

    // Filtro de alterações de estoque
    if (showStockChanges) {
      filtered = filtered.filter(log => {
        // Mostrar apenas alterações em produtos que envolvam quantity
        if (log.table_name !== 'products') return false;
        if (log.operation !== 'UPDATE') return false;
        
        const oldValues = log.old_values as any;
        const newValues = log.new_values as any;
        
        if (!oldValues || !newValues) return false;
        
        // Verificar se houve mudança na quantidade
        return oldValues.quantity !== newValues.quantity;
      });
    }

    // Busca por termo
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(log => {
        // Buscar no JSON de old_values e new_values
        const oldValuesStr = JSON.stringify(log.old_values || {}).toLowerCase();
        const newValuesStr = JSON.stringify(log.new_values || {}).toLowerCase();
        const userName = log.user_name.toLowerCase();
        const recordId = log.record_id.toLowerCase();
        
        return oldValuesStr.includes(searchLower) || 
               newValuesStr.includes(searchLower) ||
               userName.includes(searchLower) ||
               recordId.includes(searchLower);
      });
    }

    return filtered;
  }, [auditLogs, tableFilter, operationFilter, searchTerm, showStockChanges]);

  const clearFilters = () => {
    setTableFilter('all');
    setOperationFilter('all');
    setSearchTerm('');
    setShowStockChanges(false);
  };

  const hasActiveFilters = tableFilter !== 'all' || operationFilter !== 'all' || searchTerm || showStockChanges;

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
    const names: Record<string, string> = {
      products: 'Produtos',
      categories: 'Categorias',
      customers: 'Clientes',
      sales: 'Vendas',
      orders: 'Encomendas',
      order_items: 'Itens de Encomenda',
      expenses: 'Despesas',
    };
    return names[tableName] || tableName;
  };

  const formatJsonData = (data: any) => {
    if (!data) return 'Nenhum dado';
    return JSON.stringify(data, null, 2);
  };

  const getStockChangeInfo = (log: AuditLog) => {
    if (log.table_name !== 'products' || log.operation !== 'UPDATE') return null;
    
    const oldValues = log.old_values as any;
    const newValues = log.new_values as any;
    
    if (!oldValues || !newValues) return null;
    if (oldValues.quantity === newValues.quantity) return null;
    
    const diff = newValues.quantity - oldValues.quantity;
    const productName = newValues.name || oldValues.name || 'Produto';
    
    return {
      productName,
      oldQty: oldValues.quantity,
      newQty: newValues.quantity,
      diff,
    };
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

      {/* Filtros Avançados */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filtros para Investigação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm">Tabela</Label>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as tabelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tabelas</SelectItem>
                  <SelectItem value="products">Produtos</SelectItem>
                  <SelectItem value="sales">Vendas</SelectItem>
                  <SelectItem value="customers">Clientes</SelectItem>
                  <SelectItem value="categories">Categorias</SelectItem>
                  <SelectItem value="expenses">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm">Operação</Label>
              <Select value={operationFilter} onValueChange={setOperationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as operações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as operações</SelectItem>
                  <SelectItem value="INSERT">Inserção (INSERT)</SelectItem>
                  <SelectItem value="UPDATE">Atualização (UPDATE)</SelectItem>
                  <SelectItem value="DELETE">Exclusão (DELETE)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm">Buscar (nome, ID, valores)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Ex: nome do produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="flex flex-col justify-end">
              <Button 
                variant={showStockChanges ? "default" : "outline"}
                onClick={() => setShowStockChanges(!showStockChanges)}
                className={showStockChanges ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Alterações de Estoque
              </Button>
            </div>
          </div>
          
          {hasActiveFilters && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando <strong>{filteredLogs.length}</strong> de <strong>{auditLogs.length}</strong> registros
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dica para investigar divergências */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Dica para encontrar divergências de estoque:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-amber-700">
                <li>Clique em <strong>"Alterações de Estoque"</strong> para ver apenas mudanças de quantidade</li>
                <li>Use a <strong>busca</strong> para filtrar pelo nome do produto com problema</li>
                <li>Verifique o histórico de <strong>UPDATE</strong> no produto e compare com as <strong>Vendas</strong></li>
                <li>Clique em <strong>"Ver Detalhes"</strong> para ver os valores antes/depois da alteração</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

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
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum registro encontrado com os filtros aplicados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Operação</TableHead>
                  {showStockChanges && <TableHead>Alteração de Estoque</TableHead>}
                  <TableHead>ID do Registro</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const stockInfo = getStockChangeInfo(log);
                  
                  return (
                    <TableRow key={log.id} className={stockInfo && stockInfo.diff < 0 ? 'bg-red-50' : ''}>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">{log.user_name}</TableCell>
                      <TableCell>{getTableDisplayName(log.table_name)}</TableCell>
                      <TableCell>{getOperationBadge(log.operation)}</TableCell>
                      {showStockChanges && (
                        <TableCell>
                          {stockInfo && (
                            <div className="text-sm">
                              <div className="font-medium truncate max-w-[200px]" title={stockInfo.productName}>
                                {stockInfo.productName}
                              </div>
                              <div className={`text-xs ${stockInfo.diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {stockInfo.oldQty} → {stockInfo.newQty} ({stockInfo.diff > 0 ? '+' : ''}{stockInfo.diff})
                              </div>
                            </div>
                          )}
                        </TableCell>
                      )}
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
                              
                              {stockInfo && (
                                <div className={`p-3 rounded ${stockInfo.diff < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                                  <strong>Alteração de Estoque:</strong>
                                  <div className="mt-1">
                                    Produto: <strong>{stockInfo.productName}</strong>
                                  </div>
                                  <div>
                                    Quantidade: {stockInfo.oldQty} → {stockInfo.newQty} 
                                    <span className={`ml-2 font-bold ${stockInfo.diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      ({stockInfo.diff > 0 ? '+' : ''}{stockInfo.diff})
                                    </span>
                                  </div>
                                </div>
                              )}
                              
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogPage;
