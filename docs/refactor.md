# Blueprint de Arquitetura e Refatoração: `order-service`

Este documento serve como a única fonte da verdade (SSOT) para a arquitetura, design pattern e diretrizes de engenharia do microsserviço `order-service`.

O objetivo deste documento é guiar uma IA Engenheira de Software Sênior / Arquiteta a analisar um repositório existente, identificar desvios em relação a este blueprint, respeitar as regras atuais do projeto e traçar um plano de refatoração seguro.

---

## 1. Registros de Decisão Arquitetural (ADRs)

### ADR 001: Arquitetura Hexagonal Estrita (Portas e Adaptadores)

* **Contexto:** O `order-service` lida com o núcleo crítico de negócios do e-commerce (pedidos) e se integra com bancos de dados e orquestradores de SAGA.
* **Decisão:** Adotar a Arquitetura Hexagonal desacoplando totalmente o núcleo de negócio de frameworks e tecnologias externas.
* **Consequência:** Mudanças no driver de banco de dados (ex: DrizzleORM para outro) ou na ferramenta de SAGA (Temporal.io) não devem alterar o código das camadas de `domain` ou `application`.

### ADR 002: Use-Cases Segregados por Arquivo (Anti-God-Class)

* **Contexto:** Classes unificadas de serviço (ex: `OrderService`) acumulam muitas responsabilidades e geram acoplamento de dependências não utilizadas.
* **Decisão:** Cada operação de negócio deve ser um Caso de Uso isolado em seu próprio arquivo (ex: `CreateOrderUseCase`, `GetOrderUseCase`).
* **Consequência:** Alta aderência ao Princípio da Responsabilidade Única (SRP). Injeção explícita apenas das dependências necessárias para aquela operação específica.

### ADR 003: Validação em Duas Camadas (Zod + Domínio)

* **Contexto:** Dados inválidos poluem a memória do sistema e regras de negócio complexas precisam de consistência interna.
* **Decisão:** Separar a validação estrutural da validação de negócio.
    1. **Zod:** Valida o payload HTTP na borda (Adaptador de Entrada) e bloqueia requisições malformadas antes de atingirem o núcleo.
    2. **Entidade de Domínio:** Executa validações intrínsecas de negócio (regras de e-commerce, preços, quantidades) através de métodos de fabricação de entidades (`create`).

### ADR 004: Isolamento de Persistência via Mappers Desconectados

* **Contexto:** Os schemas de tabela do DrizzleORM e seus tipos expõem anotações e estruturas do banco de dados que não devem poluir o domínio. Métodos como `toJSON()` ou `restore()` dentro do domínio violam o isolamento.
* **Decisão:** Criar arquivos de `Mappers` separados fora do domínio (na camada de adaptadores de saída). A entidade de domínio expõe seu estado de forma pura; o mapeador faz a tradução bidirecional (Domínio <-> Banco / Domínio <-> HTTP).

### ADR 005: Segregação de Contratos via DTOs (Data Transfer Objects)

* **Contexto:** Casos de uso não devem aceitar objetos puros de requisições HTTP (como o `FastifyRequest`) para não se acoplarem ao protocolo de transporte.
* **Decisão:** Criar uma pasta dedicada a DTOs na camada de aplicação para representar os dados de entrada e saída dos Casos de Uso de forma puramente tecnológica-agnóstica.

### ADR 006: Validação de Variáveis de Ambiente no Bootstrap via Zod

* **Contexto:** Falhas em variáveis de ambiente configuradas incorretamente devem interromper a inicialização da aplicação imediatamente (*Fail-Fast*).
* **Decisão:** Utilizar um arquivo centralizado de configuração gerenciado e validado via Zod (ex: `env.ts`). A aplicação não deve subir se houver algum erro de tipagem ou ausência de credenciais das variáveis do Drizzle ou Temporal.

---

## 2. Estrutura Alvo de Pastas

A árvore de diretórios deve seguir a organização abaixo. Adapte o código existente para este modelo:

