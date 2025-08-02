## Commands

- **Build**: `bun run build`
- **Lint**: `bun run lint`
- **Format**: `bun run format`
- **Type Check**: `bun run check`

There are no specific test commands.

## Code Style

- **Formatting**: Use Prettier with the provided configuration (`.prettierrc`). Tabs, single quotes, and a print width of 100 are enforced.
- **Imports**: Standard ES module imports.
- **Types**: The project uses TypeScript. Please add types to all new code.
- **Naming Conventions**: Follow standard TypeScript/JavaScript naming conventions (e.g., camelCase for variables and functions, PascalCase for classes and components).
- **Error Handling**: Use try/catch blocks for asynchronous operations and throw errors where appropriate.
- **Framework**: This is a SvelteKit project. Follow Svelte and SvelteKit best practices.
- **Database**: The project uses Drizzle ORM. See `src/lib/server/db/schema.ts` for the schema.
- **Authentication**: Authentication is handled via cookies and custom middleware. See `src/lib/server/auth.ts`.
