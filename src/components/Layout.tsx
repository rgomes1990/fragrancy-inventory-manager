
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout = ({ children, currentPage, onPageChange }: LayoutProps) => {
  const isMobile = useIsMobile();
  const location = useLocation();

  // Update current page based on location
  useEffect(() => {
    const path = location.pathname;
    const page = path === '/' ? 'dashboard' : path.slice(1).replace('/', '-');
    onPageChange(page);
  }, [location.pathname, onPageChange]);

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar currentPage={currentPage} onPageChange={onPageChange} />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header com trigger do sidebar sempre visível */}
          <header className="h-14 border-b bg-white flex items-center px-4 lg:px-6 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {getPageTitle(currentPage)}
            </h2>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const getPageTitle = (page: string) => {
  const titles = {
    dashboard: 'Dashboard',
    products: 'Produtos',
    categories: 'Categorias',
    customers: 'Clientes',
    sales: 'Vendas',
    orders: 'Encomendas',
    'product-order-requests': 'Solicitações de Encomenda',
    reports: 'Relatórios',
    'profit-report': 'Lucro vs Investimento',
    'order-products-report': 'Relatório de Encomendas',
    audit: 'Auditoria',
    'audit-log': 'Auditoria',
  };
  return titles[page as keyof typeof titles] || 'Dashboard';
};

export default Layout;
