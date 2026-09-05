const {readFileSync} = require('fs');
const path = require('path');

const appSource = readFileSync(
  path.join(__dirname, '..', 'web', 'src', 'App.tsx'),
  'utf8',
);
const historyWorkspaceSource = readFileSync(
  path.join(__dirname, '..', 'web', 'src', 'components', 'HistoryWorkspace.tsx'),
  'utf8',
);
const feedbackModalsSource = readFileSync(
  path.join(__dirname, '..', 'web', 'src', 'components', 'FeedbackModals.tsx'),
  'utf8',
);

describe('web restored workout consult and history metrics', () => {
  it('keeps the workout consult action and modal wired in the web app', () => {
    expect(appSource).toContain('const [consultWorkout, setConsultWorkout]');
    expect(appSource).toContain('Consultar treino');
    expect(appSource).toContain('primary-button--consult');
    expect(feedbackModalsSource).toContain('workout-consult-modal');
    expect(feedbackModalsSource).toContain('Consulta de treino');
  });

  it('shows the last workout finalization date and time beside the day', () => {
    expect(feedbackModalsSource).toContain('Finalizado em:');
    expect(feedbackModalsSource).toContain('getLatestWorkoutSession(workout.id, sessions)');
    expect(feedbackModalsSource).toContain(
      'latestSession ? resolveSessionFinishedAt(latestSession) : null',
    );
    expect(feedbackModalsSource).toContain('Não realizado');
    expect(appSource).not.toContain('Início:');
    expect(appSource).not.toContain('Atualizado:');
  });

  it('keeps the total lifted metrics visible in web history cards', () => {
    expect(historyWorkspaceSource).toContain('history-card-metrics');
    expect(historyWorkspaceSource).toContain('Maior carga -');
    expect(historyWorkspaceSource).toContain('Total levantado -');
    expect(historyWorkspaceSource).toContain('{sessionItem.totalSets} séries');
  });

  it('keeps the weekly progress insights visible in web history', () => {
    expect(appSource).toContain('<HistoryWorkspace');
    expect(historyWorkspaceSource).toContain('Progresso dos treinos');
    expect(historyWorkspaceSource).toContain('Treinos na semana');
    expect(historyWorkspaceSource).toContain('Semana a semana');
    expect(historyWorkspaceSource).toContain('Foco da semana');
    expect(historyWorkspaceSource).toContain('Recorde de carga');
  });

  it('shows each exercise registered max load before falling back to suggested load', () => {
    expect(feedbackModalsSource).toContain('getExercisePerformanceRecordFromSessions');
    expect(feedbackModalsSource).toContain('workout.id');
    expect(feedbackModalsSource).toContain('exercise');
    expect(feedbackModalsSource).toContain('sessions');
    expect(feedbackModalsSource).toContain('Maior carga registrada:');
    expect(feedbackModalsSource).toContain('formatExercisePerformanceRecord');
    expect(feedbackModalsSource).toContain('registeredPerformanceRecord');
    expect(feedbackModalsSource).toContain('Carga sugerida:');
    expect(feedbackModalsSource).toContain('formatSuggestedLoad(exercise.baseLoad)');
  });

  it('shows the performed max load and reps above the suggested load during training', () => {
    const performedLoadIndex = appSource.indexOf('Maior carga realizada:');

    expect(appSource).toContain('Maior carga realizada:');
    expect(appSource).toContain(
      'getExercisePerformanceRecordFromSessions(activeTrainingWorkout.id, exercise, sessions)',
    );
    expect(appSource.indexOf('Carga sugerida:', performedLoadIndex)).toBeGreaterThan(
      performedLoadIndex,
    );
  });
});
