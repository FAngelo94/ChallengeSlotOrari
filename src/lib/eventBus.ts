import { EventEmitter } from "node:events";
import type { Booking } from "@/types/booking";

export type SlotEvent =
  | { type: "booking-created"; date: string; booking: Booking }
  | { type: "booking-deleted"; date: string; id: string; timeSlot: string }
  | { type: "lock-acquired"; date: string; timeSlot: string; clientId: string; expiresAt: string }
  | { type: "lock-released"; date: string; timeSlot: string };

declare global {
   
  var __slotEventBus: EventEmitter | undefined;
}

function createBus(): EventEmitter {
  const bus = new EventEmitter();
  bus.setMaxListeners(0);
  return bus;
}

export const eventBus = globalThis.__slotEventBus ?? createBus();

if (process.env.NODE_ENV !== "production") {
  globalThis.__slotEventBus = eventBus;
}

function channel(date: string): string {
  return `date:${date}`;
}

export function publish(event: SlotEvent): void {
  eventBus.emit(channel(event.date), event);
}

export function subscribe(date: string, listener: (event: SlotEvent) => void): () => void {
  eventBus.on(channel(date), listener);
  return () => eventBus.off(channel(date), listener);
}
