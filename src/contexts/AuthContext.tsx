
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  currentUser: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUserContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Função para definir o usuário no contexto do banco
  const setUserContext = async () => {
    if (currentUser) {
      try {
        console.log('Definindo usuário no contexto do banco:', currentUser);
        
        const { error } = await supabase.rpc('set_config', {
          setting_name: 'app.current_user',
          setting_value: currentUser,
          is_local: false
        });
        
        if (error) {
          console.error('Erro ao definir usuário no banco:', error);
        } else {
          console.log('Usuário definido com sucesso no banco:', currentUser);
        }
      } catch (error) {
        console.error('Erro ao definir usuário no banco:', error);
      }
    }
  };

  useEffect(() => {
    // Verificar se há um usuário logado no localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setIsAuthenticated(true);
      setCurrentUser(savedUser);
    }
    setLoading(false);
  }, []);

  // Sempre definir o contexto quando o usuário atual mudar (apenas uma vez por sessão)
  useEffect(() => {
    if (currentUser && isAuthenticated) {
      setUserContext();
    }
  }, [currentUser, isAuthenticated]);

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
    <AuthContext.Provider value={{ isAuthenticated, loading, currentUser, login, logout, setUserContext }}>
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
