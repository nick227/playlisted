import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`Playlisted API listening on http://localhost:${port}`);
  console.log(`OpenAPI docs available at http://localhost:${port}/docs`);
});
