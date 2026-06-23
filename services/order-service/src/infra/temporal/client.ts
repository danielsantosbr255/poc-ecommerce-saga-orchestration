import { Client, Connection } from "@temporalio/client";
import { OrderSagaWorkflow } from "./workflows.js";

let client: Client;

export async function initTemporalClient() {
  const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS || "localhost:7233" });
  client = new Client({ connection });
}

export async function startOrderSaga(orderId: string) {
  if (!client) {
    throw new Error("Temporal client not initialized");
  }

  const handle = await client.workflow.start(OrderSagaWorkflow, {
    args: [orderId],
    taskQueue: "order-saga-task-queue",
    workflowId: `order-saga-${orderId}`,
  });

  return handle;
}
