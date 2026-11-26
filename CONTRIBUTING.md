# Contributing

## Mutation UI checklist

For each user-triggered mutation:

- Provide an accessible, visible pending state or a safe optimistic update. Document intentional exceptions for background operations.
- Prevent conflicting or duplicate actions while preserving independent actions where possible.
- Define error and timeout behavior, including how to reconcile an outcome that may already have been applied by the server.
- For optimistic updates, test rollback and reconciliation, including concurrent requests and relevant realtime events. Do not restore a whole cache snapshot over newer changes.
- Identify affected caches and justify invalidation. Avoid unnecessary invalidation of the infinite message timeline and account for expiring media URLs.
- Test the relevant loading, success and error paths, and document any unverified behavior or API assumptions.

Before submitting a change, run `bun run test`, `bun run lint`, `bun run fmt:check`, and `bun run build`.
