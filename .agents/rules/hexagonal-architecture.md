---
trigger: always_on
glob: 
description: Arquitetura Hexagonal (Ports & Adapters)
---

# Arquitetura Hexagonal e Clean Code

- **Ports & Adapters (Hexagonal Architecture):** Mantenha o Core Application (Domain e Use-Cases) completamente isolado da infraestrutura. A comunicação com o mundo externo (banco de dados, HTTP, mensageria) deve ocorrer exclusivamente através de `Ports` (interfaces) definidas pela aplicação e implementadas por `Adapters`.
- **Regra de Dependência:** O domínio e os casos de uso não podem importar ou depender de tecnologias externas, frameworks ou bibliotecas de I/O. Use injetores de dependência (Composition Root).
- **Git:** Agrupe as mudanças em commits atômicos, testados e seguindo o Conventional Commits detalhado nas Skills de git-commits (`/git-commits`).
