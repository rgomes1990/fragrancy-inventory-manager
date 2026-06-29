import jsPDF from 'jspdf';

// =====================================================
// Branding interface
// =====================================================
export interface TenantBranding {
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

type RGB = readonly [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

// Gera uma versao mais clara da cor (para fundos suaves)
function lighten(rgb: RGB, amount: number): RGB {
  return [
    Math.min(255, rgb[0] + (255 - rgb[0]) * amount),
    Math.min(255, rgb[1] + (255 - rgb[1]) * amount),
    Math.min(255, rgb[2] + (255 - rgb[2]) * amount),
  ] as unknown as RGB;
}

// =====================================================
// Paleta de cores - defaults e dinamica
// =====================================================
export const COLORS = {
  gold: [191, 155, 80] as const,
  charcoal: [45, 45, 48] as const,
  cream: [245, 240, 230] as const,
  offWhite: [250, 247, 240] as const,
  white: [255, 255, 255] as const,
  softGold: [243, 235, 215] as const,
  mediumGray: [150, 150, 150] as const,
  burgundy: [120, 40, 50] as const,
  lightGray: [220, 220, 220] as const,
};

export interface PdfColors {
  primary: RGB;
  secondary: RGB;
  accent: RGB;
  accentLight: RGB;
  cream: RGB;
  offWhite: RGB;
  white: RGB;
  mediumGray: RGB;
  burgundy: RGB;
  lightGray: RGB;
}

export function getColors(branding?: TenantBranding | null): PdfColors {
  if (!branding) {
    return {
      primary: COLORS.gold,
      secondary: COLORS.charcoal,
      accent: COLORS.softGold,
      accentLight: COLORS.cream,
      cream: COLORS.cream,
      offWhite: COLORS.offWhite,
      white: COLORS.white,
      mediumGray: COLORS.mediumGray,
      burgundy: COLORS.burgundy,
      lightGray: COLORS.lightGray,
    };
  }

  const primary = hexToRgb(branding.primary_color);
  const secondary = hexToRgb(branding.secondary_color);
  const accent = hexToRgb(branding.accent_color);

  return {
    primary,
    secondary,
    accent,
    accentLight: lighten(accent, 0.4),
    cream: lighten(accent, 0.4),
    offWhite: lighten(accent, 0.7),
    white: COLORS.white,
    mediumGray: COLORS.mediumGray,
    burgundy: COLORS.burgundy,
    lightGray: COLORS.lightGray,
  };
}

// =====================================================
// Logo cache (carregado uma vez por sessao de geracao)
// =====================================================
let cachedLogoBase64: string | null = null;
let cachedLogoUrl: string | null = null;

async function getLogoBase64(logoUrl: string): Promise<string | null> {
  if (cachedLogoUrl === logoUrl && cachedLogoBase64) return cachedLogoBase64;

  try {
    const API_BASE = import.meta.env.VITE_API_URL || '/api';
    const proxyUrl = `${API_BASE}/image-proxy?url=${encodeURIComponent(logoUrl)}`;
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(proxyUrl, { headers });
    if (!response.ok) return null;

    const blob = await response.blob();
    const bitmapUrl = URL.createObjectURL(blob);

    const result = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Logo maior para qualidade (200px largura)
        const maxW = 200;
        const scale = maxW / img.width;
        const w = maxW;
        const h = img.height * scale;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(bitmapUrl);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(bitmapUrl);
        resolve(null);
      };
      img.src = bitmapUrl;
    });

    cachedLogoBase64 = result;
    cachedLogoUrl = logoUrl;
    return result;
  } catch {
    return null;
  }
}

// =====================================================
// Funcoes de desenho
// =====================================================

export function drawPageBackground(doc: jsPDF, colors: PdfColors) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(...colors.offWhite);
  doc.rect(0, 0, w, h, 'F');
}

export async function drawHeader(doc: jsPDF, subtitle: string, branding?: TenantBranding | null, colors?: PdfColors) {
  const c = colors || getColors(branding);
  const w = doc.internal.pageSize.getWidth();

  // Barra principal no topo
  doc.setFillColor(...c.primary);
  doc.rect(0, 0, w, 22, 'F');

  // Linha fina embaixo da barra
  doc.setFillColor(...c.secondary);
  doc.rect(0, 22, w, 1, 'F');

  // Logo ou nome da empresa
  doc.setTextColor(...c.white);
  if (branding?.logo_url) {
    const logoBase64 = await getLogoBase64(branding.logo_url);
    if (logoBase64) {
      // Centralizar logo no header (altura max 14mm)
      const logoH = 14;
      const logoW = 50; // largura max
      doc.addImage(logoBase64, 'PNG', (w - logoW) / 2, 1, logoW, logoH);
      // Subtitulo abaixo do logo
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, w / 2, 19, { align: 'center' });
    } else {
      drawTextHeader(doc, branding?.name || 'FRAGRANCY', subtitle, w);
    }
  } else {
    drawTextHeader(doc, branding?.name || 'FRAGRANCY', subtitle, w);
  }

  // Data de geracao
  doc.setTextColor(...c.mediumGray);
  doc.setFontSize(8);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, w - 15, 30, { align: 'right' });

  // Reset text color
  doc.setTextColor(...c.secondary);
}

