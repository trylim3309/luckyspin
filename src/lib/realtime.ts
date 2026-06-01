export type RealtimeEvent = {
  type: string;
  data: unknown;
  timestamp: number;
};

type Listener = (event: RealtimeEvent) => void;

class EventEmitter {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: RealtimeEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in realtime listener:", error);
      }
    });
  }

  getListenerCount(): number {
    return this.listeners.size;
  }
}

export const globalEmitter = globalThis as unknown as {
  emitter: EventEmitter | undefined;
};

if (!globalEmitter.emitter) {
  globalEmitter.emitter = new EventEmitter();
}

export const emitter = globalEmitter.emitter;

export function broadcast(type: string, data: unknown): void {
  emitter.emit({
    type,
    data,
    timestamp: Date.now(),
  });
}

export function subscribe(listener: Listener): () => void {
  return emitter.subscribe(listener);
}

export const REALTIME_EVENTS = {
  PRIZE_CREATED: "prize:created",
  PRIZE_UPDATED: "prize:updated",
  PRIZE_DELETED: "prize:deleted",
  USER_CREATED: "user:created",
  USER_UPDATED: "user:updated",
  SPIN_COMPLETED: "spin:completed",
  SETTINGS_UPDATED: "settings:updated",
  CONDITION_UPDATED: "condition:updated",
} as const;
