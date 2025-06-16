
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se existe sessão salva
    const savedAuth = localStorage.getItem('perfumes_auth');
    if (savedAuth) {
      const { username: savedUsername, timestamp } = JSON.parse(savedAuth);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000; // 24 horas
      
      if (now - timestamp < oneDay) {
        setIsAuthenticated(true);
        setUsername(savedUsername);
      } else {
        localStorage.removeItem('perfumes_auth');
      }
    }
    setLoading(false);
  }, []);

  const login = async (inputUsername: string, inputPassword: string): Promise<boolean> => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.rpc('verify_login', {
        username_input: inputUsername,
        password_input: inputPassword
      });

      if (error) {
        console.error('Erro na autenticação:', error);
        return false;
      }

      if (data === true) {
        setIsAuthenticated(true);
        setUsername(inputUsername);
        
        // Salvar sessão no localStorage
        localStorage.setItem('perfumes_auth', JSON.stringify({
          username: inputUsername,
          timestamp: Date.now()
        }));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername(null);
    localStorage.removeItem('perfumes_auth');
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      username,
      login,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};
