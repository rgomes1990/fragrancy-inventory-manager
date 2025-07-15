
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  FolderOpen,
  Settings,
  TrendingUp,
  ClipboardList,
  ShoppingBag,
  FileText
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

export function AppSidebar() {
  const mainItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: BarChart3,
    },
    {
      title: "Produtos",
      url: "/products",
      icon: Package,
    },
    {
      title: "Categorias",
      url: "/categories",
      icon: FolderOpen,
    },
    {
      title: "Clientes",
      url: "/customers",
      icon: Users,
    },
    {
      title: "Vendas",
      url: "/sales",
      icon: ShoppingCart,
    },
    {
      title: "Encomendas",
      url: "/orders",
      icon: ShoppingBag,
    },
    {
      title: "Solicitações de Encomenda",
      url: "/product-order-requests",
      icon: ClipboardList,
    },
  ];

  const reportItems = [
    {
      title: "Relatórios",
      url: "/reports",
      icon: FileText,
    },
    {
      title: "Relatório de Lucros",
      url: "/profit-report",
      icon: TrendingUp,
    },
    {
      title: "Relatório de Encomendas",
      url: "/order-products-report",
      icon: ClipboardList,
    },
    {
      title: "Log de Auditoria",
      url: "/audit-log",
      icon: Settings,
    },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="flex items-center space-x-2">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Relatórios</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="flex items-center space-x-2">
                      <item.icon className="w-4 h-4" />
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
}

export default AppSidebar;
