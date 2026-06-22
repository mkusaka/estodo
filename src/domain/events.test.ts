import {
  type DomainEvent,
  getLastUndoableEvent,
  projectTodos,
} from "./events";

const occurredAt = "2026-06-21T00:00:00.000Z";

function event<T extends DomainEvent>(input: T): T {
  return input;
}

describe("event-sourced todo projection", () => {
  it("rebuilds current todos from an append-only event log", () => {
    const events = [
      event({
        id: "event-1",
        type: "todo.added",
        todoId: "todo-1",
        title: "Write a reducer",
        occurredAt,
      }),
      event({
        id: "event-2",
        type: "todo.completionChanged",
        todoId: "todo-1",
        completed: true,
        occurredAt,
      }),
    ];

    expect(projectTodos(events).todos).toEqual([
      {
        id: "todo-1",
        title: "Write a reducer",
        completed: true,
        createdAt: occurredAt,
        updatedAt: occurredAt,
      },
    ]);
  });

  it("undoes an event by appending an undo event instead of deleting history", () => {
    const events = [
      event({
        id: "event-1",
        type: "todo.added",
        todoId: "todo-1",
        title: "Original title",
        occurredAt,
      }),
      event({
        id: "event-2",
        type: "todo.renamed",
        todoId: "todo-1",
        title: "Renamed title",
        occurredAt,
      }),
      event({
        id: "event-3",
        type: "undo.performed",
        targetEventId: "event-2",
        occurredAt,
      }),
    ];

    const projection = projectTodos(events);

    expect(events).toHaveLength(3);
    expect(projection.todos[0].title).toBe("Original title");
    expect(projection.undoneEventIds.has("event-2")).toBe(true);
    expect(projection.activeEventIds.has("event-2")).toBe(false);
  });

  it("restores a deleted todo when the delete event is undone", () => {
    const events = [
      event({
        id: "event-1",
        type: "todo.added",
        todoId: "todo-1",
        title: "Keep me",
        occurredAt,
      }),
      event({
        id: "event-2",
        type: "todo.deleted",
        todoId: "todo-1",
        occurredAt,
      }),
      event({
        id: "event-3",
        type: "undo.performed",
        targetEventId: "event-2",
        occurredAt,
      }),
    ];

    expect(projectTodos(events).todos).toEqual([
      {
        id: "todo-1",
        title: "Keep me",
        completed: false,
        createdAt: occurredAt,
        updatedAt: occurredAt,
      },
    ]);
  });

  it("finds the newest active todo event as the next undo target", () => {
    const events = [
      event({
        id: "event-1",
        type: "todo.added",
        todoId: "todo-1",
        title: "First",
        occurredAt,
      }),
      event({
        id: "event-2",
        type: "todo.added",
        todoId: "todo-2",
        title: "Second",
        occurredAt,
      }),
      event({
        id: "event-3",
        type: "undo.performed",
        targetEventId: "event-2",
        occurredAt,
      }),
    ];

    expect(getLastUndoableEvent(events)?.id).toBe("event-1");
  });
});
