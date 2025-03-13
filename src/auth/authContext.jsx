import { createContext, useContext, useState, useEffect } from "react";
import { AuthContext as OAuthContext } from "react-oauth2-code-pkce";
import { useDispatch } from "react-redux";
import { setUser } from "features/authSlice";

const AuthDataContext = createContext(null);

export const AuthDataProvider = ({ children }) => {
  const { token, tokenData, logIn, logOut } = useContext(OAuthContext);
  const [authState, setAuthState] = useState({ token: null, tokenData: null });
  const dispatch = useDispatch();

  useEffect(() => {
    setAuthState({ token, tokenData });
    if (tokenData) {
      let user = {
        userName: tokenData.preferred_username,
        givenName: tokenData.given_name,
        familyName: tokenData.family_name,
        email: tokenData.email,
        roles: tokenData.realm_access.roles
      };
      dispatch(setUser(user)); // Aggiorna lo stato dell'utente in Redux
    }
  }, [token, tokenData]);

  return (
    <AuthDataContext.Provider value={{ ...authState, logIn, logOut }}>
      {children}
    </AuthDataContext.Provider>
  );
};

export const useAuthData = () => useContext(AuthDataContext);
