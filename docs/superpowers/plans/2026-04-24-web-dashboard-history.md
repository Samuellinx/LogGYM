# Web Dashboard, History And Training Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar as abas `Dashboard` e `Historico` ao painel web do LogGYM e completar o fluxo com tela dedicada de progresso do exercicio e execucao do treino.

**Architecture:** O shell autenticado continua em `web/src/App.tsx`, mas passa a suportar telas dedicadas internas para progresso do exercicio e execucao do treino. A logica derivada e a montagem de payloads ficam em helpers puros, enquanto o acesso a Firestore continua concentrado em `web/src/lib/workouts.ts`.

**Tech Stack:** React 19, TypeScript, Firebase Firestore, Vite, ESLint.

---

### Task 1: Expandir o modelo de navegação e agregações

**Files:**
- Modify: `web/src/types.ts`
- Create: `web/src/lib/dashboard.ts`

- [ ] Adicionar os novos estados de view (`dashboard` e `history`) e os tipos derivados usados pelas novas telas.
- [ ] Implementar helpers puros para:
  - filtrar treinos
  - filtrar sessoes
  - calcular metricas do dashboard
  - calcular recordes e exercicios recentes
  - formatar carga, volume e datas
  - calcular progresso do exercicio
  - montar o documento de execucao do treino

### Task 2: Suportar exclusão de sessões no web

**Files:**
- Modify: `web/src/lib/workouts.ts`

- [ ] Adicionar funcao para excluir uma sessao do usuario logado pelo Firestore.
- [ ] Adicionar funcao para gravar uma nova execucao de treino no Firestore.
- [ ] Manter o modulo coerente com as funcoes ja existentes de leitura e refresh.

### Task 3: Integrar Dashboard e Historico no shell atual

**Files:**
- Modify: `web/src/App.tsx`

- [ ] Atualizar a view inicial autenticada para `dashboard`.
- [ ] Adicionar estados de busca separados para dashboard, treinos e historico.
- [ ] Integrar os novos helpers derivados.
- [ ] Renderizar as novas abas no shell autenticado.
- [ ] Adicionar o fluxo de exclusao de sessao no historico.
- [ ] Adicionar tela dedicada de progresso do exercicio.
- [ ] Adicionar tela dedicada de execucao do treino.
- [ ] Permitir iniciar treino a partir do dashboard e da biblioteca.
- [ ] Ajustar o hero dinamicamente para `Dashboard`, `Treinos`, `Historico` e `Perfil`.

### Task 4: Ajustar o layout e validar

**Files:**
- Modify: `web/src/index.css`

- [ ] Adicionar estilos para:
  - grade de metricas do dashboard
  - painel de insights
  - cards de recorde
  - cards de exercicios recentes
  - resumo e lista do historico
  - tela dedicada de progresso do exercicio
  - tela dedicada de execucao do treino
  - navegacao com quatro abas
- [ ] Validar com `npm run build`.
- [ ] Validar com `npm run lint`.
