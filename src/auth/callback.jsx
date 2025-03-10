import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useOAuth2 } from "react-oauth2-code-pkce";

const Callback = () => {
  const { search } = useLocation();
  const { signIn } = useOAuth2();

  useEffect(() => {
    if (search.includes("code=") && search.includes("state=")) {
      signIn();
    }
  }, [search, signIn]);

  return <div>Loading...</div>;
};

export default Callback;