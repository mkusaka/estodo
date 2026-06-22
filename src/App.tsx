import {
  CheckCircle2,
  Circle,
  History,
  ListRestart,
  Plus,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  type DomainEvent,
  type Todo,
  getLastUndoableEvent,
  isUndoEvent,
  projectTodos,
} from "./domain/events";
import { clearEvents, loadEvents, saveEvents } from "./storage";

type DraftEvent = DomainEvent extends infer Event
  ? Event extends DomainEvent
    ? Omit<Event, "id" | "occurredAt">
    : never
  : never;

const sampleEvents: DomainEvent[] = [
  {
    id: "sample-1",
    type: "todo.added",
    todoId: "sample-todo-1",
    title: "イベントを1件追加する",
    occurredAt: "2026-06-21T00:00:00.000Z",
  },
  {
    id: "sample-2",
    type: "todo.added",
    todoId: "sample-todo-2",
    title: "projectionで現在の状態を見る",
    occurredAt: "2026-06-21T00:01:00.000Z",
  },
  {
    id: "sample-3",
    type: "todo.completionChanged",
    todoId: "sample-todo-1",
    completed: true,
    occurredAt: "2026-06-21T00:02:00.000Z",
  },
  {
    id: "sample-4",
    type: "undo.performed",
    targetEventId: "sample-3",
    occurredAt: "2026-06-21T00:03:00.000Z",
  },
];

export default function App() {
  const [events, setEvents] = useState<DomainEvent[]>(() => loadEvents());
  const [draftTitle, setDraftTitle] = useState("");

  const projection = useMemo(() => projectTodos(events), [events]);
  const undoTarget = useMemo(() => getLastUndoableEvent(events), [events]);
  const completedCount = projection.todos.filter((todo) => todo.completed).length;

  useEffect(() => {
    if (events.length === 0) {
      clearEvents();
      return;
    }

    saveEvents(events);
  }, [events]);

  function appendEvent(draftEvent: DraftEvent) {
    setEvents((currentEvents) => [
      ...currentEvents,
      {
        ...draftEvent,
        id: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
      } as DomainEvent,
    ]);
  }

  function handleAddTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = draftTitle.trim();

    if (!title) {
      return;
    }

    appendEvent({
      type: "todo.added",
      todoId: crypto.randomUUID(),
      title,
    });
    setDraftTitle("");
  }

  function handleRenameTodo(todo: Todo, title: string) {
    const nextTitle = title.trim();

    if (!nextTitle || nextTitle === todo.title) {
      return;
    }

    appendEvent({
      type: "todo.renamed",
      todoId: todo.id,
      title: nextTitle,
    });
  }

  function handleToggleTodo(todo: Todo) {
    appendEvent({
      type: "todo.completionChanged",
      todoId: todo.id,
      completed: !todo.completed,
    });
  }

  function handleDeleteTodo(todo: Todo) {
    appendEvent({
      type: "todo.deleted",
      todoId: todo.id,
    });
  }

  function handleUndo() {
    if (!undoTarget) {
      return;
    }

    appendEvent({
      type: "undo.performed",
      targetEventId: undoTarget.id,
    });
  }

  function handleReset() {
    setEvents([]);
  }

  return (
    <main className="app-shell">
      <section className="workspace" aria-label="Todo workspace">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">event sourced todo</p>
            <h1>estodo</h1>
          </div>

          <div className="toolbar" aria-label="Event controls">
            <button
              className="button secondary"
              type="button"
              onClick={() => setEvents(sampleEvents)}
              title="サンプルイベントを読み込む"
            >
              <ListRestart size={18} aria-hidden="true" />
              サンプル
            </button>
            <button
              className="button secondary danger"
              type="button"
              onClick={handleReset}
              disabled={events.length === 0}
              title="イベントログを空にする"
            >
              <RotateCcw size={18} aria-hidden="true" />
              リセット
            </button>
            <button
              className="button primary"
              type="button"
              onClick={handleUndo}
              disabled={!undoTarget}
              title={undoTarget ? `${undoTarget.type} をundo` : "undoできるイベントがありません"}
            >
              <Undo2 size={18} aria-hidden="true" />
              Undo
            </button>
          </div>
        </div>

        <div className="metrics" aria-label="Projection summary">
          <Metric label="events" value={events.length} />
          <Metric label="active" value={projection.activeEventIds.size} />
          <Metric label="todos" value={projection.todos.length} />
          <Metric label="done" value={completedCount} />
        </div>

        <form className="add-form" onSubmit={handleAddTodo}>
          <input
            aria-label="新しいtodo"
            placeholder="todoを追加"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
          />
          <button className="button primary add-button" type="submit">
            <Plus size={18} aria-hidden="true" />
            追加
          </button>
        </form>

        <TodoList
          todos={projection.todos}
          onToggle={handleToggleTodo}
          onRename={handleRenameTodo}
          onDelete={handleDeleteTodo}
        />
      </section>

      <aside className="inspector" aria-label="Event sourcing inspector">
        <section className="inspector-section">
          <div className="section-heading">
            <History size={18} aria-hidden="true" />
            <h2>Event log</h2>
          </div>
          <EventLog events={events} activeEventIds={projection.activeEventIds} undoneEventIds={projection.undoneEventIds} />
        </section>

        <section className="inspector-section">
          <div className="section-heading">
            <CheckCircle2 size={18} aria-hidden="true" />
            <h2>Projection</h2>
          </div>
          <pre className="projection-view" aria-label="Projection JSON">
            {JSON.stringify(
              projection.todos.map(({ id, title, completed }) => ({
                id,
                title,
                completed,
              })),
              null,
              2,
            )}
          </pre>
        </section>
      </aside>
    </main>
  );
}

