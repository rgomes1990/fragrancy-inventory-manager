
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserData {
  id: string;
  username: string;
  tenant_id: string | null;
  is_admin: boolean;
  tenant_name?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  currentUser: string | null;
  userData: UserData | null;
  tenantId: string | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUserContext: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  const tenantId = userData?.tenant_id || null;
  const isAdmin = userData?.is_admin || false;

  // Função para buscar dados do usuário
  const fetchUserData = async (username: string): Promise<UserData | null> => {
    try {
      const { data, error } = await supabase
        .from('authorized_users')
        .select('id, username, tenant_id, is_admin')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        return null;
      }

      if (data) {
        // Buscar nome do tenant se existir
        let tenant_name = undefined;
        if (data.tenant_id) {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', data.tenant_id)
            .maybeSingle();
          tenant_name = tenantData?.name;
        }

        return {
          id: data.id,
          username: data.username,
          tenant_id: data.tenant_id,
          is_admin: data.is_admin,
          tenant_name
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      return null;
    }
  };

  // Função para atualizar dados do usuário
  const refreshUserData = async () => {
    if (currentUser) {
      const data = await fetchUserData(currentUser);
      if (data) {
        setUserData(data);
        // Salvar no localStorage para persistência
        localStorage.setItem('userData', JSON.stringify(data));
      }
    }
  };

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
    const savedUserData = localStorage.getItem('userData');
    
    if (savedUser) {
      setIsAuthenticated(true);
      setCurrentUser(savedUser);
      
      if (savedUserData) {
        try {
          setUserData(JSON.parse(savedUserData));
        } catch (e) {
          // Se falhar ao parsear, buscar do banco
          fetchUserData(savedUser).then(data => {
            if (data) {
              setUserData(data);
              localStorage.setItem('userData', JSON.stringify(data));
            }
          });
        }
      } else {
        // Buscar dados do usuário
        fetchUserData(savedUser).then(data => {
          if (data) {
            setUserData(data);
            localStorage.setItem('userData', JSON.stringify(data));
          }
        });
      }
    }
    setLoading(false);
  }, []);

  // Definir o contexto quando o usuário atual mudar (otimizado)
  useEffect(() => {
    if (currentUser && isAuthenticated) {
      // Usar um ref para evitar múltiplas chamadas
      const timer = setTimeout(() => {
        setUserContext();
      }, 100);
      return () => clearTimeout(timer);
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
        
        // Buscar dados completos do usuário
        const userDataResult = await fetchUserData(username);
        if (userDataResult) {
          setUserData(userDataResult);
          localStorage.setItem('userData', JSON.stringify(userDataResult));
        }
        
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
    setUserData(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userData');
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      loading, 
      currentUser, 
      userData,
      tenantId,
      isAdmin,
      login, 
      logout, 
      setUserContext,
      refreshUserData
    }}>
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
