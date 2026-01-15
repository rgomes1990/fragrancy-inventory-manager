
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  Package,
  ClipboardList,
  Users,
  ShoppingCart,
  Shield,
  Receipt,
  UserCog,
  Building2
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
  const { isAdmin } = useAuth();

  const menuItems = [
    { title: 'Dashboard', url: '/', icon: Home, page: '', adminOnly: false },
    { title: 'Produtos', url: '/products', icon: Package, page: 'products', adminOnly: false },
    { title: 'Categorias', url: '/categories', icon: ClipboardList, page: 'categories', adminOnly: false },
    { title: 'Clientes', url: '/customers', icon: Users, page: 'customers', adminOnly: false },
    { title: 'Vendas', url: '/sales', icon: ShoppingCart, page: 'sales', adminOnly: false },
    { title: 'Despesas', url: '/expenses', icon: Receipt, page: 'expenses', adminOnly: false },
    { title: 'Empresas', url: '/tenants', icon: Building2, page: 'tenants', adminOnly: true },
    { title: 'Usuários', url: '/users', icon: UserCog, page: 'users', adminOnly: false },
    { title: 'Auditoria', url: '/audit-log', icon: Shield, page: 'audit-log', adminOnly: false },
  ];

  // Filtrar itens baseado no tipo de usuário
  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

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
              {visibleMenuItems.map((item) => (
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
