package entity

import "time"

// OrderItem mirrors the payload from the order-service exactly.
// Source: order-service/src/order/order.schemas.ts → orderItemSchema
type OrderItem struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

// OrderPlacedPayload is the inner payload of the OrderPlacedEvent.
type OrderPlacedPayload struct {
	OrderID    string      `json:"orderId"`
	CustomerID string      `json:"customerId"`
	Items      []OrderItem `json:"items"`
}

// OrderPlacedEvent mirrors the event envelope published by the order-service.
// Source: order-service/src/order/order.events.ts → OrderPlacedEvent
//
// Example JSON:
//
//	{
//	  "eventId":     "uuid",
//	  "eventType":   "order.placed",
//	  "aggregateId": "uuid",
//	  "occurredAt":  "2026-06-17T12:00:00.000Z",
//	  "version":     1,
//	  "payload": { "orderId": "uuid", "customerId": "uuid", "items": [...] }
//	}
type OrderPlacedEvent struct {
	EventID     string             `json:"eventId"`
	EventType   string             `json:"eventType"`
	AggregateID string             `json:"aggregateId"`
	OccurredAt  string             `json:"occurredAt"`
	Version     int                `json:"version"`
	Payload     OrderPlacedPayload `json:"payload"`
}

// PaymentStatus represents the result of a payment gateway charge attempt.
type PaymentStatus string

const (
	StatusApproved PaymentStatus = "APPROVED"
	StatusRejected PaymentStatus = "REJECTED"
	StatusRefunded PaymentStatus = "REFUNDED"
)

// Payment is the internal domain entity persisted after processing.
type Payment struct {
	OrderID       string
	TransactionID string
	Status        PaymentStatus
	ProcessedAt   time.Time
}

// PaymentProcessedPayload is the inner payload of the PaymentProcessedEvent.
type PaymentProcessedPayload struct {
	OrderID       string        `json:"orderId"`
	TransactionID string        `json:"transactionId"`
	Status        PaymentStatus `json:"status"`
	ProcessedAt   string        `json:"processedAt"`
}

// PaymentProcessedEvent is the event envelope published back to the exchange
// after a payment attempt (success or permanent failure).
//
// It intentionally mirrors the same envelope structure as OrderPlacedEvent
// to keep the system contract consistent across services.
type PaymentProcessedEvent struct {
	EventID     string                  `json:"eventId"`
	EventType   string                  `json:"eventType"`
	AggregateID string                  `json:"aggregateId"`
	OccurredAt  string                  `json:"occurredAt"`
	Version     int                     `json:"version"`
	Payload     PaymentProcessedPayload `json:"payload"`
}
