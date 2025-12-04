
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Home,
  Package,
  ClipboardList,
  Users,
  ShoppingCart,
  FileText,
  TrendingUp,
  Shield,
  Receipt
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
} from '@/components/ui/sidebar';

interface AppSidebarProps {
  currentPage?: string;
  onPageChange?: (page: string) => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ currentPage, onPageChange }) => {
  const location = useLocation();

  const menuItems = [
    { title: 'Dashboard', url: '/', icon: Home, page: '' },
    { title: 'Produtos', url: '/products', icon: Package, page: 'products' },
    { title: 'Categorias', url: '/categories', icon: ClipboardList, page: 'categories' },
    { title: 'Clientes', url: '/customers', icon: Users, page: 'customers' },
    { title: 'Vendas', url: '/sales', icon: ShoppingCart, page: 'sales' },
    { title: 'Despesas', url: '/expenses', icon: Receipt, page: 'expenses' },
    { title: 'Auditoria', url: '/audit-log', icon: Shield, page: 'audit-log' },
  ];

  const isActive = (page: string) => {
    if (page === '') return location.pathname === '/';
    return location.pathname.includes(page);
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sistema de Perfumes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.page)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
