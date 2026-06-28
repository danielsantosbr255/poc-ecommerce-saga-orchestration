import { Client, Connection, WorkflowIdReusePolicy } from "@temporalio/client";
import type { ISagaOrchestrator } from "../../../application/ports/saga-orchestrator.port.js";
import { OrderSagaWorkflow } from "./workflows.js";

export class TemporalSagaAdapter implements ISagaOrchestrator {
  private constructor(private readonly client: Client) {}

  static async createAndConnect(address: string): Promise<TemporalSagaAdapter> {
    const connection = await Connection.connect({ address });
    const client = new Client({ connection });
    return new TemporalSagaAdapter(client);
  }

  async startOrderSaga(orderId: string, customerId: string, amount: number): Promise<void> {
    await this.client.workflow.start(OrderSagaWorkflow, {
      args: [orderId, customerId, amount],
      taskQueue: "order-saga-task-queue",
      workflowId: `order-saga-${orderId}`,
      workflowIdReusePolicy: WorkflowIdReusePolicy.ALLOW_DUPLICATE_FAILED_ONLY,
    });
  }
}