function drawTextHeader(doc: jsPDF, name: string, subtitle: string, w: number) {
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(name.toUpperCase(), w / 2, 10, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, w / 2, 17, { align: 'center' });
}

export function drawFooter(doc: jsPDF, pageNum: number, totalPages: number, colors: PdfColors) {
  const w = doc.internal.pageSize.getWidth();
  const y = 282;

  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(15, y, w - 15, y);

  doc.setFontSize(8);
  doc.setTextColor(...colors.mediumGray);
  doc.text(`Pagina ${pageNum} de ${totalPages}`, w / 2, y + 6, { align: 'center' });
  doc.text(new Date().toLocaleDateString('pt-BR'), w - 15, y + 6, { align: 'right' });

  doc.setTextColor(...colors.secondary);
}

export function drawAllFooters(doc: jsPDF, colors: PdfColors) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages, colors);
  }
}

export function drawCategoryHeader(doc: jsPDF, name: string, y: number, colors: PdfColors): number {
  doc.setFillColor(...colors.accent);
  doc.roundedRect(15, y - 5, 180, 12, 3, 3, 'F');

  doc.setFillColor(...colors.primary);
  doc.roundedRect(15, y - 5, 4, 12, 2, 2, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.secondary);
  doc.text(name, 23, y + 2);
  doc.setFont('helvetica', 'normal');

  return y + 14;
}

export function drawTableHeaderRow(doc: jsPDF, columns: { label: string; x: number }[], y: number, colors: PdfColors): number {
  doc.setFillColor(...colors.secondary);
  doc.rect(15, y - 5, 180, 9, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.white);

  for (const col of columns) {
    doc.text(col.label, col.x, y + 1);
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.secondary);

  return y + 8;
}

export function drawAlternatingRow(doc: jsPDF, y: number, rowIndex: number, height: number, colors: PdfColors) {
  const fill = rowIndex % 2 === 0 ? colors.cream : colors.white;
  doc.setFillColor(...fill);
  doc.rect(15, y - 5, 180, height, 'F');
}

export function drawImageFrame(doc: jsPDF, base64: string | null, x: number, y: number, size: number) {
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(x - 0.5, y - 0.5, size + 1, size + 1, 1, 1, 'S');

  if (base64) {
    try {
      doc.addImage(base64, 'JPEG', x, y, size, size);
    } catch {
      // Imagem invalida
    }
  }
}

export function drawSummaryCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  colors: PdfColors
) {
  doc.setFillColor(...colors.white);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');

  doc.setFillColor(...colors.primary);
  doc.roundedRect(x, y, 3, height, 1.5, 1.5, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text(label, x + 8, y + 7);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.secondary);
  doc.text(value, x + 8, y + 16);

  doc.setFont('helvetica', 'normal');
}

export async function loadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const API_BASE = import.meta.env.VITE_API_URL || '/api';
    const proxyUrl = `${API_BASE}/image-proxy?url=${encodeURIComponent(imageUrl)}`;

    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(proxyUrl, { headers });
    if (!response.ok) return null;

    const blob = await response.blob();
    const bitmapUrl = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const size = 60;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(bitmapUrl);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => {
        URL.revokeObjectURL(bitmapUrl);
        resolve(null);
      };
      img.src = bitmapUrl;
    });
  } catch {
    return null;
  }
}

export async function preloadImages(
  items: { image_url?: string }[]
): Promise<Map<string, string | null>> {
  const cache = new Map<string, string | null>();
  const unique = [...new Set(items.map(i => i.image_url).filter(Boolean))] as string[];

  for (let i = 0; i < unique.length; i += 5) {
    const batch = unique.slice(i, i + 5);
    const results = await Promise.all(batch.map(url => loadImageAsBase64(url)));
    batch.forEach((url, idx) => cache.set(url, results[idx]));
  }

  return cache;
}

export async function newPageIfNeeded(doc: jsPDF, y: number, needed: number, subtitle: string, branding?: TenantBranding | null, colors?: PdfColors): Promise<number> {
  const c = colors || getColors(branding);
  if (y + needed > 270) {
    doc.addPage();
    drawPageBackground(doc, c);
    await drawHeader(doc, subtitle, branding, c);
    return 38;
  }
  return y;
}