```text
src/
├── domain/                          # Núcleo puro (0% dependência de frameworks externos)
│   ├── entities/                    # Regras, estados e validações de negócio (Ex: Pedido)
│   ├── value-objects/               # Objetos imutáveis (Ex: Itens do pedido, Preço)
│   └── exceptions/                  # Exceções de negócio customizadas
├── application/                     # Orquestração da aplicação (Lógica agnóstica de entrega)
│   ├── use-cases/                   # Casos de Uso isolados (Ex: CriarPedido, BuscarPedido)
│   │   └── create-order.use-case.ts
│   │   └── create-order.use-case.spec.ts  # Teste Unitário Colocalizado
│   ├── dtos/                        # Contratos de dados de entrada/saída dos Casos de Uso
│   └── ports/                       # Fronteiras: Interfaces de entrada (Inbound) e saída (Outbound)
├── adapters/                        # Onde a tecnologia externa se conecta
│   ├── inbound/                     # Entrada / Drivers (HTTP / Fastify)
│   │   └── http/
│   │       └── fastify/
│   │           ├── controllers/     # Recebe HTTP, aciona Zod e chama Caso de Uso
│   │           ├── routes/          # Definições de rotas do Fastify + Metadados Swagger
│   │           └── schemas/         # Validações estruturais e OpenAPI schemas com Zod
│   └── outbound/                    # Saída / Driven (Bancos, APIs, Temporal)
│       ├── database/                # Repositórios concretos do DrizzleORM
│       │   ├── schema/              # Tabelas e definições específicas do Drizzle
│       │   ├── mappers/             # Tradutores (Ex: order.mapper.ts)
│       │   └── drizzle-order.repository.ts
│       └── temporal/                # Adaptador do Temporal.io (Workflows e Activities da SAGA)
├── main/                            # Fiação do Sistema (Composition Root)
│   ├── config/                      # Configurações globais, env.ts e Injeção de Dependências manual
│   ├── server.ts                    # Bootstrap e inicialização do Fastify
│   └── worker.ts                    # Bootstrap do Worker do Temporal.io
tests/                               # Apenas testes que necessitam de infraestrutura externa
└── e2e/                             # Testes de ponta a ponta (API real contra banco real)
```

---

## 3. Exemplos Conceituais de Referência

*Estes exemplos servem apenas para ilustrar o fluxo de dependências e isolamento arquitetural. Adapte-os para manter a compatibilidade com os nomes de métodos e atributos já existentes no projeto.*

### 3.1 Isolamento do Caso de Uso e Inversão de Dependência (Exemplo Conceitual)

O Caso de Uso deve receber as portas (interfaces) em seu construtor e operar apenas com tipos do Domínio e DTOs da Aplicação. **Proibido importar SDKs externos ou módulos do Drizzle aqui.**

```typescript
export class ExemploCreateOrderUseCase {
  constructor(
    private readonly orderRepositoryPort: IOrderRepository,
    private readonly sagaOrchestratorPort: ISagaOrchestrator
  ) {}

  async execute(dto: CreateOrderInputDTO): Promise<CreateOrderOutputDTO> {
    // 1. Instancia domínio (que se autovalida)
    // 2. Persiste através da interface da porta
    // 3. Inicia SAGA através da interface da porta
  }
}
```

### 3.2 O Papel do Mapper Separado (Exemplo Conceitual)

Localizado dentro de `adapters/outbound/database/mappers/`. Ele impede que os tipos de tabelas do Drizzle invadam seu domínio.

```typescript
export class ExemploOrderMapper {
  static toDomain(drizzleRawData: any): OrderEntity {
    // Transforma dados de tabelas do Drizzle em uma Entidade de Domínio Pura
  }

  static toPersistence(domainEntity: OrderEntity): any {
    // Transforma a Entidade de Domínio Pura no formato aceito pelos inserts do Drizzle
  }
}
```

---

## 4. Diretrizes de Testes (Onde e Como)

1. **Colocalização (Testes Unitários):** Todos os testes unitários (`.spec.ts` ou `.test.ts`) devem residir exatamente na mesma pasta do arquivo que estão testando.
    * *Benefício:* Facilidade de escaneabilidade e refatoração sem quebra de caminhos relativos.
