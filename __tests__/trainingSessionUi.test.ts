import {
  canFinalizeTrainingDraftExercise,
  finalizeTrainingDraftExercise,
  getNextTrainingExerciseIndex,
  getTrainingStartActionConfig,
  isTrainingDraftSetCompleted,
  mergeTrainingDraftExercisesForSave,
} from '@/features/workouts/trainingSessionUi';
import type {TrainingDraftExerciseState} from '@/features/workouts/trainingDraftAutosave';

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

  it('treats a set as completed only when load and reps are valid', () => {
    expect(
      isTrainingDraftSetCompleted({
        id: 'set-1',
        seriesNumber: 1,
        load: '40',
        reps: '8',
        note: '',
      }),
    ).toBe(true);
    expect(
      isTrainingDraftSetCompleted({
        id: 'set-2',
        seriesNumber: 2,
        load: '40',
        reps: '',
        note: '',
      }),
    ).toBe(false);
  });

  it('only finalizes an exercise when all sets are complete', () => {
    expect(
      canFinalizeTrainingDraftExercise({
        workoutExerciseId: 'exercise-1',
        orderIndex: 0,
        exerciseName: 'Supino',
        muscleGroup: 'Peito',
        baseLoad: '40',
        targetReps: '8-10',
        hint: '',
        sets: [
          {id: 'set-1', seriesNumber: 1, load: '40', reps: '8', note: ''},
          {id: 'set-2', seriesNumber: 2, load: '42,5', reps: '6', note: ''},
        ],
      }),
    ).toBe(true);
    expect(
      canFinalizeTrainingDraftExercise({
        workoutExerciseId: 'exercise-2',
        orderIndex: 1,
        exerciseName: 'Crucifixo',
        muscleGroup: 'Peito',
        baseLoad: '12',
        targetReps: '10-12',
        hint: '',
        sets: [{id: 'set-3', seriesNumber: 1, load: '12', reps: '', note: ''}],
      }),
    ).toBe(false);
  });

  it('moves a completed exercise out of the pending list', () => {
    const draftState: TrainingDraftExerciseState = {
      pendingExercises: [
        {
          workoutExerciseId: 'exercise-1',
          orderIndex: 0,
          exerciseName: 'Supino',
          muscleGroup: 'Peito',
          baseLoad: '40',
          targetReps: '8-10',
          hint: '',
          sets: [{id: 'set-1', seriesNumber: 1, load: '40', reps: '8', note: ''}],
        },
        {
          workoutExerciseId: 'exercise-2',
          orderIndex: 1,
          exerciseName: 'Crucifixo',
          muscleGroup: 'Peito',
          baseLoad: '12',
          targetReps: '10-12',
          hint: '',
          sets: [{id: 'set-2', seriesNumber: 1, load: '', reps: '', note: ''}],
        },
      ],
      completedExercises: [],
    };

    const updated = finalizeTrainingDraftExercise(draftState, 0);

    expect(updated).toEqual({
      pendingExercises: [draftState.pendingExercises[1]],
      completedExercises: [draftState.pendingExercises[0]],
    });
    expect(finalizeTrainingDraftExercise(draftState, 1)).toBeNull();
  });

  it('merges completed and pending exercises in template order for save', () => {
    const draftState: TrainingDraftExerciseState = {
      pendingExercises: [
        {
          workoutExerciseId: 'exercise-2',
          orderIndex: 1,
          exerciseName: 'Crucifixo',
          muscleGroup: 'Peito',
          baseLoad: '12',
          targetReps: '10-12',
          hint: '',
          sets: [{id: 'set-2', seriesNumber: 1, load: '', reps: '', note: ''}],
        },
      ],
      completedExercises: [
        {
          workoutExerciseId: 'exercise-1',
          orderIndex: 0,
          exerciseName: 'Supino',
          muscleGroup: 'Peito',
          baseLoad: '40',
          targetReps: '8-10',
          hint: '',
          sets: [{id: 'set-1', seriesNumber: 1, load: '40', reps: '8', note: ''}],
        },
      ],
    };

    expect(mergeTrainingDraftExercisesForSave(draftState).map(exercise => exercise.workoutExerciseId))
      .toEqual(['exercise-1', 'exercise-2']);
  });
});
