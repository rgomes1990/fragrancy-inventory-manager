
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  BarChart3, 
  LogOut,
  Sparkles
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const { logout, username } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'sales', label: 'Vendas', icon: ShoppingCart },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-purple-600 to-pink-600">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">Perfumes</h1>
                <p className="text-purple-100 text-sm">Gestão Completa</p>
              </div>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onPageChange(item.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                        currentPage === item.id
                          ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-l-4 border-purple-600'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-purple-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{username}</p>
                <p className="text-xs text-gray-500">Administrador</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-gray-500 hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
