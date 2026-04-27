import {workoutInputSchema} from '../src/features/workouts/workout.schemas';
import {
  createWorkoutFormExerciseDraft,
  getWorkoutValidationMessage,
} from '../src/features/workouts/workoutForm';

describe('mobile workout validation', () => {
  it('returns a friendly message when target reps is missing', () => {
    const parsed = workoutInputSchema.safeParse({
      name: 'Treino A',
      focus: 'Treino A',
      notes: '',
      accentColor: '#34C759',
      scheduledDay: 'Segunda',
      exercises: [
        {
          name: 'Supino inclinado',
          muscleGroup: 'Peito',
          baseLoad: '',
          targetReps: '',
          note: '',
        },
      ],
    });

    expect(parsed.success).toBe(false);
    expect(getWorkoutValidationMessage(parsed.error)).toBe(
      'Exercício 1: informe a faixa de repetições.',
    );
  });

  it('creates a new exercise draft with an empty reps range', () => {
    expect(createWorkoutFormExerciseDraft().targetReps).toBe('');
  });
});
