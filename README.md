# Welcome to the DFT repo

## Running locally

There are lots of node package managers. My favorite is `bun`, but you can substitute `npm` or `pnmp` (or with some changes, `yarn`) below.

To intall everything

`bun i`
`bunx prisma generate`

Then, you'll need to add an `.env` file with the database URL and some other stuff. Joe will send you one.

To run the local dev server

`bun run dev`

## Evolving the schema

Let's say you want to add a table to the db. Just run `bunx prisma db push` to take your local changes in schema.prisma and migrate the live db to match.

## Depoloyment

Pushing to the github repo should automatically deploy at `dft.meaningalignment.org`.

## Development

- [Remix Docs](https://remix.run/docs)
