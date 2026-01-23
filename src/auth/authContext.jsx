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
        userName:
          `${tokenData?.given_name ?? ""} ${tokenData?.family_name ?? ""}`.trim(),
        uuid: tokenData.preferred_username,
        givenName: tokenData.given_name,
        familyName: tokenData.family_name,
        email: tokenData.email,
        roles: tokenData.realm_access.roles
      };
      dispatch(setUser(user)); // Aggiorna lo stato dell'utente in Redux
    }
  }, [dispatch, token, tokenData]);

  // Funzioni di utilità per verificare scadenza token
  const timeToExpireMs = () => {
    // Se non c'è exp consideriamo il token scaduto
    if (!authState?.tokenData?.exp) {
      return -1;
    }
    return authState.tokenData.exp * 1000 - Date.now();
  };

  const isTokenExpired = (skewSeconds = 30) => {
    // Aggiunge un margine (clock skew) per evitare richieste al limite
    const tte = timeToExpireMs();
    if (tte < 0) {
      return true;
    }
    return tte <= skewSeconds * 1000;
  };

  const isAuthenticated = !!authState.token && !isTokenExpired();



  const hardLogout = () => {
    const idToken =
      tokenData?.id_token ||
      localStorage.getItem("react-oauth2-code-pkce-id-token");

    if (!idToken) {
      console.warn("[Auth] ID token non trovato, uso logout standard");
      logOut();
      return;
    }

    const logoutUrl =
      `${import.meta.env.VITE_AUTH_ENDPOINT_LOGOUT}` +
      `?id_token_hint=${encodeURIComponent(idToken)}` +
      `&post_logout_redirect_uri=${encodeURIComponent(
        import.meta.env.VITE_AUTH_ENDPOINT_REDIRECT_URI
      )}` +
      `&client_id=${import.meta.env.VITE_AUTH_CLIENT_ID}`;

    // Pulizia locale (difensiva)
    localStorage.clear();
    sessionStorage.clear();

    window.location.href = logoutUrl;
  };




  return (
    <AuthDataContext.Provider
      value={{
        ...authState,
        logIn,
        hardLogout,
        isTokenExpired,
        isAuthenticated,
        timeToExpireMs
      }}
    >
      {children}
    </AuthDataContext.Provider>
  );
};

export const useAuthData = () => useContext(AuthDataContext);
