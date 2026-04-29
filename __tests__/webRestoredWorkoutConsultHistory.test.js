const {readFileSync} = require('fs');
const path = require('path');

const appSource = readFileSync(
  path.join(__dirname, '..', 'web', 'src', 'App.tsx'),
  'utf8',
);

describe('web restored workout consult and history metrics', () => {
  it('keeps the workout consult action and modal wired in the web app', () => {
    expect(appSource).toContain('const [consultWorkout, setConsultWorkout]');
    expect(appSource).toContain('Consultar treino');
    expect(appSource).toContain('primary-button--consult');
    expect(appSource).toContain('workout-consult-modal');
    expect(appSource).toContain('Consulta de treino');
  });

  it('shows the last performed workout start time beside the day instead of updated metadata', () => {
    expect(appSource).toContain('Horario ultimo treino:');
    expect(appSource).toContain('getLatestWorkoutSession(workout.id, sessions)');
    expect(appSource).toContain(
      'formatWorkoutLastSessionTime(latestSession?.performedAt)',
    );
    expect(appSource).toContain('Não realizado');
    expect(appSource).not.toContain('Início:');
    expect(appSource).not.toContain('Atualizado:');
  });

  it('keeps the total lifted metrics visible in web history cards', () => {
    expect(appSource).toContain('history-card-metrics');
    expect(appSource).toContain('Maior carga -');
    expect(appSource).toContain('Total levantado -');
    expect(appSource).toContain('{sessionItem.totalSets} séries');
  });

  it('shows each exercise registered max load before falling back to suggested load', () => {
    expect(appSource).toContain(
      'getExercisePerformanceRecordFromSessions(workout.id, exercise, sessions)',
    );
    expect(appSource).toContain('Maior carga registrada:');
    expect(appSource).toContain('formatExercisePerformanceRecord(registeredPerformanceRecord)');
    expect(appSource).toContain('Carga sugerida:');
    expect(appSource).toContain('Não informada');
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
