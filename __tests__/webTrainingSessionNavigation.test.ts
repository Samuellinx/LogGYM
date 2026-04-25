import {getNextTrainingExerciseIndex} from '../web/src/lib/trainingSessionNavigation';

describe('training session navigation', () => {
  it('returns the next exercise index when there is another exercise', () => {
    expect(getNextTrainingExerciseIndex(0, 3)).toBe(1);
    expect(getNextTrainingExerciseIndex(1, 3)).toBe(2);
  });

  it('returns null for the last exercise', () => {
    expect(getNextTrainingExerciseIndex(2, 3)).toBeNull();
    expect(getNextTrainingExerciseIndex(0, 1)).toBeNull();
  });
});
