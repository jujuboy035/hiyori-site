# Hiyori Site / ふたり日和

A small Japanese shared journal for two people, with a bear-and-rabbit theme.

## Features

- Two separate login accounts, using runtime credentials
- Date-only outing plans and outing history
- Daily check-ins with short notes
- Reorderable shared bucket list, custom items, and milestones
- Photo-required task completion, with photos attached to completed task cards
- Shared question cards and custom questions: answers stay hidden until both accounts submit
- Separate question tabs for your turn, waiting for the other person, and both answered
- Separate pending/completed task tabs, with 12 cards per page

## Sanitized source

The account labels are `Aさん` and `Bさん`. Personal names, the original Site ID, deployment address, password hints, runtime data, photos, sessions, credentials, build output, and original Git history are excluded. Runtime credentials must be configured separately. The original live application is separate from this copy.

## Stack

React 19, Vinext/Vite, TypeScript, Cloudflare Workers, D1, and R2. The Sites build integration is retained, including its third-party license notices.

## Local setup

Use Node.js 22.13 or newer.

```sh
npm ci
cp .dev.vars.example .dev.vars
npm run dev
```

Fill `.dev.vars` locally with different 8-digit numeric values for `ACCOUNT_A_PIN` and `ACCOUNT_B_PIN`, plus a long random `SESSION_EPOCH`. Generate new credentials; use no personal dates. Rotating `SESSION_EPOCH` invalidates prior sessions. Keep this file untracked.

The application requires a D1 binding named `DB` and an R2 binding named `BUCKET`. Apply `drizzle/0000_futari.sql` to the local D1 database before using login or record APIs. Local Wrangler state remains untracked. The source retains the starter's Vite binding configuration for local development.

## Validation

```sh
npx tsc --noEmit
npm run build
```

## Deployment

This is source code, not a standalone static website. A deployment needs Worker runtime secrets, D1 schema initialization, and an R2 bucket. The hosting manifest deliberately has no project ID. When importing into Sites, use the newly selected project's returned ID; never copy an existing private project identity. Configure credentials as runtime secrets, not source files. Outside Sites, configure the corresponding Worker deployment and bindings yourself.

## Shared question privacy

Answers are stored with the authenticated account identity. Before both accounts answer the same question, the server returns only the viewer's own answer and the submission count. The generic records API excludes answer records and rejects direct answer writes or deletion. Submission is final and cannot be overwritten after reading the other answer.
