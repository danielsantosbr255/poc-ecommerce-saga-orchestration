package gateway

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"math/big"
	"time"
)

var ErrTransient = errors.New("gateway: transient error, eligible for retry")

type MockGateway struct{}

func NewMockGateway() *MockGateway {
	return &MockGateway{}
}

func (g *MockGateway) Charge(ctx context.Context, orderID string) (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(100))
	if err != nil {
		return "", ErrTransient
	}

	if n.Int64() < 20 {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-time.After(100 * time.Millisecond):
		}
		return "", ErrTransient
	}

	// Simulate realistic processing latency (200–500ms)
	delay := 200 + n.Int64()%300 // 200-499ms
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	case <-time.After(time.Duration(delay) * time.Millisecond):
	}

	txID, err := generateID()
	if err != nil {
		return "", ErrTransient
	}
	return txID, nil
}

// generateID produces a random hex string suitable for use as a transaction ID.
func generateID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
