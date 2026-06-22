import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Plus, ShoppingCart, Trash2, Edit } from 'lucide-react';
import { kitsApi, productsApi, salesApi } from '@/services/apiClient';
import { toast } from '@/hooks/use-toast';
import { Kit, Product } from '@/types/database';
import { useTenantFilter } from '@/hooks/useTenantFilter';
import KitFormDialog from './KitFormDialog';

const KitsPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenantId, isAdmin } = useTenantFilter();
  const [kits, setKits] = useState<Kit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);

  const fetchData = async () => {
    if (!isAdmin && !tenantId) { setLoading(false); return; }
    try {
      const [kitsData, prodData] = await Promise.all([
        kitsApi.list(),
        productsApi.list(),
      ]);
      setKits((kitsData || []) as any);
      setProducts(prodData || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Não foi possível carregar os kits.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin || tenantId) fetchData(); }, [tenantId, isAdmin]);

  const availability = (kit: Kit): number => {
    if (!kit.kit_items || kit.kit_items.length === 0) return 0;
    let min = Infinity;
    for (const it of kit.kit_items) {
      const stock = it.products?.quantity ?? it.product_quantity ?? 0;
      const possible = Math.floor(stock / it.quantity);
      if (possible < min) min = possible;
    }
    return min === Infinity ? 0 : min;
  };

  const handleDelete = async (kit: Kit) => {
    try {
      const salesData = await salesApi.list();
      const kitSales = (salesData || []).filter((s: any) => s.kit_id === kit.id);
      if (kitSales.length > 0) {
        toast({ title: 'Exclusão bloqueada', description: 'Kit possui vendas vinculadas.', variant: 'destructive' });
        return;
      }
      if (!confirm(`Excluir o kit "${kit.name}"?`)) return;
      await kitsApi.delete(kit.id);
      toast({ title: 'Sucesso', description: 'Kit excluído.' });
      fetchData();
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    }
  };

  const openCreate = () => { setEditingKit(null); setDialogOpen(true); };
  const openEdit = (k: Kit) => { setEditingKit(k); setDialogOpen(true); };

  if (loading) {
    return <Card><CardContent className="p-8 text-center">Carregando kits...</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Kits</h2>
          <p className="text-sm text-muted-foreground">Produtos compostos com baixa automática</p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600">
          <Plus className="w-4 h-4 mr-2" /> Criar Kit
        </Button>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        🎁 Ao vender um Kit, o sistema dá baixa automática em cada produto individual.
      </div>

      {kits.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum kit cadastrado ainda.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {kits.map(kit => {
            const avail = availability(kit);
            const itemsText = (kit.kit_items || [])
              .map(it => `${it.product_name || it.products?.name || '?'} x${it.quantity}`)
              .join(', ') || '—';
            return (
              <Card key={kit.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-foreground flex items-start gap-1 min-w-0">
                      <Gift className="w-4 h-4 mt-1 shrink-0 text-amber-500" />
                      <span className="break-words">{kit.name}</span>
                    </h3>
                    <span className="font-bold text-primary whitespace-nowrap">R$ {Number(kit.sale_price).toFixed(2)}</span>
                  </div>
                  {kit.description && <p className="text-sm text-muted-foreground">{kit.description}</p>}
                  <div className="bg-muted/50 rounded px-2 py-1.5 text-xs">
                    <span className="font-semibold">Itens: </span>{itemsText}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${avail > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                      Disponível: {avail}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(kit)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(kit)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" disabled={avail === 0} onClick={() => navigate('/sales?newKit=' + kit.id)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600">
                        <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Vender
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <KitFormDialog open={dialogOpen} onOpenChange={setDialogOpen} kit={editingKit} products={products} onSaved={fetchData} />
    </div>
  );
};

export default KitsPage;
