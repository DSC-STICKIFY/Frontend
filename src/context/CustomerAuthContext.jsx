import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchCurrentUser } from "../services/authService";

const CustomerAuthContext = createContext({
  currentUser: null,
  loading: true,
  isAuthenticated: false,
  logout: () => {},
  setCurrentUser: () => {},
});

export const CustomerAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = sessionStorage.getItem('token_user'); // ✅ consistent

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetchCurrentUser('user');
        const user = res.data?.user || res || null;
        if (user?.role?.toLowerCase() === 'user') {
          setCurrentUser(user);
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          sessionStorage.removeItem('token_user');
          sessionStorage.removeItem('user_user');
          sessionStorage.removeItem('token'); // optional linisin
        }
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('token_user');
    sessionStorage.removeItem('user_user');
    sessionStorage.removeItem('token'); // generic fallback
    setCurrentUser(null);
  }, []);

  const isCustomerDB = true;

  return (
    <CustomerAuthContext.Provider value={{
      currentUser, setCurrentUser, loading,
      isAuthenticated: !!currentUser, 
      isVerified: !!currentUser?.email_verified_at,
      logout, isCustomerDB,
    }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error("useAuth must be used within CustomerAuthProvider");
  return context;
};

export const useCurrentUser = () => useAuth();