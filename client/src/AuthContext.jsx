import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'staywell_token';
const USER_KEY = 'staywell_user';

const getStoredUser = () => {
  const storedUser = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token]);

  const authenticate = (data, remember = true) => {
    setToken(data.token);
    setUser(data.user);
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    otherStorage.removeItem(TOKEN_KEY);
    otherStorage.removeItem(USER_KEY);
    storage.setItem(TOKEN_KEY, data.token);
    storage.setItem(USER_KEY, JSON.stringify(data.user));
  };

  const login = async (credentials, remember) => {
    const { data } = await api.post('/auth/login', credentials);
    authenticate(data, remember);
  };

  const register = async (details) => {
    const { data } = await api.post('/auth/register', details);
    authenticate(data);
  };

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  return (
    <AuthContext.Provider value={{ loading, login, logout, register, token, user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
