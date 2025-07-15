
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  ClipboardList, 
  FileText,
  TrendingUp,
  BarChart3,
  Shield
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
  currentPage: string;
  onPageChange: (page: string) => void;
}

const AppSidebar = ({ currentPage, onPageChange }: AppSidebarProps) => {
  const menuItems = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard, page: 'dashboard' },
    { title: 'Produtos', url: '/products', icon: Package, page: 'products' },
    { title: 'Categorias', url: '/categories', icon: ClipboardList, page: 'categories' },
    { title: 'Clientes', url: '/customers', icon: Users, page: 'customers' },
    { title: 'Vendas', url: '/sales', icon: ShoppingCart, page: 'sales' },
    { title: 'Solicitações de Encomenda', url: '/product-order-requests', icon: FileText, page: 'product-order-requests' },
    { title: 'Relatórios', url: '/reports', icon: BarChart3, page: 'reports' },
    { title: 'Lucro vs Investimento', url: '/profit-report', icon: TrendingUp, page: 'profit-report' },
    { title: 'Auditoria', url: '/audit-log', icon: Shield, page: 'audit-log' },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={({ isActive }) => 
                        `flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                          isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`
                      }
                      onClick={() => onPageChange(item.page)}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </NavLink>
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
