
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  currentUser: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se há um usuário logado no localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setIsAuthenticated(true);
      setCurrentUser(savedUser);
      // Definir o usuário atual na configuração da sessão do Supabase
      supabase.rpc('verify_login', {
        username_input: savedUser,
        password_input: 'perfumes@2025'
      }).then(() => {
        // Configurar a variável de sessão para auditoria
        return supabase.rpc('verify_login', {
          username_input: 'set_config_user',
          password_input: savedUser
        });
      });
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('verify_login', {
        username_input: username,
        password_input: password
      });

      if (error) throw error;

      if (data) {
        setIsAuthenticated(true);
        setCurrentUser(username);
        localStorage.setItem('currentUser', username);
        
        // Executar uma query SQL personalizada para definir a variável de sessão
        await supabase.from('audit_log').select('id').limit(1);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
