import {
  addDraftSet,
  canFinalizeTrainingDraftExercise,
  finalizeTrainingDraftExercise,
  getExercisePerformanceRecordFromSessions,
  mergeTrainingDraftExercisesForSave,
} from '../web/src/lib/trainingSession';
import type {
  TrainingDraftExercise,
  TrainingDraftExerciseState,
  WorkoutSessionDocument,
} from '../web/src/types';

describe('web training session draft sets', () => {
  it('adds a new blank set to the top of the selected exercise without renaming older sets', () => {
    const drafts: TrainingDraftExercise[] = [
      {
        workoutExerciseId: 'exercise-1',
        orderIndex: 0,
        exerciseName: 'Supino',
        muscleGroup: 'Peito',
        baseLoad: '40',
        targetReps: '8-10',
        hint: '',
        sets: [
          {id: 'set-1', seriesNumber: 1, load: '50', reps: '8', note: 'forte'},
          {id: 'set-2', seriesNumber: 2, load: '52,5', reps: '6', note: ''},
        ],
      },
    ];

    const updated = addDraftSet(drafts, 0);

    expect(updated[0]?.sets).toHaveLength(3);
    expect(updated[0]?.sets[0]).toMatchObject({
      seriesNumber: 3,
      load: '',
      reps: '',
      note: '',
    });
    expect(updated[0]?.sets[0]?.id).toEqual(expect.any(String));
    expect(updated[0]?.sets[1]).toEqual({
      id: 'set-1',
      seriesNumber: 1,
      load: '50',
      reps: '8',
      note: 'forte',
    });
    expect(updated[0]?.sets[2]).toEqual({
      id: 'set-2',
      seriesNumber: 2,
      load: '52,5',
      reps: '6',
      note: '',
    });
  });

  it('only allows finishing an exercise when all sets are complete', () => {
    expect(
      canFinalizeTrainingDraftExercise({
        workoutExerciseId: 'exercise-1',
        orderIndex: 0,
        exerciseName: 'Supino',
        muscleGroup: 'Peito',
        baseLoad: '40',
        targetReps: '8-10',
        hint: '',
        sets: [{id: 'set-1', seriesNumber: 1, load: '50', reps: '8', note: ''}],
      }),
    ).toBe(true);
    expect(
      canFinalizeTrainingDraftExercise({
        workoutExerciseId: 'exercise-1',
        orderIndex: 0,
        exerciseName: 'Supino',
        muscleGroup: 'Peito',
        baseLoad: '40',
        targetReps: '8-10',
        hint: '',
        sets: [{id: 'set-1', seriesNumber: 1, load: '50', reps: '', note: ''}],
      }),
    ).toBe(false);
  });

  it('returns the max performed load and reps for an exercise from saved sessions', () => {
    const sessions: WorkoutSessionDocument[] = [
      {
        id: 'session-1',
        userId: 'user-1',
        workoutId: 'workout-1',
        workoutName: 'Upper',
        focus: 'Upper',
        overallNotes: '',
        performedAt: '2026-04-20T10:00:00.000Z',
        createdAt: '2026-04-20T10:00:00.000Z',
        totalSets: 2,
        totalVolume: 800,
        topLoad: 50,
        exercises: [
          {
            workoutExerciseId: 'exercise-1',
            exerciseName: 'Supino',
            muscleGroup: 'Peito',
            sets: [
              {load: 40, reps: 10, note: ''},
              {load: 50, reps: 8, note: ''},
            ],
          },
        ],
      },
      {
        id: 'session-2',
        userId: 'user-1',
        workoutId: 'workout-1',
        workoutName: 'Upper',
        focus: 'Upper',
        overallNotes: '',
        performedAt: '2026-04-21T10:00:00.000Z',
        createdAt: '2026-04-21T10:00:00.000Z',
        totalSets: 1,
        totalVolume: 450,
        topLoad: 50,
        exercises: [
          {
            workoutExerciseId: 'exercise-1',
            exerciseName: 'Supino',
            muscleGroup: 'Peito',
            sets: [{load: 50, reps: 9, note: ''}],
          },
        ],
      },
    ];

    expect(
      getExercisePerformanceRecordFromSessions(
        'workout-1',
        {
          workoutExerciseId: 'exercise-1',
          exerciseName: 'Supino',
        },
        sessions,
      ),
    ).toEqual({
      load: 50,
      reps: 9,
    });
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
          sets: [{id: 'set-1', seriesNumber: 1, load: '50', reps: '8', note: ''}],
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
          sets: [{id: 'set-1', seriesNumber: 1, load: '50', reps: '8', note: ''}],
        },
      ],
    };

    expect(
      mergeTrainingDraftExercisesForSave(draftState).map(
        exercise => exercise.workoutExerciseId,
      ),
    ).toEqual(['exercise-1', 'exercise-2']);
  });
});
