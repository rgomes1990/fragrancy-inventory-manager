import jsPDF from 'jspdf';

// =====================================================
// Paleta de cores para PDFs da Fragrancy
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

export function drawPageBackground(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(...COLORS.offWhite);
  doc.rect(0, 0, w, h, 'F');
}

export function drawHeader(doc: jsPDF, subtitle: string) {
  const w = doc.internal.pageSize.getWidth();

  // Barra gold no topo
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 0, w, 22, 'F');

  // Linha fina charcoal embaixo da barra
  doc.setFillColor(...COLORS.charcoal);
  doc.rect(0, 22, w, 1, 'F');

  // Nome da marca
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FRAGRANCY', w / 2, 10, { align: 'center' });

  // Subtitulo
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, w / 2, 17, { align: 'center' });

  // Data de geracao
  doc.setTextColor(...COLORS.mediumGray);
  doc.setFontSize(8);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, w - 15, 30, { align: 'right' });

  // Reset text color
  doc.setTextColor(...COLORS.charcoal);
}

export function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const w = doc.internal.pageSize.getWidth();
  const y = 282;

  // Linha gold
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(15, y, w - 15, y);

  // Numero da pagina
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.mediumGray);
  doc.text(`Pagina ${pageNum} de ${totalPages}`, w / 2, y + 6, { align: 'center' });

  // Data
  doc.text(new Date().toLocaleDateString('pt-BR'), w - 15, y + 6, { align: 'right' });

  // Reset
  doc.setTextColor(...COLORS.charcoal);
}

export function drawAllFooters(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }
}

export function drawCategoryHeader(doc: jsPDF, name: string, y: number): number {
  doc.setFillColor(...COLORS.softGold);
  doc.roundedRect(15, y - 5, 180, 12, 3, 3, 'F');

  // Faixa gold na esquerda
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(15, y - 5, 4, 12, 2, 2, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.charcoal);
  doc.text(name, 23, y + 2);
  doc.setFont('helvetica', 'normal');

  return y + 14;
}

export function drawTableHeaderRow(doc: jsPDF, columns: { label: string; x: number }[], y: number): number {
  doc.setFillColor(...COLORS.charcoal);
  doc.rect(15, y - 5, 180, 9, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);

  for (const col of columns) {
    doc.text(col.label, col.x, y + 1);
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.charcoal);

  return y + 8;
}

export function drawAlternatingRow(doc: jsPDF, y: number, rowIndex: number, height: number) {
  const fill = rowIndex % 2 === 0 ? COLORS.cream : COLORS.white;
  doc.setFillColor(...fill);
  doc.rect(15, y - 5, 180, height, 'F');
}

export function drawImageFrame(doc: jsPDF, base64: string | null, x: number, y: number, size: number) {
  // Borda da moldura
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(x - 0.5, y - 0.5, size + 1, size + 1, 1, 1, 'S');

  if (base64) {
    try {
      doc.addImage(base64, 'JPEG', x, y, size, size);
    } catch (error) {
      // Imagem invalida — moldura fica vazia
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
  value: string
) {
  // Card background
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');

  // Gold left border
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(x, y, 3, height, 1.5, 1.5, 'F');

  // Label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text(label, x + 8, y + 7);

  // Value
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.charcoal);
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

    // Redimensionar para thumbnail (60x60px) e comprimir como JPEG 60%
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

  // Carregar em lotes de 5 para nao sobrecarregar
  for (let i = 0; i < unique.length; i += 5) {
    const batch = unique.slice(i, i + 5);
    const results = await Promise.all(batch.map(url => loadImageAsBase64(url)));
    batch.forEach((url, idx) => cache.set(url, results[idx]));
  }

  return cache;
}

export function newPageIfNeeded(doc: jsPDF, y: number, needed: number, subtitle: string): number {
  if (y + needed > 270) {
    doc.addPage();
    drawPageBackground(doc);
    drawHeader(doc, subtitle);
    return 38;
  }
  return y;
}
