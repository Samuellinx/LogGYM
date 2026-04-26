# Profile Avatars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover o upload de foto de perfil e substituir por uma selecao fixa de 8 avatares no mobile e no web.

**Architecture:** O perfil passa a persistir um `avatarId` estavel em vez de depender de `photoURL` e upload de imagem. O mobile continua usando o documento `users/{uid}` e o SQLite local para espelhar o perfil, enquanto o web passa a ler e gravar o mesmo documento de perfil no Firestore e resolve o avatar localmente pela mesma chave.

**Tech Stack:** React Native, React 19, TypeScript, Firebase Auth, Firestore, SQLite, Vite, Jest.

---

### Task 1: Definir o modelo de avatar e os testes de base

**Files:**
- Create: `src/features/auth/profileAvatarCatalog.ts`
- Create: `web/src/lib/profileAvatarCatalog.ts`
- Create: `__tests__/profileAvatarCatalog.test.ts`

- [ ] Criar um catalogo fixo com 8 avatares, ids estaveis e metadados suficientes para renderizacao.
- [ ] Escrever teste cobrindo:
  - total fixo de 8 avatares
  - ids unicos
  - avatar padrao valido
- [ ] Rodar `npm test -- --runTestsByPath __tests__\\profileAvatarCatalog.test.ts` e validar o RED.

### Task 2: Persistir `avatarId` no mobile

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/features/sync/firebaseTypes.ts`
- Modify: `src/storage/migrations.ts`
- Modify: `src/features/workouts/workoutRepository.ts`
- Modify: `src/features/auth/authService.ts`
- Modify: `src/store/useAppStore.ts`

- [ ] Adicionar `avatarId` ao tipo de sessao e ao perfil sincronizado.
- [ ] Criar migracao SQLite para a coluna `avatar_id`.
- [ ] Fazer `ensureUserRecord`, `findUserByEmail`, migracao legada e payload do Firestore preservarem `avatarId`.
- [ ] Substituir `updateProfilePhoto` por `updateProfileAvatar`.

### Task 3: Persistir `avatarId` no web

**Files:**
- Create: `web/src/lib/profile.ts`
- Modify: `web/src/types.ts`
- Modify: `web/src/App.tsx`
- Delete: `web/src/lib/profilePhoto.ts`
- Modify: `web/src/lib/auth.ts`

- [ ] Criar funcoes para ler e gravar o perfil do usuario em `users/{uid}` com `avatarId`.
- [ ] Popular o estado autenticado do web a partir do documento de perfil e nao mais de `photoURL`.
- [ ] Substituir o fluxo de arquivo/upload por selecao de avatar.

### Task 4: Ajustar UI do perfil nas duas superfícies

**Files:**
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/index.css`

- [ ] Mostrar preview do avatar atual no card de perfil.
- [ ] Adicionar grade de 8 avatares com estado selecionado e CTA direto.
- [ ] Remover botoes e inputs de upload de foto.

### Task 5: Validar e fechar

**Files:**
- Modify: `__tests__/profileAvatarCatalog.test.ts`

- [ ] Rodar `npm test -- --runTestsByPath __tests__\\profileAvatarCatalog.test.ts`.
- [ ] Rodar `npm run typecheck`.
- [ ] Rodar `npm run lint`.
- [ ] Rodar `npm --prefix web run typecheck`.
- [ ] Rodar `npm --prefix web run lint`.
- [ ] Rodar `npm --prefix web run build`.
