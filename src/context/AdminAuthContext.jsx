import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchCurrentUser } from "../services/authService";

const AdminAuthContext = createContext({
  currentUser: null,
  loading: true,
  isAuthenticated: false,
  logout: () => {},
  setCurrentUser: () => {},
});

export const AdminAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const role = ['admin', 'subadmin', 'manager', 'artist', 'staff', 'customer_service'].find(r => sessionStorage.getItem(`token_${r}`));
      if (!role) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetchCurrentUser(role);
        const user = res.data?.user || res.data || res || null;
        
        const userRole = (user?.role || '').toLowerCase().replace(' ', '_');
        const validRoles = ['admin', 'subadmin', 'manager', 'artist', 'staff', 'customer_service'];
        
        if (validRoles.includes(userRole)) {
          // Force role to lowercase for consistent frontend checks
          setCurrentUser({ ...user, role: userRole });
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          sessionStorage.removeItem(`token_${role}`);
          sessionStorage.removeItem(`user_${role}`);
          sessionStorage.removeItem('token');
        }
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const logout = useCallback(() => {
    const role = currentUser?.role;
    if (role) {
      sessionStorage.removeItem(`token_${role}`);
      sessionStorage.removeItem(`user_${role}`);
      sessionStorage.removeItem('token');
    }
    setCurrentUser(null);
  }, [currentUser]);

  return (
    <AdminAuthContext.Provider value={{
      currentUser, setCurrentUser, loading,
      isAuthenticated: !!currentUser, logout,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return context;
};