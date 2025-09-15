import { useState, useEffect } from "react";
import { useShowLogin, useUser } from "features/authSlice";
import { useAuthData } from "src/auth/authContext";

const useIsAuthenticated = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { setShowLogin, setUser } = useShowLogin();
  const user = useUser();
  const { token, tokenData, logIn, logOut } = useAuthData();

  /**
   * Show login if no session
   */
  useEffect(() => {
    if (import.meta.env.VITE_APP_OAUTH2_ENABLED === "false") {
      if (user) {
        setIsAuthenticated(true);
        setShowLogin(false);
      } else {
        setIsAuthenticated(false);
        setShowLogin(true);
      }
    } else {
      if (token) {
        setIsAuthenticated(true);
        setShowLogin(false);
      } else {
        setIsAuthenticated(false);
        logIn();
      }
    }
  }, [setShowLogin, user]);

  return [isAuthenticated];
};

export default useIsAuthenticated;
