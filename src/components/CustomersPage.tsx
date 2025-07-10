
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Customer } from '@/types/database';
import { useCustomers } from '@/hooks/useCustomers';
import { CustomerForm } from './CustomerForm';
import { CustomerTable } from './CustomerTable';

const CustomersPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { customers, loading, fetchCustomers, deleteCustomer } = useCustomers();

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleFormCancel = () => {
    setEditingCustomer(null);
    setShowForm(false);
  };

  const handleFormSuccess = () => {
    setEditingCustomer(null);
    setShowForm(false);
    fetchCustomers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {showForm && (
        <CustomerForm
          editingCustomer={editingCustomer}
          onCancel={handleFormCancel}
          onSuccess={handleFormSuccess}
        />
      )}

      <CustomerTable
        customers={customers}
        loading={loading}
        onEdit={handleEdit}
        onDelete={deleteCustomer}
      />
    </div>
  );
};

export default CustomersPage;
