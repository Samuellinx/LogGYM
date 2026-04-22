# LogGYM

Aplicativo React Native Android-first para registrar treinos de musculacao, cargas, repeticoes e anotacoes com fluxo offline-first, login com Google ou conta local por e-mail e foco em usabilidade durante o treino.

## Stack

- React Native CLI `0.85.2`
- TypeScript `6.0.3`
- React Navigation `7`
- Zustand para estado global
- SQLite local com `react-native-nitro-sqlite`
- Keychain/Keystore com `react-native-keychain`
- Google Sign-In com `@react-native-google-signin/google-signin`
- Backup local com `@react-native-documents/picker` + `react-native-file-access`
- Validacao com `zod` + `react-hook-form`
- UI com `react-native-linear-gradient`, `react-native-svg` e `lucide-react-native`

## O que o app entrega

- Login com Google configuravel por `.env`
- Conta local por e-mail e senha com criacao de conta
- Recuperacao de senha por codigo de recuperacao
- Sessao persistida com Keychain/Keystore
- Uso offline depois do primeiro acesso valido neste aparelho
- Dashboard com cards clicaveis, busca rapida e atalhos para os fluxos principais
- Templates de treino editaveis
- Duplicacao de treino existente
- Registro de execucoes com series, carga, repeticoes e notas
- Resumo visual ao finalizar treino com estatisticas da sessao
- Historico local completo
- Busca e exclusao de execucoes no historico
- Evolucao de carga por exercicio
- Filtro de treinos por data
- Exportacao e importacao de backup local em JSON
- Importacao de treinos externos por `.txt`, `.csv`, `.xls` e `.xlsx`
- Build Android debug validado com `.apk`

## Estrutura principal

```text
src/
  app/
  components/
  features/
    auth/
    workouts/
  navigation/
  screens/
  storage/
  store/
  theme/
  types/
  utils/
android/
.env.example
```

## Pre-requisitos

- Node `>= 22.11`
- npm `>= 11`
- JDK `17`
- Android Studio com SDK `36`
- ADB no PATH

## Instalar dependencias

```bash
npm install
```

## Variaveis de ambiente

O projeto inclui:

- `.env.example` para referencia
- `.env` local com placeholders seguros para DEV

Variaveis esperadas:

```env
LOGGYM_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
LOGGYM_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
LOGGYM_ENABLE_DEV_LOGIN=true
```

Importante:

- Nao coloque secrets reais sensiveis no `.env`
- O app usa `.env` apenas para IDs publicos de configuracao
- No fluxo Android atual, `LOGGYM_GOOGLE_WEB_CLIENT_ID` e opcional
- `LOGGYM_ENABLE_DEV_LOGIN` fica reservado para fallback interno de desenvolvimento
- Credenciais de assinatura Android devem ficar em `~/.gradle/gradle.properties` ou ambiente local, nao no repositorio

## Configurar Google Sign-In no Android

1. Abra o Google Cloud Console.
2. Acesse `APIs & Services` -> `Credentials`.
3. Crie um OAuth Client do tipo `Android`.
4. Use o package name `com.loggym`.
5. Cadastre o SHA-1 da debug keystore.

Comando para obter o SHA-1 da debug keystore no Windows:

```powershell
keytool -list -v -alias androiddebugkey -keystore "$env:USERPROFILE\.android\debug.keystore" -storepass android -keypass android
```

6. Crie tambem um OAuth Client do tipo `Web`.
7. Copie o client ID Web para `LOGGYM_GOOGLE_WEB_CLIENT_ID` apenas se depois voce quiser `idToken` ou `offlineAccess`.
8. Se for usar iOS futuramente, preencha `LOGGYM_GOOGLE_IOS_CLIENT_ID`.
9. Quando for testar a APK release assinada, adicione tambem o SHA-1 da keystore release no Google Cloud Console.

Observacao:

- O login Google real depende dessa configuracao
- Para este MVP Android, o cliente OAuth `Android` com package name + SHA-1 correto e a parte obrigatoria
- Em release, o SHA-1 muda. Se ele nao estiver cadastrado no client OAuth Android, o login Google da APK release falha com `DEVELOPER_ERROR`
- Se voce informar `webClientId`, ele precisa ser um client ID do tipo `Web`; um valor incorreto tambem pode causar erro de configuracao
- `google-services.json` nao e necessario para este fluxo atual, a menos que voce integre Firebase Auth
- O app tambem oferece conta local por e-mail e senha, armazenada com seguranca no proprio aparelho
- O fallback controlado por `LOGGYM_ENABLE_DEV_LOGIN=true` continua reservado ao ambiente de desenvolvimento

Comando util para obter o SHA-1 da keystore release local:

