
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import ProductsPage from '@/components/ProductsPage';
import CategoriesPage from '@/components/CategoriesPage';
import CustomersPage from '@/components/CustomersPage';
import SalesPage from '@/components/SalesPage';
import OrdersPage from '@/components/OrdersPage';
import ReportsPage from '@/components/ReportsPage';
import ProfitReportPage from '@/components/ProfitReportPage';
import OrderProductsReportPage from '@/pages/OrderProductsReportPage';
import AuditLogPage from '@/components/AuditLogPage';
import NotFound from '@/pages/NotFound';
import LoginForm from '@/components/LoginForm';
import ProtectedRoute from '@/components/ProtectedRoute';
import ProductOrderRequestsPage from '@/components/ProductOrderRequestsPage';

const queryClient = new QueryClient();

const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

  return (
    <QueryClientProvider client={queryClient}>
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
                    <Layout currentPage={currentPage} onPageChange={handlePageChange}>
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
    </QueryClientProvider>
  );
};

export default App;