type MetricProps = {
  label: string;
  value: number;
};

function Metric({ label, value }: MetricProps) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type TodoListProps = {
  todos: Todo[];
  onToggle: (todo: Todo) => void;
  onRename: (todo: Todo, title: string) => void;
  onDelete: (todo: Todo) => void;
};

function TodoList({ todos, onToggle, onRename, onDelete }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="empty-state">
        <Circle size={22} aria-hidden="true" />
        <p>イベントログは空です</p>
      </div>
    );
  }

  return (
    <ul className="todo-list" aria-label="Todo list">
      {todos.map((todo) => (
        <li className="todo-row" key={todo.id}>
          <button
            className="icon-button completion-toggle"
            type="button"
            aria-label={todo.completed ? `${todo.title}を未完了にする` : `${todo.title}を完了にする`}
            onClick={() => onToggle(todo)}
            title={todo.completed ? "未完了にする" : "完了にする"}
          >
            {todo.completed ? (
              <CheckCircle2 size={22} aria-hidden="true" />
            ) : (
              <Circle size={22} aria-hidden="true" />
            )}
          </button>
          <input
            key={`${todo.id}-${todo.title}`}
            className="todo-title"
            defaultValue={todo.title}
            aria-label={`${todo.title}のタイトル`}
            data-completed={todo.completed}
            onBlur={(event) => onRename(todo, event.target.value)}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />
          <button
            className="icon-button delete-button"
            type="button"
            aria-label={`${todo.title}を削除`}
            title="削除"
            onClick={() => onDelete(todo)}
          >
            <Trash2 size={20} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

type EventLogProps = {
  events: DomainEvent[];
  activeEventIds: Set<string>;
  undoneEventIds: Set<string>;
};

function EventLog({ events, activeEventIds, undoneEventIds }: EventLogProps) {
  if (events.length === 0) {
    return <p className="muted">まだイベントはありません</p>;
  }

  return (
    <ol className="event-log">
      {[...events].reverse().map((event) => {
        const undone = undoneEventIds.has(event.id);
        const active = activeEventIds.has(event.id);
        const undo = isUndoEvent(event);

        return (
          <li className="event-item" data-state={undone ? "undone" : active ? "active" : "meta"} key={event.id}>
            <div className="event-main">
              <span className="event-type">{event.type}</span>
              <span className="event-id">#{event.id.slice(0, 8)}</span>
            </div>
            <p>{formatEventDetails(event)}</p>
            <span className="event-status">
              {undo ? "undo event" : undone ? "undone" : "active"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function formatEventDetails(event: DomainEvent): string {
  switch (event.type) {
    case "todo.added":
      return `todoId=${event.todoId}, title=${event.title}`;
    case "todo.renamed":
      return `todoId=${event.todoId}, title=${event.title}`;
    case "todo.completionChanged":
      return `todoId=${event.todoId}, completed=${event.completed}`;
    case "todo.deleted":
      return `todoId=${event.todoId}`;
    case "undo.performed":
      return `targetEventId=${event.targetEventId}`;
  }
}
