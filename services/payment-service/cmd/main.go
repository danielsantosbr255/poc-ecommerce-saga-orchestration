package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/danielsantosbr255/payment-service/internal/config"
	"github.com/danielsantosbr255/payment-service/internal/gateway"
	"github.com/danielsantosbr255/payment-service/internal/repository"
	"github.com/danielsantosbr255/payment-service/internal/worker"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	cfg := config.Load()
	slog.Info("payment-service starting", "rabbitmq_url", cfg.RabbitMQURL)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	repo := repository.NewMemoryRepository()
	gw := gateway.NewMockGateway()
	handler := worker.NewHandler(repo, gw, cfg.GatewayTimeoutMS)

	var wg sync.WaitGroup

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			slog.Info("connecting to RabbitMQ", "url", cfg.RabbitMQURL)
			conn, err := amqp.Dial(cfg.RabbitMQURL)
			if err != nil {
				slog.Error("failed to connect to RabbitMQ, retrying in 5s", "error", err)
				select {
				case <-ctx.Done():
					return
				case <-time.After(5 * time.Second):
					continue
				}
			}

			slog.Info("connected to RabbitMQ successfully")

			closeChan := conn.NotifyClose(make(chan *amqp.Error))
			consumer := worker.NewConsumer(conn, handler, cfg.QOSPrefetch, cfg.MaxRetries)

			if err := consumer.Run(ctx, &wg); err != nil {
				slog.Error("consumer stopped with error", "error", err)
			}

			_ = conn.Close()

			select {
			case <-ctx.Done():
				slog.Info("shutdown requested, stopping reconnection loop")
				return
			case err := <-closeChan:
				if err != nil {
					slog.Error("RabbitMQ connection closed, reconnecting...", "error", err)
				} else {
					slog.Warn("RabbitMQ connection closed, reconnecting...")
				}
				select {
				case <-ctx.Done():
					return
				case <-time.After(2 * time.Second):
				}
			}
		}
	}()

	<-ctx.Done()
	slog.Info("shutdown signal received — waiting for in-flight messages to finish")

	wg.Wait()

	slog.Info("all messages processed — payment-service stopped cleanly")
}
