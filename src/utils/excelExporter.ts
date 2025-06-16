
import * as XLSX from 'xlsx';

interface ExportData {
  [key: string]: any;
}

export const exportToExcel = (data: ExportData[], fileName: string, sheetName: string = 'Sheet1') => {
  // Criar um novo workbook
  const workbook = XLSX.utils.book_new();
  
  // Converter os dados para uma planilha
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Adicionar a planilha ao workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Gerar o arquivo e fazer o download
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const formatProductsForExport = (products: any[]) => {
  return products.map(product => ({
    'Nome': product.name,
    'Categoria': product.categories?.name || 'Sem categoria',
    'Preço de Custo': `R$ ${Number(product.cost_price).toFixed(2)}`,
    'Preço de Venda': `R$ ${Number(product.sale_price).toFixed(2)}`,
    'Quantidade': product.quantity,
    'Status': product.quantity === 0 ? 'Sem estoque' : 'Disponível',
    'Investimento Total': `R$ ${(Number(product.cost_price) * Number(product.quantity)).toFixed(2)}`,
    'Valor Total': `R$ ${(Number(product.sale_price) * Number(product.quantity)).toFixed(2)}`,
    'Data de Criação': new Date(product.created_at).toLocaleDateString('pt-BR'),
    'Última Atualização': new Date(product.updated_at).toLocaleDateString('pt-BR')
  }));
};
