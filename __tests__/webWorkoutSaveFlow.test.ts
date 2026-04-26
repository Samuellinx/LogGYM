import {
  resolveWorkoutSaveCompletion,
  workoutCreatedSuccessMessage,
  workoutUpdatedSuccessMessage,
} from '../web/src/lib/workoutSaveFlow';

describe('web workout save flow', () => {
  it('returns the creation success message and requests a clean editor for a new workout', () => {
    expect(
      resolveWorkoutSaveCompletion({
        savedWorkoutId: 'new-workout',
        existingWorkoutIds: ['existing-workout'],
      }),
    ).toEqual({
      isCreation: true,
      shouldResetEditor: true,
      shouldCloseEditor: true,
      successMessage: workoutCreatedSuccessMessage,
    });
  });

  it('keeps the editor populated when an existing workout is updated', () => {
    expect(
      resolveWorkoutSaveCompletion({
        savedWorkoutId: 'existing-workout',
        existingWorkoutIds: ['existing-workout'],
      }),
    ).toEqual({
      isCreation: false,
      shouldResetEditor: false,
      shouldCloseEditor: false,
      successMessage: workoutUpdatedSuccessMessage,
    });
  });
});
