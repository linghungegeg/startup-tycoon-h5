import { loadConfig } from "./config.js";
import { createApiServer } from "./http.js";

const config = loadConfig();
const server = createApiServer(config);

server.listen(config.port, config.host, () => {
  console.log(
    JSON.stringify({
      level: "info",
      message: "API server listening",
      host: config.host,
      port: config.port
    })
  );
});
