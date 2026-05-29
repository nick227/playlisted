import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
const app = createApp();

app.listen(port, host, () => {
  const mode = process.env.NODE_ENV ?? "development";
  console.log(`Playlisted listening on http://${host}:${port} (${mode})`);
  console.log(`OpenAPI docs at http://localhost:${port}/docs`);
});
