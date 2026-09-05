# LogGYM Web

Painel React + Vite para gerenciar treinos do mesmo usuário usado no app mobile.

## Rodar em DEV

```bash
npm run dev
```

Abra o painel em `http://localhost:5173/` para testar Google em DEV. Evite
`127.0.0.1`, porque o Firebase Auth valida o domínio exato da página.

## Build

```bash
npm run build
```

## Ambiente

Use `web/.env.example` como base para `web/.env`.

O painel depende de:

- Firebase Auth
- Firestore
- domínio `localhost` autorizado no Firebase Auth para DEV
