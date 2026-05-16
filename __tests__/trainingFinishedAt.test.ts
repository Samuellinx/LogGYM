import {formatSessionFinishedAt} from '../src/utils/formatters';
import {
  resolveSessionFinishedAt as resolveMobileSessionFinishedAt,
} from '../src/utils/sessionDate';
import {
  buildTrainingSessionDocument,
  resolveSessionFinishedAt as resolveWebSessionFinishedAt,
} from '../web/src/lib/trainingSession';
import type {TrainingDraftExercise, WorkoutDocument} from '../web/src/types';

describe('training session finalization timestamp', () => {
  const performedAt = '2026-05-05T12:00:00.000Z';
  const createdAt = '2026-05-05T21:15:00';
  const finishedAt = '2026-05-05T21:37:00';

  afterEach(() => {
    jest.useRealTimers();
  });

  it('prefers the real finalization timestamp over the normalized training day', () => {
    const session = {performedAt, createdAt, finishedAt};

    expect(resolveWebSessionFinishedAt(session)).toBe(finishedAt);
    expect(resolveMobileSessionFinishedAt(session)).toBe(finishedAt);
  });

  it('falls back to the stored creation timestamp for older sessions', () => {
    const session = {performedAt, createdAt};

    expect(resolveWebSessionFinishedAt(session)).toBe(createdAt);
    expect(resolveMobileSessionFinishedAt(session)).toBe(createdAt);
  });

  it('formats finalization date and time without showing the noon training-day default', () => {
    expect(formatSessionFinishedAt(finishedAt)).toContain('21:37');
    expect(formatSessionFinishedAt(null)).toBe('Ainda não finalizado');
  });

  it('stores finishedAt when a web training session is built for saving', () => {
    jest.useFakeTimers().setSystemTime(new Date(finishedAt));

    const workout: WorkoutDocument = {
      id: 'workout-1',
      userId: 'user-1',
      name: 'Peito 1',
      focus: 'Peito',
      notes: '',
      accentColor: '#38BDF8',
      scheduledDay: null,
      exercises: [],
      createdAt,
      updatedAt: createdAt,
    };
    const exercises: TrainingDraftExercise[] = [
      {
        workoutExerciseId: 'exercise-1',
        orderIndex: 0,
        exerciseName: 'Supino reto',
        muscleGroup: 'Peito',
        baseLoad: '40',
        targetReps: '8-10',
        hint: '',
        sets: [{id: 'set-1', seriesNumber: 1, load: '60', reps: '8', note: ''}],
      },
    ];

    const session = buildTrainingSessionDocument({
      userId: 'user-1',
      workout,
      performedAt: '2026-05-05',
      overallNotes: '',
      exercises,
    });

    expect(session.performedAt).toContain('2026-05-05');
    expect(session.finishedAt).toBe(new Date(finishedAt).toISOString());

  });
});
