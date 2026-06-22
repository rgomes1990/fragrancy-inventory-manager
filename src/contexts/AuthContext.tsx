
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/services/apiClient';

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

  // Funcao para atualizar dados do usuario (busca da API)
  const refreshUserData = async () => {
    // Os dados ja estao no JWT/localStorage, nao precisa buscar novamente
    // Mas mantemos a interface para compatibilidade
    const savedUserData = localStorage.getItem('userData');
    if (savedUserData) {
      try {
        setUserData(JSON.parse(savedUserData));
      } catch (e) {
        console.error('Erro ao parsear userData:', e);
      }
    }
  };

  // setUserContext nao e mais necessario (era para PostgreSQL session vars)
  // Mantemos a interface para compatibilidade
  const setUserContext = async () => {
    // No-op: o JWT ja carrega as informacoes do usuario
  };

  useEffect(() => {
    // Verificar se ha um usuario logado no localStorage
    const savedUser = localStorage.getItem('currentUser');
    const savedUserData = localStorage.getItem('userData');
    const savedToken = localStorage.getItem('authToken');

    if (savedUser && savedToken) {
      setIsAuthenticated(true);
      setCurrentUser(savedUser);

      if (savedUserData) {
        try {
          setUserData(JSON.parse(savedUserData));
        } catch (e) {
          console.error('Erro ao parsear userData:', e);
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authApi.login(username, password);

      // Salvar token JWT
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('currentUser', username);

      const userDataResult: UserData = {
        id: response.user.id,
        username: response.user.username,
        tenant_id: response.user.tenant_id,
        is_admin: response.user.is_admin,
        tenant_name: response.user.tenant_name ?? undefined,
      };

      localStorage.setItem('userData', JSON.stringify(userDataResult));

      setIsAuthenticated(true);
      setCurrentUser(username);
      setUserData(userDataResult);

      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserData(null);
    localStorage.removeItem('authToken');
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
