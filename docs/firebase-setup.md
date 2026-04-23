# Firebase setup do LogGYM

Este repositório agora usa Firebase como identidade compartilhada e camada de sincronização entre:

- app mobile React Native
- painel web React
- Firestore por usuário

## 1. Criar o projeto Firebase

1. Acesse o Firebase Console.
2. Crie um projeto novo para o LogGYM.
3. Ative `Authentication`.
4. Habilite os provedores:
   - `Google`
   - `Email/Password`
5. Ative `Cloud Firestore`.

## 2. Configurar o app Android

O package esperado no Firebase é:

```text
com.loggym
```

Passos:

1. No Firebase Console, adicione um app Android com `com.loggym`.
2. Baixe o arquivo `google-services.json`.
3. Salve em:

```text
android/app/google-services.json
```

4. Gere o relatório de assinatura para obter SHA-1 e SHA-256:

```powershell
npm run android:signingReport
```

5. Cadastre no Firebase:
   - SHA-1 debug
   - SHA-256 debug
   - SHA-1 release
   - SHA-256 release

Sem isso, o login Google no Android pode falhar com erro de configuração.

## 3. Configurar o painel web

1. No Firebase Console, adicione um app Web.
2. Copie as chaves para `web/.env` usando `web/.env.example` como base.
3. Em `Authentication > Settings > Authorized domains`, adicione:

```text
localhost
```

Isso é necessario para login web em DEV.

## 4. Configurar variáveis mobile

Use `.env.example` como base para `.env`.

Variáveis importantes:

```env
LOGGYM_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
LOGGYM_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
LOGGYM_ENABLE_DEV_LOGIN=false
LOGGYM_FIREBASE_USE_EMULATORS=false
LOGGYM_FIREBASE_AUTH_EMULATOR_HOST=10.0.2.2:9099
LOGGYM_FIREBASE_FIRESTORE_EMULATOR_HOST=10.0.2.2:8080
```

Observações:

- `LOGGYM_GOOGLE_WEB_CLIENT_ID` é obrigatória para o login Google real no Android com Firebase Auth.
- `LOGGYM_ENABLE_DEV_LOGIN` deve permanecer `false` em fluxos normais.
- os emuladores Firebase são opcionais.

## 5. Publicar regras e índices

O repositório já inclui:

- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`

Depois de instalar o Firebase CLI e autenticar:

```bash
firebase login
firebase use <seu-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

## 6. Doctor

Use o doctor antes de rodar:

```bash
npm run firebase:doctor
```

Ele valida a presença de:

- `firebase.json`
- `firestore.rules`
- `.env`
- `web/.env`
- `android/app/google-services.json`

## 7. Rodar o projeto

Mobile:

```bash
npm install
npm start
npm run android:dev
```

Web:

```bash
npm run web:dev
```

## 8. Observações de segurança

- não versione `google-services.json`
- não versione `web/.env`
- mantenha keystore e senhas de release fora do repositório
- publique as regras do Firestore antes de usar contas reais
- valide os domínios autorizados do Auth antes de testar o painel web
