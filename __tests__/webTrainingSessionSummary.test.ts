import {buildTrainingCompletionSummary} from '../web/src/lib/trainingSession';
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
});
