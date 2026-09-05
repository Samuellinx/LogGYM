import {
  buildTrainingCompletionSummary,
  buildTrainingSessionDocument,
} from '../web/src/lib/trainingSession';
import type {TrainingDraftExercise} from '../web/src/types';

describe('web training session completion summary', () => {
  it('builds the completion summary from valid draft sets', () => {
    const exercises: TrainingDraftExercise[] = [
      {
        workoutExerciseId: 'exercise-1',
        orderIndex: 0,
        exerciseName: 'Supino reto',
        muscleGroup: 'Peito',
        baseLoad: '40',
        targetReps: '8-10',
        hint: '',
        sets: [
          {id: 'set-1', seriesNumber: 1, load: '50', reps: '8', note: ''},
          {id: 'set-2', seriesNumber: 2, load: '52,5', reps: '6', note: 'pesado'},
        ],
      },
      {
        workoutExerciseId: 'exercise-2',
        orderIndex: 1,
        exerciseName: 'Puxada alta',
        muscleGroup: 'Costas',
        baseLoad: '30',
        targetReps: '10-12',
        hint: '',
        sets: [
          {id: 'set-3', seriesNumber: 1, load: '45', reps: '10', note: ''},
          {id: 'set-4', seriesNumber: 2, load: '', reps: '', note: ''},
        ],
      },
    ];

    expect(buildTrainingCompletionSummary('Treino A', exercises)).toEqual({
      workoutName: 'Treino A',
      totalSets: 3,
      seriesByGroup: [
        {label: 'Peito', count: 2},
        {label: 'Costas', count: 1},
      ],
      maxLoad: 52.5,
      minLoad: 45,
      maxReps: 10,
      minReps: 6,
    });
  });

  it('preserves short text load labels when saving a session', () => {
    const exercises: TrainingDraftExercise[] = [
      {
        workoutExerciseId: 'exercise-1',
        orderIndex: 0,
        exerciseName: 'Supino inclinado',
        muscleGroup: 'Peito',
        baseLoad: '2 placas',
        targetReps: '8-10',
        hint: '',
        sets: [{id: 'set-1', seriesNumber: 1, load: '2 placas', reps: '10', note: ''}],
      },
    ];

    const session = buildTrainingSessionDocument({
      userId: 'user-1',
      workout: {
        id: 'workout-1',
        userId: 'user-1',
        name: 'Peito',
        focus: 'Peito',
        notes: '',
        accentColor: '#39D98A',
        scheduledDay: null,
        exercises: [],
        createdAt: '2026-05-01T10:00:00.000Z',
        updatedAt: '2026-05-01T10:00:00.000Z',
      },
      performedAt: '2026-05-01T10:00:00.000Z',
      overallNotes: '',
      exercises,
    });

    expect(session.exercises[0]?.sets[0]).toMatchObject({
      load: 2,
      loadLabel: '2 placas',
      reps: 10,
    });
  });
});
