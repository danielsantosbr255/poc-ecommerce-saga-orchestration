package gateway

import "context"

type PaymentGateway interface {
	Charge(ctx context.Context, orderID string) (transactionID string, err error)
}
