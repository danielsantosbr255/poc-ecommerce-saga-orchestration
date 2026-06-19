import { asc, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { OrderPlacedEvent } from "../../order/order.events.js";
import type { IOrderPublisherPort } from "../../order/order.types.js";
import * as schema from "../database/schema.js";

export class OutboxRelay {
  private isRunning = false;
  private timeoutId?: NodeJS.Timeout;

  constructor(
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly publisher: IOrderPublisherPort,
    private readonly pollIntervalMs = 1000,
  ) {}

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private async loop() {
    if (!this.isRunning) return;

    try {
      await this.processOutbox();
    } catch (err) {
      console.error("[OutboxRelay] Error processing outbox:", err);
    }

    if (this.isRunning) {
      this.timeoutId = setTimeout(() => this.loop(), this.pollIntervalMs);
    }
  }

  private async processOutbox() {
    await this.db.transaction(async tx => {
      // 1. Lock rows for update
      const pendingEvents = await tx
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.processed, false))
        .orderBy(asc(schema.outbox.createdAt))
        .limit(50)
        .for("update", { skipLocked: true });

      if (pendingEvents.length === 0) {
        return; // nothing to do
      }

      const processedIds: string[] = [];

      // 2. Publish to RabbitMQ
      for (const row of pendingEvents) {
        try {
          const eventPayload = row.payload as unknown as OrderPlacedEvent;
          await this.publisher.publishOrderPlaced(eventPayload);
          processedIds.push(row.id);
        } catch (err) {
          console.error(`[OutboxRelay] Failed to publish event ${row.id}:`, err);
          throw err;
        }
      }

      // 3. Mark as processed
      if (processedIds.length > 0) {
        await tx
          .update(schema.outbox)
          .set({ processed: true, processedAt: new Date().toISOString() })
          .where(inArray(schema.outbox.id, processedIds));
        console.log(`[OutboxRelay] Successfully published ${processedIds.length} events.`);
      }
    });
  }
}
