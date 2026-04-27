import {
  addDraftSetToExercise,
  createEmptyTrainingDraftState,
  createTrainingDraftSnapshot,
  hasStartedTrainingDraft,
  parseTrainingDraftSnapshot,
  restoreTrainingDraftState,
  restoreTrainingDraftExercises,
  type TrainingDraftAutosavePayload,
} from '@/features/workouts/trainingDraftAutosave';
import type {WorkoutDetail} from '@/types/domain';

type LegacyTrainingDraftAutosavePayload = Omit<
  TrainingDraftAutosavePayload,
  'version' | 'pendingExercises' | 'completedExercises'
> & {
  version: 1;
  exercises: Array<
    Omit<TrainingDraftAutosavePayload['pendingExercises'][number], 'orderIndex' | 'sets'> & {
      orderIndex?: number;
      sets: Array<{
        id?: string;
        load: string;
        reps: string;
        note: string;
      }>;
    }
  >;
};

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
    const savedDraft: LegacyTrainingDraftAutosavePayload = {
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
            {id: 'set-1', load: '50', reps: '8', note: 'Boa execucao'},
            {load: '52,5', reps: '6', note: ''},
          ],
        },
      ],
    };

    const restored = restoreTrainingDraftExercises(
      workout,
      savedDraft as unknown as TrainingDraftAutosavePayload,
    );

    expect(restored).toHaveLength(2);
    expect(restored[0]).toMatchObject({
      workoutExerciseId: 'exercise-1',
      orderIndex: 0,
      exerciseName: 'Supino',
      muscleGroup: 'Peito',
      baseLoad: '40',
      targetReps: '8-10',
      hint: 'Ajustar banco',
      sets: [
        {id: 'set-1', load: '50', reps: '8', note: 'Boa execucao'},
        {load: '52,5', reps: '6', note: ''},
      ],
    });
    expect(restored[0]?.sets[1]?.id).toEqual(expect.any(String));
    expect(restored[1]).toMatchObject({
      workoutExerciseId: 'exercise-2',
      orderIndex: 1,
      exerciseName: 'Crucifixo',
      muscleGroup: 'Peito',
      baseLoad: '12',
      targetReps: '10-12',
      hint: '',
      sets: [{load: '', reps: '', note: ''}],
    });
    expect(restored[1]?.sets[0]?.id).toEqual(expect.any(String));
  });

  it('restores completed exercises separately from pending ones', () => {
    const savedDraft = createTrainingDraftSnapshot({
      userId: 'user-1',
      workoutId: 'workout-1',
      performedAt: '2026-04-24T12:00:00.000Z',
      overallNotes: '',
      pendingExercises: [
        {
          ...restoreTrainingDraftExercises(workout, null)[1],
          sets: [{id: 'pending-set', load: '', reps: '', note: ''}],
        },
      ],
      completedExercises: [
        {
          ...restoreTrainingDraftExercises(workout, null)[0],
          sets: [{id: 'done-set', load: '50', reps: '8', note: ''}],
        },
      ],
      updatedAt: '2026-04-24T12:10:00.000Z',
    });

    const restored = restoreTrainingDraftState(workout, savedDraft);

    expect(restored.completedExercises).toHaveLength(1);
    expect(restored.completedExercises[0]).toMatchObject({
      workoutExerciseId: 'exercise-1',
      orderIndex: 0,
      sets: [{id: 'done-set', load: '50', reps: '8', note: ''}],
    });
    expect(restored.pendingExercises).toHaveLength(1);
    expect(restored.pendingExercises[0]).toMatchObject({
      workoutExerciseId: 'exercise-2',
      orderIndex: 1,
      sets: [{id: 'pending-set', load: '', reps: '', note: ''}],
    });
  });

  it('round-trips a valid autosave payload and rejects malformed JSON', () => {
    const snapshot = createTrainingDraftSnapshot({
      userId: 'user-1',
      workoutId: 'workout-1',
      performedAt: '2026-04-24T12:00:00.000Z',
      overallNotes: 'Treino salvo automaticamente',
      pendingExercises: restoreTrainingDraftExercises(workout, null),
      completedExercises: [],
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
      pendingExercises: restoreTrainingDraftExercises(workout, null),
      completedExercises: [],
      updatedAt: '2026-04-24T12:10:00.000Z',
    });

    const startedDraft = {
      ...blankDraft,
      pendingExercises: [
        {
          ...blankDraft.pendingExercises[0],
          sets: [{id: 'started-set', load: '50', reps: '', note: ''}],
        },
      ],
    };
    const completedDraft = {
      ...blankDraft,
      pendingExercises: [],
      completedExercises: [
        {
          ...blankDraft.pendingExercises[0],
          sets: [{id: 'done-set', load: '50', reps: '8', note: ''}],
        },
      ],
    };

    expect(hasStartedTrainingDraft(null)).toBe(false);
    expect(hasStartedTrainingDraft(blankDraft)).toBe(false);
    expect(hasStartedTrainingDraft(startedDraft)).toBe(true);
    expect(hasStartedTrainingDraft(completedDraft)).toBe(true);
  });

  it('adds a new blank set to the top of the selected exercise', () => {
    const drafts = restoreTrainingDraftExercises(workout, null);
    const seededDrafts = [
      {
        ...drafts[0],
        sets: [
          {id: 'set-1', load: '50', reps: '8', note: 'Boa execucao'},
          {id: 'set-2', load: '52,5', reps: '6', note: ''},
        ],
      },
      drafts[1],
    ];

    const updated = addDraftSetToExercise(seededDrafts, 0);

    expect(updated[0]?.sets).toHaveLength(3);
    expect(updated[0]?.sets[0]).toMatchObject({
      load: '',
      reps: '',
      note: '',
    });
    expect(updated[0]?.sets[0]?.id).toEqual(expect.any(String));
    expect(updated[0]?.sets[1]).toEqual({
      id: 'set-1',
      load: '50',
      reps: '8',
      note: 'Boa execucao',
    });
    expect(updated[0]?.sets[2]).toEqual({
      id: 'set-2',
      load: '52,5',
      reps: '6',
      note: '',
    });
  });

  it('creates an empty draft state shape', () => {
    expect(createEmptyTrainingDraftState()).toEqual({
      pendingExercises: [],
      completedExercises: [],
    });
  });
});
