# Playlisted

## Testing

Run the local CI mirror before opening a pull request:

```bash
npm run ci
```

The current MVP CI gate validates Prisma, validates the OpenAPI contract, compiles the backend, regenerates/builds the client SDK, and builds the web app.
