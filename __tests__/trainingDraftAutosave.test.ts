import {
  createTrainingDraftSnapshot,
  hasStartedTrainingDraft,
  parseTrainingDraftSnapshot,
  restoreTrainingDraftExercises,
  type TrainingDraftAutosavePayload,
} from '@/features/workouts/trainingDraftAutosave';
import type {WorkoutDetail} from '@/types/domain';

const workout: WorkoutDetail = {
  id: 'workout-1',
  name: 'Treino A',
  focus: 'Peito',
  notes: '',
  accentColor: '#7CFF4F',
  scheduledDay: null,
  exerciseCount: 2,
  lastPerformedAt: null,
  updatedAt: '2026-04-24T10:00:00.000Z',
  exercises: [
    {
      id: 'exercise-1',
      workoutId: 'workout-1',
      name: 'Supino',
      muscleGroup: 'Peito',
      baseLoad: '40',
      targetReps: '8-10',
      note: 'Ajustar banco',
      orderIndex: 0,
    },
    {
      id: 'exercise-2',
      workoutId: 'workout-1',
      name: 'Crucifixo',
      muscleGroup: 'Peito',
      baseLoad: '12',
      targetReps: '10-12',
      note: '',
      orderIndex: 1,
    },
  ],
};

describe('training draft autosave', () => {
  it('restores saved sets and keeps current workout exercise metadata', () => {
    const savedDraft: TrainingDraftAutosavePayload = {
      version: 1,
      userId: 'user-1',
      workoutId: 'workout-1',
      performedAt: '2026-04-24T12:00:00.000Z',
      overallNotes: 'Treino pesado',
      updatedAt: '2026-04-24T12:05:00.000Z',
      exercises: [
        {
          workoutExerciseId: 'exercise-1',
          exerciseName: 'Nome antigo',
          muscleGroup: 'Grupo antigo',
          baseLoad: '0',
          targetReps: '0',
          hint: 'Dica antiga',
          sets: [
            {load: '50', reps: '8', note: 'Boa execucao'},
            {load: '52,5', reps: '6', note: ''},
          ],
        },
      ],
    };

    expect(restoreTrainingDraftExercises(workout, savedDraft)).toEqual([
      {
        workoutExerciseId: 'exercise-1',
        exerciseName: 'Supino',
        muscleGroup: 'Peito',
        baseLoad: '40',
        targetReps: '8-10',
        hint: 'Ajustar banco',
        sets: [
          {load: '50', reps: '8', note: 'Boa execucao'},
          {load: '52,5', reps: '6', note: ''},
        ],
      },
      {
        workoutExerciseId: 'exercise-2',
        exerciseName: 'Crucifixo',
        muscleGroup: 'Peito',
        baseLoad: '12',
        targetReps: '10-12',
        hint: '',
        sets: [{load: '', reps: '', note: ''}],
      },
    ]);
  });

  it('round-trips a valid autosave payload and rejects malformed JSON', () => {
    const snapshot = createTrainingDraftSnapshot({
      userId: 'user-1',
      workoutId: 'workout-1',
      performedAt: '2026-04-24T12:00:00.000Z',
      overallNotes: 'Treino salvo automaticamente',
      exercises: restoreTrainingDraftExercises(workout, null),
      updatedAt: '2026-04-24T12:10:00.000Z',
    });

    expect(parseTrainingDraftSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(parseTrainingDraftSnapshot('{invalid')).toBeNull();
    expect(parseTrainingDraftSnapshot(JSON.stringify({version: 2}))).toBeNull();
  });

  it('only treats a draft as started when there is actual progress', () => {
    const blankDraft = createTrainingDraftSnapshot({
      userId: 'user-1',
      workoutId: 'workout-1',
      performedAt: '2026-04-24T12:00:00.000Z',
      overallNotes: '',
      exercises: restoreTrainingDraftExercises(workout, null),
      updatedAt: '2026-04-24T12:10:00.000Z',
    });

    const startedDraft = {
      ...blankDraft,
      exercises: [
        {
          ...blankDraft.exercises[0],
          sets: [{load: '50', reps: '', note: ''}],
        },
      ],
    };

    expect(hasStartedTrainingDraft(null)).toBe(false);
    expect(hasStartedTrainingDraft(blankDraft)).toBe(false);
    expect(hasStartedTrainingDraft(startedDraft)).toBe(true);
  });
});
