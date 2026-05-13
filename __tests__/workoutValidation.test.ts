import {workoutInputSchema} from '../src/features/workouts/workout.schemas';
import {
  createWorkoutFormExerciseDraft,
  getWorkoutValidationMessage,
  reorderWorkoutExercises,
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
      'Exercício 1: informe as repetições.',
    );
  });

  it('creates a new exercise draft with an empty reps range', () => {
    expect(createWorkoutFormExerciseDraft().targetReps).toBe('');
  });

  it('reorders exercises while preserving each exercise data', () => {
    const exercises = [
      {...createWorkoutFormExerciseDraft(), name: 'Exercício A'},
      {...createWorkoutFormExerciseDraft(), name: 'Exercício B'},
      {...createWorkoutFormExerciseDraft(), name: 'Exercício C'},
    ];

    const reordered = reorderWorkoutExercises(exercises, 2, 0);

    expect(reordered.map(exercise => exercise.name)).toEqual([
      'Exercício C',
      'Exercício A',
      'Exercício B',
    ]);
    expect(exercises.map(exercise => exercise.name)).toEqual([
      'Exercício A',
      'Exercício B',
      'Exercício C',
    ]);
  });
});
