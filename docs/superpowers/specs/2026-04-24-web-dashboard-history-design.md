# Web Dashboard, History And Training Flow Design

## Goal

Adicionar as abas `Dashboard` e `Historico` ao painel web do LogGYM e expandir o shell com telas dedicadas de `Progresso do exercicio` e `Execucao do treino`, deixando o fluxo mais proximo do app mobile.

## Scope

- Reaproveitar os dados que o painel web ja observa do Firestore: treinos e sessoes.
- Manter a area de `Treinos` atual como editor e biblioteca.
- Manter a area de `Perfil` atual como hub de backup, importacao e sessao.
- Adicionar uma tela web de `Dashboard` com hero, metricas, busca, treinos em foco, recordes e exercicios recentes.
- Adicionar uma tela web de `Historico` com busca, resumo e lista de execucoes, incluindo exclusao de sessoes.
- Permitir abrir uma tela dedicada de progresso do exercicio a partir do dashboard e do historico.
- Permitir iniciar um treino no web e registrar a execucao completa com series, carga, repeticoes, notas e data.

## Architecture

- Continuar usando o shell atual do `web/src/App.tsx` para navegacao por abas, sem introduzir roteamento novo.
- Extrair o calculo das metricas e agregacoes de dashboard/historico para um helper puro dedicado, evitando inflar ainda mais o `App.tsx`.
- Expandir `web/src/lib/workouts.ts` com exclusao de sessao para suportar o fluxo de historico.
- Introduzir um estado local de tela dedicada dentro do shell atual para `exercise-progress` e `training-session`, mantendo as abas principais como eixo da navegacao.
- Extrair para helpers puros a montagem do progresso do exercicio e do payload de execucao do treino.

## Data Flow

- `watchWorkouts` continua alimentando a biblioteca de treinos.
- `watchRecentSessions` continua alimentando a lista completa de sessoes ordenadas por data.
- O helper derivado calcula:
  - sessoes da semana
  - volume total
  - recordes por exercicio
  - exercicios recentes
  - treinos em foco a partir da busca
  - historico filtrado
- O helper de progresso do exercicio calcula:
  - recorde de carga
  - volume acumulado
  - reps medias
  - series ordenadas por data
- O helper de execucao do treino transforma o draft digitado no web em `WorkoutSessionDocument` antes da gravacao no Firestore.

## UX Decisions

- A aba inicial autenticada passa a ser `Dashboard`, como no mobile.
- `Dashboard` usa linguagem e organizacao parecidas com o app:
  - boas-vindas
  - metricas
  - busca
  - treinos em foco
  - recordes
  - exercicios recentes
- `Dashboard` remove os chips de status abaixo de `Ultima sessao`, troca os numeros das metricas para branco e adiciona `Iniciar treino`.
- `Historico` usa:
  - busca
  - resumo de sessoes e volume
  - cards de execucao com foco, data, series, volume, observacoes e exercicios
- `Historico` elimina a duplicacao de texto entre `workoutName` e `focus` quando os dois valores forem equivalentes.
- `Progresso do exercicio` segue o espirito da tela mobile: stat cards, curva de carga e lista de series recentes.
- `Execucao do treino` segue o fluxo mobile: data, notas gerais, exercicios, adicionar/remover serie e salvar execucao.
- A exclusao no historico usa confirmacao nativa do navegador para manter o diff enxuto.

## Error Handling

- Reaproveitar o canal atual de `errorMessage` e `statusMessage`.
- Em caso de falha ao excluir sessao, exibir feedback consistente com o restante do painel.
- Em caso de falha ao salvar execucao, mostrar a mensagem no mesmo canal do shell principal.

## Validation

- O `web` hoje nao possui runner de testes configurado.
- A validacao desta entrega sera feita por:
  - `npm run build`
  - `npm run lint`
