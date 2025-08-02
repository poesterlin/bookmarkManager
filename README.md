# BookmarkManager

A simple bookmark manager that allows you to save, organize and track your bookmarks.

[Hosted here](https://bookmarks.oesterlin.dev)

## Features

- Add and edit bookmarks
- Organize bookmarks into categories
- Share Collections with others
- Search bookmarks
- Tag bookmarks
- Browser extension to save bookmarks directly from the browser
- Dark mode
- PWA including Share Target

## Screenshots

Desktop:

![Screenshot](/static/screenshots/home_desktop.webp)

Mobile:

![Screenshot](/static/screenshots/home_mobile.webp)

Browser Extension:

![Screenshot](/static/screenshots/extension.webp)

## Tech Stack

- [SvelteKit](https://svelte.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Bun](https://bun.sh/)
- [PostgreSQL](https://www.postgresql.org/)

## Getting Started

1. Clone the repository

```bash
   git clone git@github.com:poesterlin/bookmarkManager.git
   cd bookmarkManager
```

2. Setup environment variables

```bash
   cp .env.example .env
```

Customize the `.env` file with your PostgreSQL connection string and other settings.

3. Run Docker Compose

```bash
   docker compose -f compose.example.yaml up -d
```

This runs the configuration found in `compose.example.yaml` which uses the `.env` file to set up and migrate the database. You can customize this file to suit your needs.

4. Go to http://localhost:3000 to access the app.

## Browser Extension

Get more information about the browser extension [here](./browser-extension/README.md).