```powershell
keytool -list -v -keystore ".\android\keystores\loggym-upload.jks" -alias loggym-upload
```

## Rodar em DEV no Android

Terminal 1:

```bash
npm start
```

Terminal 2:

```bash
npm run android:dev
```

Se preferir resetar o Metro:

```bash
npm run start:reset
```

## Gerar APK debug para teste

```bash
npm run apk:debug
```

APK gerado em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## APK release assinado

O build release agora falha de forma segura se a assinatura real nao estiver configurada. Nao existe mais fallback para debug keystore no `assembleRelease`.

1. Gere sua keystore de release:

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore ".\android\keystores\loggym-upload.jks" -alias loggym-upload -keyalg RSA -keysize 2048 -validity 9125
```

2. Use o modelo [`android/release-signing.example.properties`](android/release-signing.example.properties) como base e adicione as chaves `LOGGYM_*` em `%USERPROFILE%\.gradle\gradle.properties` com valores reais:

```properties
LOGGYM_UPLOAD_STORE_FILE=../keystores/loggym-upload.jks
LOGGYM_UPLOAD_STORE_PASSWORD=your_store_password
LOGGYM_UPLOAD_KEY_ALIAS=your_key_alias
LOGGYM_UPLOAD_KEY_PASSWORD=your_key_password
```

3. Valide a configuracao:

```bash
npm run release:check
```

4. Gere a APK release assinada:

```bash
npm run apk:release
```

APK gerada em:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Notas:

- guarde passwords e keystore fora do repositorio
- `LOGGYM_UPLOAD_*` pode vir de `~/.gradle/gradle.properties` ou de variaveis de ambiente
- o script `release:check` valida keystore, alias e JDK antes do build
- o build release publica com `usesCleartextTraffic=false`, Proguard e shrink de resources

## Backup local manual

O app agora permite:

- exportar um backup JSON do usuario autenticado
- importar esse backup no mesmo email/provedor autenticado
- restaurar treinos, exercicios, sessoes e series sem depender de backend

## Importacao de treinos externos

Na aba Perfil o app tambem permite:

- importar arquivos `.txt`, `.csv`, `.xls` e `.xlsx`
- transformar o conteudo em templates de treino do app
- reconhecer colunas como `Treino`, `Exercicio`, `Carga`, `Repeticoes`, `Dia`, `Cor` e `Observacoes`
- ignorar blocos vazios ou incompletos sem quebrar a importacao inteira
- salvar os treinos importados sem apagar os que ja existem

Observacoes:

- essa importacao e aditiva, diferente da restauracao de backup
- o parser aceita tanto planilhas tabulares quanto `.txt` estruturado por blocos
- os dados passam por validacao antes de entrar no SQLite

## Fluxos principais por tela

### Login

- entrar com Google quando houver internet e OAuth configurado
- entrar com conta local por e-mail e senha
- criar conta local com nome, e-mail, senha e codigo de recuperacao
- redefinir senha com e-mail + codigo de recuperacao

### Dashboard

- visualizar cards de resumo clicaveis para `Treinos` e `Historico`
- pesquisar treinos por nome, foco ou anotacoes
- abrir treino, iniciar execucao ou duplicar template
- consultar recordes pessoais e exercicios recentes com navegação para evolucao

### Treinos

- criar novo treino com nome, dia sugerido, cor e exercicios
- editar templates existentes
- duplicar treino para criar variacoes rapidas
- filtrar a lista por busca textual e por data usando calendario
- abrir detalhe do treino e iniciar execucao

### Execucao do treino

- registrar series com carga, repeticoes e anotacoes
- salvar apenas series validas no historico
- exibir modal final com check visual e estatisticas da sessao
- mostrar numero total de series, series por grupo muscular, maior e menor carga e maior e menor numero de repeticoes

### Historico

- pesquisar execucoes por treino, foco, exercicios e anotacoes
- visualizar volume total, top load e lista de exercicios por sessao
- excluir execucoes com confirmacao
- abrir a evolucao de um exercicio tocando nos chips do historico

### Perfil

- exportar backup manual
- restaurar backup da mesma conta autenticada
- importar treinos externos de `.txt` ou planilha
- atualizar dados locais e encerrar sessao

Regras de seguranca do backup:

- o arquivo importado passa por validacao estrutural com `zod`
- backups maiores que 5 MB sao bloqueados
- a restauracao recusa backup de outra conta
- o arquivo temporario em cache e apagado apos exportar/importar

## Scripts uteis

```bash
npm run verify
npm run lint
npm run lint:fix
npm run typecheck
npm run release:check
npm run apk:debug
npm run apk:release
```

## Modelo de dados

SQLite local com as tabelas:

- `users`
- `metadata`
- `workouts`
- `workout_exercises`
- `workout_sessions`
- `session_sets`

O historico guarda snapshots de nome de treino e exercicio para preservar os registros mesmo que o template seja alterado ou removido.

## Seguranca aplicada

- Sessao salva com `react-native-keychain`
- Sem AsyncStorage para informacao sensivel
- Sem persistencia de tokens Google em texto puro
- Conta local protegida com Keychain/Keystore e `accessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`
- Senha local derivada com `PBKDF2-SHA256`
- Codigo de recuperacao salvo apenas em formato derivado e nunca em texto puro
- Queries SQLite parametrizadas
- `.env` separado de variaveis de assinatura
- `allowBackup=false` no AndroidManifest
- `usesCleartextTraffic=true` apenas no build debug e `false` no release
- Proguard habilitado no release
- `assembleRelease` bloqueado sem keystore real configurada
- `build_config_package` protegido no Proguard para `react-native-config`
- Telas autenticadas protegidas pela raiz de navegacao
- Importacao externa validada antes de persistir no banco local
- Backup validado, limitado por tamanho e restrito a mesma conta autenticada

## Riscos residuais

- O login Google depende da configuracao correta de OAuth no Google Cloud
- O build release ainda depende da guarda segura da keystore e das passwords fora do repositorio
- Algumas dependencias Android exibem warnings de APIs deprecated do ecossistema, mas o build debug validado passou
- O fluxo offline atual e local-only; sincronizacao com backend ficou preparada apenas estruturalmente
- O backup e manual; ainda nao existe sincronizacao automatica ou criptografia ponta a ponta para exportacao
- A conta local por e-mail e senha e deste aparelho; o backup atual exporta treinos e historico, nao as credenciais locais

## Fluxo do app

```mermaid
flowchart TD
    A[Inicializacao do app] --> B[Bootstrap do SQLite]
    B --> C[Leitura da sessao segura no Keychain ou Keystore]
    C --> D{Sessao restaurada?}
    D -- Sim --> E[Carregar dashboard, treinos e historico locais]
    D -- Nao --> F[Tela de login]

    F --> G{Metodo de entrada}
    G --> H[Entrar com Google]
    G --> I[Entrar com conta local]
    G --> J[Criar conta local]
    G --> K[Esqueci a senha]

    H --> L[Validar OAuth Android]
    L --> M[Persistir sessao segura]
    I --> N[Validar email e senha locais]
    J --> O[Salvar credenciais locais seguras e criar usuario]
    K --> P[Validar codigo de recuperacao e redefinir senha]
    N --> M
    O --> M
    P --> F

    E --> Q[Dashboard]
    M --> Q

    Q --> R[Pesquisar treino]
    Q --> S[Abrir Treinos]
    Q --> T[Abrir Historico]
    Q --> U[Abrir Perfil]
    Q --> V[Abrir progresso de exercicio]

    S --> W[Criar ou editar treino]
    W --> X[Salvar template no SQLite]
    S --> Y[Filtrar por data]
    S --> Z[Duplicar treino]
    S --> AA[Detalhe do treino]
    Z --> AA
    X --> AA

    AA --> AB[Iniciar execucao]
    AB --> AC[Registrar series, cargas, repeticoes e notas]
    AC --> AD[Salvar sessao e series validas]
    AD --> AE[Atualizar dashboard e historico]
    AE --> AF[Mostrar check e estatisticas finais]
    AF --> T

    T --> AG[Buscar execucoes]
    T --> AH[Excluir execucao com confirmacao]
    T --> AI[Abrir evolucao do exercicio]

    U --> AJ[Exportar backup]
    U --> AK[Importar backup da mesma conta]
    U --> AL[Importar treino externo txt csv xls xlsx]
    U --> AM[Atualizar dados]
    U --> AN[Logout]
    AN --> AO[Limpar sessao segura]
    AO --> F
```

Resumo do fluxo:

- o app inicia, carrega SQLite e tenta restaurar a sessao segura
- sem sessao, o usuario pode entrar com Google, entrar com conta local, criar conta local ou redefinir senha
- com sessao valida, o app abre dashboard, treinos, historico e perfil usando os dados locais
- os templates alimentam a execucao e cada treino salvo gera historico, progresso por exercicio e um resumo final com estatisticas
- o perfil concentra backup, restauracao, importacao de treino externo, atualizacao manual e logout
- o logout limpa apenas a sessao, mantendo os dados locais da conta ja registrada

## Validacao executada neste workspace

- `npm run typecheck`
- `npm run lint`
- `npm run verify`
- `npm run apk:debug`

APK debug validado em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```
