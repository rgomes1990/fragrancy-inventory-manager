import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/hooks/use-toast';
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient } from 'react-query';

import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import ProductsPage from '@/components/ProductsPage';
import CategoriesPage from '@/components/CategoriesPage';
import CustomersPage from '@/components/CustomersPage';
import SalesPage from '@/components/SalesPage';
import OrdersPage from '@/components/OrdersPage';
import ReportsPage from '@/pages/ReportsPage';
import ProfitReportPage from '@/pages/ProfitReportPage';
import OrderProductsReportPage from '@/pages/OrderProductsReportPage';
import AuditLogPage from '@/pages/AuditLogPage';
import NotFound from '@/pages/NotFound';
import LoginForm from '@/components/LoginForm';
import ProtectedRoute from '@/components/ProtectedRoute';
import ProductOrderRequestsPage from '@/components/ProductOrderRequestsPage';

const App = () => {
  return (
    <QueryClient>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginForm />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/products" element={<ProductsPage />} />
                        <Route path="/categories" element={<CategoriesPage />} />
                        <Route path="/customers" element={<CustomersPage />} />
                        <Route path="/sales" element={<SalesPage />} />
                        <Route path="/orders" element={<OrdersPage />} />
                        <Route path="/product-order-requests" element={<ProductOrderRequestsPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/profit-report" element={<ProfitReportPage />} />
                        <Route path="/order-products-report" element={<OrderProductsReportPage />} />
                        <Route path="/audit-log" element={<AuditLogPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClient>
  );
};

export default App;
