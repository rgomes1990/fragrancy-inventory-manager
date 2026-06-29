import React, { useState, useEffect, useRef } from 'react';
import { tenantBrandingApi, uploadFile } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Settings, Upload, RotateCcw, Save, Eye, Palette, Type, ImageIcon } from 'lucide-react';

interface BrandingData {
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

const DEFAULTS: BrandingData = {
  name: '',
  logo_url: null,
  primary_color: '#BF9B50',
  secondary_color: '#2D2D30',
  accent_color: '#F3EBD7',
};

const CompanySettingsPage: React.FC = () => {
  const [branding, setBranding] = useState<BrandingData>(DEFAULTS);
  const [original, setOriginal] = useState<BrandingData>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const data = await tenantBrandingApi.get();
      const loaded: BrandingData = {
        name: data.name || '',
        logo_url: data.logo_url || null,
        primary_color: data.primary_color || DEFAULTS.primary_color,
        secondary_color: data.secondary_color || DEFAULTS.secondary_color,
        accent_color: data.accent_color || DEFAULTS.accent_color,
      };
      setBranding(loaded);
      setOriginal(loaded);
    } catch (error) {
      console.error('Erro ao carregar branding:', error);
      toast({ title: 'Erro', description: 'Nao foi possivel carregar as configuracoes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!branding.name.trim()) {
      toast({ title: 'Aviso', description: 'O nome da empresa e obrigatorio.' });
      return;
    }
    setSaving(true);
    try {
      const updated = await tenantBrandingApi.update(branding);
      const saved: BrandingData = {
        name: updated.name,
        logo_url: updated.logo_url || null,
        primary_color: updated.primary_color || DEFAULTS.primary_color,
        secondary_color: updated.secondary_color || DEFAULTS.secondary_color,
        accent_color: updated.accent_color || DEFAULTS.accent_color,
      };
      setBranding(saved);
      setOriginal(saved);
      toast({ title: 'Sucesso', description: 'Configuracoes salvas com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({ title: 'Erro', description: 'Nao foi possivel salvar as configuracoes.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'Imagem muito grande. Maximo 5MB.' });
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file);
      setBranding(prev => ({ ...prev, logo_url: url }));
      toast({ title: 'Sucesso', description: 'Logo enviado com sucesso!' });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({ title: 'Erro', description: 'Falha ao enviar o logo.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setBranding(original);
  };

  const handleResetDefaults = () => {
    setBranding(prev => ({
      ...prev,
      primary_color: DEFAULTS.primary_color,
      secondary_color: DEFAULTS.secondary_color,
      accent_color: DEFAULTS.accent_color,
    }));
  };

  const hasChanges = JSON.stringify(branding) !== JSON.stringify(original);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
             style={{ background: branding.primary_color + '22' }}>
          <Settings className="w-6 h-6" style={{ color: branding.primary_color }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuracoes da Empresa</h1>
          <p className="text-sm text-muted-foreground">Personalize o visual dos seus catalogos e relatorios PDF</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-3 space-y-6">

          {/* Nome da Empresa */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Type className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Identidade</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-name">Nome da Empresa</Label>
                <Input
                  id="company-name"
                  value={branding.name}
                  onChange={e => setBranding(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome que aparecera nos PDFs"
                  className="text-base"
                />
              </div>
            </CardContent>
          </Card>

          {/* Logo */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Logotipo</span>
              </div>
              <div className="flex items-start gap-6">
                <div
                  className="w-28 h-28 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden shrink-0"
                  style={{ background: branding.secondary_color }}
                >
                  {branding.logo_url ? (
                    <img src={branding.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="space-y-3 flex-1">
                  <p className="text-sm text-muted-foreground">
                    Envie o logotipo da empresa. Recomendamos uma imagem com fundo transparente (PNG ou WebP).
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/webp,image/jpeg,image/gif"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Enviando...' : 'Enviar Logo'}
                    </Button>
                    {branding.logo_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBranding(prev => ({ ...prev, logo_url: null }))}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cores */}
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cores dos PDFs</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleResetDefaults} className="text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restaurar padrao
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Cor Principal */}
                <div className="space-y-2">
                  <Label htmlFor="primary-color" className="text-sm">Cor Principal</Label>
                  <p className="text-xs text-muted-foreground">Header e destaques</p>
                  <div className="flex items-center gap-3">
                    <label
                      className="w-12 h-12 rounded-xl cursor-pointer border border-border shadow-sm transition-transform hover:scale-105"
                      style={{ backgroundColor: branding.primary_color }}
                    >
                      <input
                        id="primary-color"
                        type="color"
                        value={branding.primary_color}
                        onChange={e => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="sr-only"
                      />
                    </label>
                    <Input
                      value={branding.primary_color}
                      onChange={e => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="font-mono text-sm uppercase w-24"
                      maxLength={7}
                    />
                  </div>
                </div>

                {/* Cor Secundaria */}
                <div className="space-y-2">
                  <Label htmlFor="secondary-color" className="text-sm">Cor Secundaria</Label>
                  <p className="text-xs text-muted-foreground">Textos e tabelas</p>
                  <div className="flex items-center gap-3">
                    <label
                      className="w-12 h-12 rounded-xl cursor-pointer border border-border shadow-sm transition-transform hover:scale-105"
                      style={{ backgroundColor: branding.secondary_color }}
                    >
                      <input
                        id="secondary-color"
                        type="color"
                        value={branding.secondary_color}
                        onChange={e => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                        className="sr-only"
                      />
                    </label>
                    <Input
                      value={branding.secondary_color}
                      onChange={e => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="font-mono text-sm uppercase w-24"
                      maxLength={7}
                    />
                  </div>
                </div>

                {/* Cor de Destaque */}
                <div className="space-y-2">
                  <Label htmlFor="accent-color" className="text-sm">Cor de Destaque</Label>
                  <p className="text-xs text-muted-foreground">Fundos e categorias</p>
                  <div className="flex items-center gap-3">
                    <label
                      className="w-12 h-12 rounded-xl cursor-pointer border border-border shadow-sm transition-transform hover:scale-105"
                      style={{ backgroundColor: branding.accent_color }}
                    >
                      <input
                        id="accent-color"
                        type="color"
                        value={branding.accent_color}
                        onChange={e => setBranding(prev => ({ ...prev, accent_color: e.target.value }))}
                        className="sr-only"
                      />
                    </label>
                    <Input
                      value={branding.accent_color}
                      onChange={e => setBranding(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="font-mono text-sm uppercase w-24"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acoes */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving || !hasChanges} className="px-8">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            {hasChanges && (
              <Button variant="ghost" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Desfazer alteracoes
              </Button>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Preview do PDF</span>
          </div>

          <Card className="overflow-hidden">
            <div className="bg-muted/30 p-1">
              {/* Mini PDF preview */}
              <div
                className="rounded-lg overflow-hidden shadow-sm"
                style={{ backgroundColor: '#FAF7F0', aspectRatio: '210/160' }}
              >
                {/* Header bar */}
                <div
                  className="w-full flex flex-col items-center justify-center relative"
                  style={{ backgroundColor: branding.primary_color, height: '52px' }}
                >
                  {/* Bottom line */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ backgroundColor: branding.secondary_color }}
                  />

                  {branding.logo_url ? (
                    <img
                      src={branding.logo_url}
                      alt="Logo"
                      className="h-8 object-contain"
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                  ) : (
                    <span
                      className="text-base font-bold tracking-wide"
                      style={{ color: '#fff' }}
                    >
                      {branding.name || 'NOME DA EMPRESA'}
                    </span>
                  )}
                  <span className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Catalogo de Estoque
                  </span>
                </div>

                {/* Content preview */}
                <div className="px-4 pt-3 space-y-2">
                  {/* Category header */}
                  <div className="flex items-center gap-1">
                    <div
                      className="w-1 h-4 rounded-sm"
                      style={{ backgroundColor: branding.primary_color }}
                    />
                    <div
                      className="flex-1 h-4 rounded-sm px-2 flex items-center"
                      style={{ backgroundColor: branding.accent_color }}
                    >
                      <span className="text-[8px] font-bold" style={{ color: branding.secondary_color }}>
                        Perfumes Femininos
                      </span>
                    </div>
                  </div>

                  {/* Table header */}
                  <div
                    className="h-3 rounded-sm flex items-center px-2 gap-6"
                    style={{ backgroundColor: branding.secondary_color }}
                  >
                    <span className="text-[6px] text-white font-bold">FOTO</span>
                    <span className="text-[6px] text-white font-bold">PRODUTO</span>
                    <span className="text-[6px] text-white font-bold ml-auto">QTD</span>
                    <span className="text-[6px] text-white font-bold">PRECO</span>
                  </div>

                  {/* Rows */}
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="h-5 rounded-sm flex items-center px-2 gap-2"
                      style={{ backgroundColor: i % 2 === 0 ? branding.accent_color + '88' : '#fff' }}
                    >
                      <div className="w-3.5 h-3.5 rounded border border-gray-200 bg-gray-100" />
                      <div className="w-16 h-1.5 rounded-full bg-gray-300" />
                      <div className="w-4 h-1.5 rounded-full bg-gray-300 ml-auto" />
                      <div className="w-8 h-1.5 rounded-full bg-gray-300" />
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-4 mt-3">
                  <div className="h-[1px]" style={{ backgroundColor: branding.primary_color + '66' }} />
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[6px] text-gray-400">Pagina 1 de 1</span>
                    <span className="text-[6px] text-gray-400">28/06/2026</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <p className="text-xs text-muted-foreground text-center">
            As cores e o logo serao aplicados nos PDFs de catalogo e relatorio de encomendas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompanySettingsPage;
