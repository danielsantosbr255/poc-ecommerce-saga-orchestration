package entity

import "time"

// PaymentProcessedPayload matches the payment-service output
type PaymentProcessedPayload struct {
	OrderID       string `json:"orderId"`
	TransactionID string `json:"transactionId"`
	Status        string `json:"status"` // "APPROVED" or "REJECTED"
	ProcessedAt   string `json:"processedAt"`
}

// PaymentProcessedEvent is the event received from the exchange
type PaymentProcessedEvent struct {
	EventID     string                  `json:"eventId"`
	EventType   string                  `json:"eventType"`
	AggregateID string                  `json:"aggregateId"`
	OccurredAt  string                  `json:"occurredAt"`
	Version     int                     `json:"version"`
	Payload     PaymentProcessedPayload `json:"payload"`
}

// ShippingStatus represents the state of a dispatch request
type ShippingStatus string

const (
	StatusPending    ShippingStatus = "PENDING"
	StatusDispatched ShippingStatus = "DISPATCHED"
	StatusFailed     ShippingStatus = "FAILED"
)

// ShippingRequest is the internal domain entity
type ShippingRequest struct {
	OrderID       string
	TransactionID string
	Status        ShippingStatus
	UpdatedAt     time.Time
}

// ShippingResultPayload is the inner payload of the result event
type ShippingResultPayload struct {
	OrderID       string         `json:"orderId"`
	TransactionID string         `json:"transactionId"`
	Status        ShippingStatus `json:"status"`
	UpdatedAt     string         `json:"updatedAt"`
	Reason        string         `json:"reason,omitempty"`
}

// ShippingResultEvent is the event published back to the exchange
type ShippingResultEvent struct {
	EventID     string                `json:"eventId"`
	EventType   string                `json:"eventType"`
	AggregateID string                `json:"aggregateId"`
	OccurredAt  string                `json:"occurredAt"`
	Version     int                   `json:"version"`
	Payload     ShippingResultPayload `json:"payload"`
}
