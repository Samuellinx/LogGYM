import {
  getNextTrainingExerciseIndex,
  getTrainingStartActionConfig,
} from '@/features/workouts/trainingSessionUi';

describe('training session ui helpers', () => {
  it('uses continue state when the workout draft was started', () => {
    expect(getTrainingStartActionConfig(true)).toEqual({
      label: 'Continuar treino',
      variant: 'resume',
    });
  });

  it('uses start state when the workout draft was not started', () => {
    expect(getTrainingStartActionConfig(false)).toEqual({
      label: 'Iniciar treino',
      variant: 'primary',
    });
  });

  it('returns the next exercise index when there is another exercise', () => {
    expect(getNextTrainingExerciseIndex(0, 3)).toBe(1);
    expect(getNextTrainingExerciseIndex(1, 3)).toBe(2);
  });

  it('returns null for the last exercise', () => {
    expect(getNextTrainingExerciseIndex(2, 3)).toBeNull();
    expect(getNextTrainingExerciseIndex(0, 1)).toBeNull();
  });
});
