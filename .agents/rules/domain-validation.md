---
trigger: always_on
description: Domain-Driven Design (DDD) e Validação de Entidades (Runtime)
---

# Domain-Driven Design (DDD) e Validação de Entidades (Runtime)

- **Validação Estrita:** As Entidades de Domínio (ex: `OrderEntity`) não devem confiar apenas nos tipos estáticos do TypeScript. Elas devem validar os dados em tempo de execução (runtime) dentro de seus métodos de fábrica `create()` e de reconstituição `restore()`.
- **Invariantes do Domínio:** Garanta que dados essenciais (ex: valores totais sempre positivos `> 0`, UUIDs válidos) nunca entrem em um estado inválido (`NaN`, strings quebradas).
- **Testes de Entidade:** Ao mockar dados para os testes `.spec.ts` de entidades e repositórios, forneça **sempre payloads 100% válidos** e completos (ex: use `crypto.randomUUID()`), caso contrário a validação de runtime lançará um `Error` e quebrará os testes.
