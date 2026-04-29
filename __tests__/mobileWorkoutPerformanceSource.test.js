const {readFileSync} = require('fs');
const path = require('path');

const trainingSessionSource = readFileSync(
  path.join(__dirname, '..', 'src', 'screens', 'TrainingSessionScreen.tsx'),
  'utf8',
);
const consultModalSource = readFileSync(
  path.join(__dirname, '..', 'src', 'components', 'WorkoutConsultModal.tsx'),
  'utf8',
);

describe('mobile workout performance information', () => {
  it('shows max performed load and reps above suggested load in the training session', () => {
    const performedLoadIndex = trainingSessionSource.indexOf('Maior carga realizada:');

    expect(trainingSessionSource).toContain('Maior carga realizada:');
    expect(trainingSessionSource).toContain('formatExercisePerformanceRecord');
    expect(
      trainingSessionSource.indexOf('Carga sugerida:', performedLoadIndex),
    ).toBeGreaterThan(performedLoadIndex);
  });

  it('shows registered max load and reps in the workout consult modal', () => {
    expect(consultModalSource).toContain('performanceRecords');
    expect(consultModalSource).toContain('Maior carga registrada:');
    expect(consultModalSource).toContain('formatExercisePerformanceRecord');
  });
});
