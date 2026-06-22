export type EventId = string;
export type TodoId = string;

type BaseEvent = {
  id: EventId;
  occurredAt: string;
};

export type TodoAddedEvent = BaseEvent & {
  type: "todo.added";
  todoId: TodoId;
  title: string;
};

export type TodoRenamedEvent = BaseEvent & {
  type: "todo.renamed";
  todoId: TodoId;
  title: string;
};

export type TodoCompletionChangedEvent = BaseEvent & {
  type: "todo.completionChanged";
  todoId: TodoId;
  completed: boolean;
};

export type TodoDeletedEvent = BaseEvent & {
  type: "todo.deleted";
  todoId: TodoId;
};

export type UndoPerformedEvent = BaseEvent & {
  type: "undo.performed";
  targetEventId: EventId;
};

export type TodoEvent =
  | TodoAddedEvent
  | TodoRenamedEvent
  | TodoCompletionChangedEvent
  | TodoDeletedEvent;

export type DomainEvent = TodoEvent | UndoPerformedEvent;

export type Todo = {
  id: TodoId;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Projection = {
  todos: Todo[];
  activeEventIds: Set<EventId>;
  undoneEventIds: Set<EventId>;
};

export function isUndoEvent(event: DomainEvent): event is UndoPerformedEvent {
  return event.type === "undo.performed";
}

export function getUndoneEventIds(events: DomainEvent[]): Set<EventId> {
  return new Set(
    events
      .filter(isUndoEvent)
      .map((event) => event.targetEventId),
  );
}

export function getLastUndoableEvent(
  events: DomainEvent[],
): TodoEvent | undefined {
  const undoneEventIds = getUndoneEventIds(events);

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (isUndoEvent(event) || undoneEventIds.has(event.id)) {
      continue;
    }

    return event;
  }

  return undefined;
}

export function projectTodos(events: DomainEvent[]): Projection {
  const undoneEventIds = getUndoneEventIds(events);
  const todosById = new Map<TodoId, Todo>();
  const activeEventIds = new Set<EventId>();

  for (const event of events) {
    if (isUndoEvent(event) || undoneEventIds.has(event.id)) {
      continue;
    }

    activeEventIds.add(event.id);

    switch (event.type) {
      case "todo.added":
        todosById.set(event.todoId, {
          id: event.todoId,
          title: event.title,
          completed: false,
          createdAt: event.occurredAt,
          updatedAt: event.occurredAt,
        });
        break;

      case "todo.renamed": {
        const todo = todosById.get(event.todoId);

        if (todo) {
          todosById.set(event.todoId, {
            ...todo,
            title: event.title,
            updatedAt: event.occurredAt,
          });
        }
        break;
      }

      case "todo.completionChanged": {
        const todo = todosById.get(event.todoId);

        if (todo) {
          todosById.set(event.todoId, {
            ...todo,
            completed: event.completed,
            updatedAt: event.occurredAt,
          });
        }
        break;
      }

      case "todo.deleted":
        todosById.delete(event.todoId);
        break;
    }
  }

  return {
    todos: Array.from(todosById.values()),
    activeEventIds,
    undoneEventIds,
  };
}
