export function isApiDocsEnabled() {
  if (process.env.ENABLE_API_DOCS === "1") {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}
