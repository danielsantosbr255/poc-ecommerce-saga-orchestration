import type { Connection } from "rabbitmq-client";
import type { OrderPlacedEvent } from "../../order/order.events.js";
import type { IOrderPublisherPort } from "../../order/order.types.js";

const EXCHANGE = "orders";

export class RabbitOrderPublisher implements IOrderPublisherPort {
  private readonly publisher;

  constructor(rabbit: Connection) {
    this.publisher = rabbit.createPublisher({
      confirm: true,
      maxAttempts: 2,
      exchanges: [{ exchange: EXCHANGE, type: "topic" }],
    });
  }

  async publishOrderPlaced(event: OrderPlacedEvent) {
    await this.publisher.send(
      {
        exchange: EXCHANGE,
        routingKey: "order.placed",
        durable: true,
        headers: {
          "x-retry-count": 0,
          "x-source-service": "order-service",
          "x-event-type": "order.placed",
        },
        correlationId: event.eventId,
        contentType: "application/json",
        timestamp: Date.now(),
      },
      event,
    );
  }

  async close() {
    await this.publisher.close();
  }
}
