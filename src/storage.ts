import type { DomainEvent } from "./domain/events";

const STORAGE_KEY = "estodo.events.v1";

export function loadEvents(): DomainEvent[] {
  try {
    const rawEvents = window.localStorage.getItem(STORAGE_KEY);

    if (!rawEvents) {
      return [];
    }

    const parsed = JSON.parse(rawEvents);

    return Array.isArray(parsed) ? parsed.filter(isDomainEventLike) : [];
  } catch {
    return [];
  }
}

export function saveEvents(events: DomainEvent[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function clearEvents(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

function isDomainEventLike(event: unknown): event is DomainEvent {
  if (!event || typeof event !== "object") {
    return false;
  }

  const candidate = event as Partial<DomainEvent>;
  return typeof candidate.id === "string" && typeof candidate.type === "string";
}
