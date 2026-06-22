
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import AppSidebar from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

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
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar currentPage={currentPage} onPageChange={onPageChange} />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header com trigger do sidebar sempre visível */}
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
            <div className="flex items-center">
              <SidebarTrigger className="mr-4" />
              <h2 className="text-lg font-serif font-semibold text-foreground truncate">
                {getPageTitle(currentPage)}
              </h2>
            </div>
            <UserInfo />
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

const UserInfo = () => {
  const { logout, userData } = useAuth();
  const navigate = useNavigate();
  const username = userData?.username || '';
  // Formatar nome: "rogerio-perfumes" -> "Rogerio"
  const displayName = username.split('-')[0].replace(/^\w/, (c: string) => c.toUpperCase());

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
          {displayName.charAt(0)}
        </div>
        <span className="text-sm font-medium text-foreground">{displayName}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        className="flex items-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        Sair
      </Button>
    </div>
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
    'product-order-requests': 'Encomendas',
    expenses: 'Despesas',
    reports: 'Relatórios',
    'profit-report': 'Lucro vs Investimento',
    'order-products-report': 'Relatório de Encomendas',
    audit: 'Auditoria',
    'audit-log': 'Auditoria',
  };
  return titles[page as keyof typeof titles] || 'Dashboard';
};

export default Layout;
