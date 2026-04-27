import {
  createWorkoutExerciseDraft,
  validateWorkoutDocumentForSave,
} from '../web/src/lib/workoutEditor';

describe('web workout editor', () => {
  it('returns a friendly validation error when target reps is missing', () => {
    expect(() =>
      validateWorkoutDocumentForSave({
        id: 'workout-1',
        userId: 'user-1',
        name: 'Treino A',
        focus: 'Treino A',
        notes: '',
        accentColor: '#7CFF4F',
        scheduledDay: null,
        exercises: [
          {
            ...createWorkoutExerciseDraft(),
            name: 'Supino inclinado',
            muscleGroup: 'Peito',
            targetReps: '',
          },
        ],
        createdAt: '2026-04-27T12:00:00.000Z',
        updatedAt: '2026-04-27T12:00:00.000Z',
      }),
    ).toThrow('Exercício 1: informe a faixa de repetições.');
  });

  it('creates a new editor exercise draft with an empty reps range', () => {
    expect(createWorkoutExerciseDraft().targetReps).toBe('');
  });
});
