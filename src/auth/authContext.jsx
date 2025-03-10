import { createContext, useContext, useState, useEffect } from "react";
import { AuthContext as OAuthContext } from "react-oauth2-code-pkce";

const AuthDataContext = createContext(null);

export const AuthDataProvider = ({ children }) => {
  const { token, tokenData, logIn, logOut } = useContext(OAuthContext);
  const [authState, setAuthState] = useState({ token: null, tokenData: null });

  useEffect(() => {
    setAuthState({ token, tokenData });
  }, [token, tokenData]);

  return (
    <AuthDataContext.Provider value={{ ...authState, logIn, logOut }}>
      {children}
    </AuthDataContext.Provider>
  );
};

export const useAuthData = () => useContext(AuthDataContext);