2. **Mocks Isolados:** Os testes de casos de uso não devem carregar o banco Drizzle ou o cluster do Temporal. Use mocks estritos das interfaces das portas.
3. **Testes de Integração/E2E:** Devem ser mantidos isolados na pasta raiz `tests/e2e/`. Estes testes disparam rotas reais do Fastify contra instâncias reais de banco.

---

## 5. Diretrizes de Documentação (Swagger/OpenAPI)

1. **Localização:** A documentação pertence exclusivamente à camada de infraestrutura/transporte: `src/adapters/inbound/http/fastify/`.
2. **Contrato Único via Schemas Zod:** Evite arquivos YAML/JSON separados ou comentários JSDoc poluindo os métodos. Utilize os schemas do Zod em `fastify/schemas/` integrados ao ecossistema do Fastify (como o `fastify-type-provider-zod`) para expor automaticamente as rotas e tipos na rota `/docs`.
3. **Metadados Limpos:** Títulos, descrições, tags e respostas HTTP de sucesso/erro devem ficar embutidos nos metadados do validador da rota, deixando os controladores focados em repassar dados aos casos de uso.

### 5.1 Exemplo de Schema Unificado (Validação + Swagger)

Para evitar a duplicação de código e manter a documentação sincronizada com a validação de entrada, utilize a estrutura abaixo nos arquivos de schema. O ecossistema do Fastify lerá as propriedades do Zod e gerará o Swagger automaticamente.

```typescript
import { z } from 'zod';

export const createOrderRouteSchema = {
  // 1. Validação Estrutural da Requisição HTTP (Borda da API)
  body: z.object({
    customerId: z.string().uuid({ message: "ID do cliente inválido" }),
    items: z.array(
      z.object({
        productId: z.string().nonempty(),
        quantity: z.number().int().positive(),
        price: z.number().positive(),
      })
    ).min(1),
  }),

  // 2. Contrato de Resposta da API Documentado
  response: {
    201: z.object({
      orderId: z.uuid(),
    }),
  },

  // 3. Metadados lidos pelo @fastify/swagger para gerar a rota no /docs
  detail: {
    summary: 'Cria um novo pedido',
    description: 'Valida os dados HTTP na borda, invoca o Caso de Uso, persiste via DrizzleORM e inicia a SAGA no Temporal.io.',
    tags: ['Orders'],
  },
};
```

---

## 6. Instruções Críticas para a IA Executora (Seu papel)

Você atuará como um **QA Automatizado** e um **Arquiteto de Software Sênior**. Sua missão não é reescrever o projeto do zero, mas sim **refinar e adequar** o código existente às diretrizes deste documento, garantindo o menor impacto possível nas funcionalidades atuais.

### Suas Tarefas Obrigatórias

1. **Mapeamento de Desvios (Gap Analysis):** Examine o código atual do repositório. Identifique onde as classes de serviço unificadas violam a separação de Use-Cases e aponte vazamentos de infraestrutura (ex: se o domínio ou os casos de uso dependem de modelos do Drizzle ou do SDK do Temporal).
2. **Plano de Refatoração Incremental:** Proponha uma estratégia passo a passo dividida em pequenas etapas (commits conceituais) para que a aplicação continue funcionando e passando nos testes atuais durante a transição de pastas e arquivos.
3. **Pensamento Crítico Profissional:** Avalie o ecossistema existente no projeto e sugira melhorias. Responda criticamente:
    * Como está sendo tratado o gerenciamento de erros globais (Error Handler) no Fastify?
    * A orquestração do Temporal.io possui tratamento adequado para idempotência caso as activities falhem e sejam reexecutadas pelo engine de SAGA?
    * Como o nosso arquivo de validação de ambiente (env.ts com Zod) pode ser integrado de forma transparente no bootstrap do servidor Fastify e do worker do Temporal sem duplicação de lógica?

Analise o repositório agora, compare com as diretrizes deste documento e forneça o plano de ataque detalhado.
