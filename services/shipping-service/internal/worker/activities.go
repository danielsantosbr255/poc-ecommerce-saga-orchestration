package worker

import (
	"context"
	"sync"

	"github.com/danielsantosbr255/shipping-service/internal/gateway"
)

type ShippingActivities struct {
	carrier   gateway.CarrierGateway
	processed sync.Map
}

func NewShippingActivities(carrier gateway.CarrierGateway) *ShippingActivities {
	return &ShippingActivities{
		carrier: carrier,
	}
}

func (a *ShippingActivities) ShipOrder(ctx context.Context, orderID string) error {
	if _, loaded := a.processed.LoadOrStore(orderID, true); loaded {
		// Idempotency: Already processed this orderID
		return nil
	}

	err := a.carrier.Dispatch(ctx, orderID)
	if err != nil {
		a.processed.Delete(orderID) // allow retry
		return err // Temporal handles retries and failures
	}

	return nil
}
