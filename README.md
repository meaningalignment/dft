# Welcome to Remix Cowpunk

- [Remix Docs](https://remix.run/docs)

## Development

Stick the following stuff in an `.env` file

```sh
POSTGRES_URL="..."
POSTGRES_PRISMA_URL="..."
POSTGRES_URL_NON_POOLING="..."
SESSION_SECRET="..."
MAILGUN_API_KEY="..."
MAILGUN_DOMAIN="..."
```

and modify the stuff in `/app/config.server.ts`.

You might need to

```sh
bunx prisma db push
```

To populate your database.

Then you should be able to

```sh
bunx prisma generate
npm run dev
```

To start your app in development mode, rebuilding assets on file changes.
