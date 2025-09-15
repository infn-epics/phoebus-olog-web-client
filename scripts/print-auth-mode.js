import "dotenv/config";

const mode =
  process.env.VITE_APP_OAUTH2_ENABLED === "true" ? "OAuth2" : "classic";
console.info(`\x1b[36m[Auth]\x1b[0m Starting app in ${mode} login mode`);
