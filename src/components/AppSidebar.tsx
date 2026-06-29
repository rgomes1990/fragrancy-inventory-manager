import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import logoImg from '@/assets/logo.png';
import {
  Home,
  Package,
  ClipboardList,
  Users,
  ShoppingCart,
  Shield,
  Receipt,
  UserCog,
  Building2,
  Settings,
  UserCheck,
  FileBarChart,
  Truck,
  Wallet,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

interface AppSidebarProps {
  currentPage?: string;
  onPageChange?: (page: string) => void;
}

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  page: string;
  adminOnly?: boolean;
  /** tailwind classes for icon tile background + icon color */
  tone: string;
};

const PRINCIPAL: MenuItem[] = [
  { title: 'Dashboard', url: '/', page: '', icon: Home, tone: 'bg-indigo-100 text-indigo-600' },
  { title: 'Produtos', url: '/products', page: 'products', icon: Package, tone: 'bg-amber-100 text-amber-600' },
  { title: 'Categorias', url: '/categories', page: 'categories', icon: ClipboardList, tone: 'bg-sky-100 text-sky-600' },
  { title: 'Vendas (PDV)', url: '/sales', page: 'sales', icon: ShoppingCart, tone: 'bg-violet-100 text-violet-600' },
  { title: 'A Receber', url: '/receivables', page: 'receivables', icon: Wallet, tone: 'bg-emerald-100 text-emerald-600' },
  { title: 'Caixa', url: '/cash-closings', page: 'cash-closings', icon: Wallet, tone: 'bg-lime-100 text-lime-700' },
];

const GESTAO: MenuItem[] = [
  { title: 'Clientes', url: '/customers', page: 'customers', icon: Users, tone: 'bg-rose-100 text-rose-600' },
  { title: 'Vendedores', url: '/sellers', page: 'sellers', icon: UserCheck, tone: 'bg-emerald-100 text-emerald-600' },
  { title: 'Fornecedores', url: '/suppliers', page: 'suppliers', icon: Truck, tone: 'bg-orange-100 text-orange-600' },
  { title: 'Despesas', url: '/expenses', page: 'expenses', icon: Receipt, tone: 'bg-pink-100 text-pink-600' },
];

const OUTROS: MenuItem[] = [
  { title: 'Relatório de Custos', url: '/sales-cost-report', page: 'sales-cost-report', icon: FileBarChart, tone: 'bg-teal-100 text-teal-600' },
  { title: 'Relatório de Auditoria', url: '/audit-log', page: 'audit-log', icon: Shield, tone: 'bg-yellow-100 text-yellow-700' },
  { title: 'Config. Empresa', url: '/company-settings', page: 'company-settings', icon: Settings, tone: 'bg-gray-100 text-gray-600' },
  { title: 'Empresas', url: '/tenants', page: 'tenants', icon: Building2, adminOnly: true, tone: 'bg-slate-100 text-slate-600' },
  { title: 'Usuários', url: '/users', page: 'users', icon: UserCog, adminOnly: true, tone: 'bg-fuchsia-100 text-fuchsia-600' },
];

const AppSidebar: React.FC<AppSidebarProps> = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();

  const isActive = (page: string) => {
    if (page === '') return location.pathname === '/';
    return location.pathname.includes(page);
  };

  const filter = (items: MenuItem[]) => items.filter(i => !i.adminOnly || isAdmin);

  const renderGroup = (label: string, items: MenuItem[]) => {
    const visible = filter(items);
    if (visible.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground/70 px-3 mt-2">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => {
              const active = isActive(item.page);
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    className={`h-11 rounded-xl my-0.5 transition-all ${
                      active
                        ? 'bg-accent text-accent-foreground font-semibold shadow-sm'
                        : 'hover:bg-muted/70'
                    }`}
                  >
                    <Link to={item.url} onClick={() => { if (isMobile) setOpenMobile(false); }} className="flex items-center gap-3 px-2">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.tone}`}>
                        <item.icon className="w-[18px] h-[18px]" />
                      </span>
                      <span className="text-[14px]">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent className="px-2">
        {/* Brand */}
        <div className="flex items-center gap-3 px-3 pt-5 pb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden shadow-md"
               style={{ background: 'var(--gradient-primary)' }}>
            <img src={logoImg} alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <div className="leading-tight">
            <div className="text-[17px] font-serif font-semibold" style={{ color: 'hsl(var(--brand-gold))' }}>
              Sistema de Perfumes
            </div>
          </div>
        </div>

        {renderGroup('PRINCIPAL', PRINCIPAL)}
        {renderGroup('GESTÃO', GESTAO)}
        {renderGroup('OUTROS', OUTROS)}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
