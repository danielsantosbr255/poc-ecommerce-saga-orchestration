# Product Requirement Document (PRD) & Especificação Técnica

## Sistema de Processamento de Pedidos Distribuído Resiliente

---

## 1. Visão Geral do Produto

O objetivo deste sistema é orquestrar o ciclo de vida de pedidos de ponta a ponta (Criação, Pagamento, Despacho e Notificação) de maneira altamente disponível e à prova de falhas.
O sistema opera de forma distribuída (microsserviços), adotando o padrão **Saga Orchestration** através da ferramenta **Temporal.io**. Garantimos que o fluxo de pedidos nunca perca seu estado (mesmo diante de reinicialização completa de pods), compensando automaticamente cenários em que transações periféricas falhem irreversivelmente.

---

## 2. Requisitos Funcionais (FR)

| ID | Requisito Funcional | Descrição |
| :--- | :--- | :--- |
| **FR-01** | **Criação de Pedidos** | O cliente deve poder submeter a intenção de compra via API HTTP, recebendo confirmação instantânea de "Pedido Recebido". |
| **FR-02** | **Pagamento Assíncrono** | O processamento do pagamento deve ocorrer através de rotinas executadas pelo Temporal (Activities), garantindo reexecução mediante timeouts do gateway de cartão. |
| **FR-03** | **Máquina de Estados de Pedidos** | O status do pedido deve evoluir sequencialmente e deterministicamente: `PENDING`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELED`. |
| **FR-04** | **Despacho Automatizado** | Após a confirmação de pagamento com sucesso, o Workflow avança automaticamente para o estágio de envio/despacho do produto. |
| **FR-05** | **Compensação Automatizada** | Se o despacho falhar por qualquer motivo (ex: endereço inexistente), a Saga reverte o fluxo, disparando a Activity de estorno do valor cobrado e cancelando o pedido. |
| **FR-06** | **Notificação do Cliente** | O Workflow avisa o cliente sobre todas as alterações de estado do pedido (ex: enviado com sucesso ou cancelado/reembolsado). |

---

## 3. Requisitos Não-Funcionais (NFR)

### NFR-01: Durabilidade de Execução (Execution Durability)

Ao adotar Temporal, não há perda de eventos em trânsito. A criação do pedido no banco de dados e a orquestração dos serviços periféricos ocorrem dentro do workflow. Se o servidor cair, ao voltar, ele lê a tabela de history do Temporal Server e retoma exatamente da linha de código em que havia parado. O Dual-Write Problem é eliminado ao delegar a persistência do pedido para a primeira atividade (`createOrder`) do próprio workflow.

### NFR-02: Garantia de Idempotência

Todas as Activities implementadas em Go (`ProcessPayment`, `RefundPayment`, `ShipOrder`) e a activity em TS (`createOrder`) são idempotentes. Se o servidor Temporal reenviar uma tarefa já concluída (devido a perda de acknowledgment na rede), a atividade identifica no banco de dados local que o passo foi executado e não o repete (como evitar dupla cobrança no cartão ou duplicidade de registro no banco).

### NFR-03: Tolerância a Falhas Temporárias e Backoff

Não lidamos com complexidade de Dead Letter Queues (DLQs) ou retry-loops customizados no código. As atividades do Temporal têm políticas de Backoff Exponencial nativas acopladas às configurações do Worker. Se um Gateway externo (como o Stripe ou Correios) ficar fora do ar, o Temporal fica retentando a atividade indefinidamente até o seu timeout máximo ou até o sistema retornar online.

---

## 4. Detalhamento Arquitetural: Saga Orchestration (Temporal)

O código se tornou declarativo e puramente procedural na ponta do Orquestrador (`OrderSagaWorkflow`).

### Visão do Orquestrador

1. Recebe a solicitação `StartWorkflow` com os dados validados do Controller da API (Node.js/Fastify) de forma assíncrona.
2. Persiste a order no banco de dados local (`Order Service`) através da activity local `createOrder`.
3. Coordena os Workers em Go através de invocação de **Activities** (`ProcessPayment`, `ShipOrder`, etc.).

### Design Simplificado de Componentes

```text
+-----------------------+              (Inicia Saga)               +-------------------------+
|   Client (HTTP API)   | -------------------------------------->  |   Order Service (Node)  |
+-----------------------+                                          |  [Workflow Execution]   |
                                                                   +-----------+-------------+
                                                                               |
                                                                               |
                               +-----------------------------------------------+------------------------------------------+
                               |                                               |                                          |
                               v                                               v                                          v
                   +------------------------+                     +------------------------+                 +---------------------------+
                   |  Payment Service (Go)  |                     |  Shipping Service (Go) |                 | Notification Service (Go) |
                   |  [ProcessPayment]      |                     |  [ShipOrder]           |                 | [NotifyCustomer]          |
                   |  [RefundPayment]       |                     +------------------------+                 +---------------------------+
                   +------------------------+
```

### Tolerância a Falhas Simplificada (Rollback)

Em vez de escutar eventos avulsos, tudo gira em torno de blocos limpos de Try/Catch.
Se o *Shipping Service* reportar erro fatal, o bloco "catch" no TypeScript (`OrderSagaWorkflow`) inicia os fluxos de compensação (como um rollback de banco de dados, só que globalizado por microsserviços), chamando a activity `RefundPayment` do *Payment Service*.

---

## 5. Eliminação de Modelos Antigos (Histórico Técnico)

Nas versões pregressas desta arquitetura, era utilizado **Saga Choreography** sobre **RabbitMQ**, que dependia fundamentalmente de **Transactional Outbox Patterns**. Tais abordagens geravam um alto volume de código "glue" (deamon background de relay de banco de dados relacional e tratamento fino de commits no Postgres) apenas para garantir envio de mensagens, que eram difíceis de rastrear.

A migração para **Temporal.io** tornou esses deamons obsoletos, condensando toda a confiabilidade de execução e visibilidade do estado da Saga diretamente na infraestrutura de Workflow.
