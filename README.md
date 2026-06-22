# estodo

Event-sourced todo app built with React, Vite, pnpm, and Vitest.

## Model

- Todo actions append immutable events such as `todo.added` and `todo.completionChanged`.
- The visible todo list is a projection rebuilt from the event log.
- Undo appends `undo.performed` and marks the latest active todo event as ignored by the projection.

## Commands

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
```
