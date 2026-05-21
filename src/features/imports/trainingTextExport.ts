const DEFAULT_ACCENT_COLOR = '#34C759';

export type ExportableWorkoutExercise = {
  name: string;
  muscleGroup: string;
  baseLoad: string;
  targetReps: string;
  note: string;
  orderIndex?: number;
};

export type ExportableWorkoutSessionSet = {
  load: number | string;
  reps: number | string;
  note?: string | null;
};

export type ExportableWorkoutSessionExercise = {
  exerciseName: string;
  muscleGroup?: string | null;
  sets: ExportableWorkoutSessionSet[];
};

export type ExportableWorkoutSession = {
  id?: string;
  workoutId?: string | null;
  workoutName?: string | null;
  focus?: string | null;
  performedAt: string;
  finishedAt?: string | null;
  createdAt?: string | null;
  overallNotes?: string | null;
  exercises: ExportableWorkoutSessionExercise[];
};

export type ExportableWorkout = {
  id?: string;
  name: string;
  focus: string;
  scheduledDay?: string | null;
  accentColor: string;
  notes: string;
  exercises: ExportableWorkoutExercise[];
  sessions?: ExportableWorkoutSession[];
};

const cleanText = (value: unknown) =>
  String(value ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeKey = (value: unknown) =>
  cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const formatExportNumber = (value: unknown) => cleanText(value);

const padDatePart = (value: number) => String(value).padStart(2, '0');

const resolveSessionDateValue = (session: ExportableWorkoutSession) =>
  cleanText(session.finishedAt) ||
  cleanText(session.createdAt) ||
  cleanText(session.performedAt);

const formatExportDateTime = (value: string) => {
  const cleaned = cleanText(value);

  if (!cleaned) {
    return 'Data não informada';
  }

  const parsed = new Date(cleaned);

  if (Number.isNaN(parsed.getTime())) {
    return cleaned;
  }

  const date = [
    padDatePart(parsed.getDate()),
    padDatePart(parsed.getMonth() + 1),
    parsed.getFullYear(),
  ].join('/');

  if (!/\d{1,2}:\d{2}/u.test(cleaned)) {
    return date;
  }

  const time = [
    padDatePart(parsed.getHours()),
    padDatePart(parsed.getMinutes()),
  ].join(':');

  return `${date} ${time}`;
};

const getSessionTimestamp = (session: ExportableWorkoutSession) => {
  const timestamp = new Date(resolveSessionDateValue(session)).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
};

const hasPerformedSets = (session: ExportableWorkoutSession) =>
  session.exercises.some(exercise => exercise.sets.length > 0);

const isSessionLinkedToWorkout = (
  workout: ExportableWorkout,
  session: ExportableWorkoutSession,
) => {
  const workoutId = cleanText(workout.id);
  const sessionWorkoutId = cleanText(session.workoutId);

  if (workoutId && sessionWorkoutId && workoutId === sessionWorkoutId) {
    return true;
  }

  const workoutNameKey = normalizeKey(workout.name);
  const sessionWorkoutNameKey = normalizeKey(session.workoutName);

  if (!workoutNameKey || workoutNameKey !== sessionWorkoutNameKey) {
    return false;
  }

  const workoutFocusKey = normalizeKey(workout.focus);
  const sessionFocusKey = normalizeKey(session.focus);

  return !workoutFocusKey || !sessionFocusKey || workoutFocusKey === sessionFocusKey;
};

const getWorkoutSessions = (
  workout: ExportableWorkout,
  allSessions: ExportableWorkoutSession[],
) => {
  const sessions = [
    ...(workout.sessions ?? []),
    ...allSessions.filter(session => isSessionLinkedToWorkout(workout, session)),
  ];
  const uniqueSessions = new Map<string, ExportableWorkoutSession>();

  sessions.forEach((session, index) => {
    if (!hasPerformedSets(session)) {
      return;
    }

    const key = cleanText(session.id) || [
      resolveSessionDateValue(session),
      cleanText(session.workoutName),
      index,
    ].join('::');

    uniqueSessions.set(key, session);
  });

  return Array.from(uniqueSessions.values()).sort(
    (left, right) => getSessionTimestamp(right) - getSessionTimestamp(left),
  );
};

const formatHistoryCount = (count: number) =>
  `${count} ${count === 1 ? 'treino anterior' : 'treinos anteriores'}`;

export const countTrainingTextExportSessions = (
  workouts: ExportableWorkout[],
  sessions: ExportableWorkoutSession[] = [],
) =>
  workouts
    .filter(workout => workout.exercises.length > 0)
    .reduce(
      (total, workout) => total + getWorkoutSessions(workout, sessions).length,
      0,
    );

export const buildTrainingTextExportContents = (
  workouts: ExportableWorkout[],
  sessions: ExportableWorkoutSession[] = [],
) => {
  const exportableWorkouts = workouts.filter(workout => workout.exercises.length > 0);

  if (exportableWorkouts.length === 0) {
    throw new Error('Não há treinos ativos com exercícios para exportar em TXT.');
  }

  const sections = exportableWorkouts.map(workout => {
    const lines = [
      `Treino: ${cleanText(workout.name) || 'Treino importado'}`,
      `Foco: ${cleanText(workout.focus) || 'Treino'}`,
      `Dia: ${cleanText(workout.scheduledDay) || 'Livre'}`,
      `Cor: ${cleanText(workout.accentColor) || DEFAULT_ACCENT_COLOR}`,
    ];

    const workoutNotes = cleanText(workout.notes);

    if (workoutNotes) {
      lines.push(`Observações do treino: ${workoutNotes}`);
    }

    const exercises = [...workout.exercises].sort(
      (left, right) => Number(left.orderIndex ?? 0) - Number(right.orderIndex ?? 0),
    );

    exercises.forEach(exercise => {
      lines.push('', `Exercício: ${cleanText(exercise.name)}`);

      const muscleGroup = cleanText(exercise.muscleGroup);
      const baseLoad = cleanText(exercise.baseLoad);
      const targetReps = cleanText(exercise.targetReps);
      const note = cleanText(exercise.note);

      if (muscleGroup) {
        lines.push(`Tipo de série: ${muscleGroup}`);
      }

      if (baseLoad) {
        lines.push(`Carga: ${baseLoad}`);
      }

      if (targetReps) {
        lines.push(`Repetições: ${targetReps}`);
      }

      if (note) {
        lines.push(`Observações: ${note}`);
      }
    });

    const workoutSessions = getWorkoutSessions(workout, sessions);

    if (workoutSessions.length > 0) {
      lines.push('', `Histórico realizado: ${formatHistoryCount(workoutSessions.length)}`);

      workoutSessions.forEach((session, sessionIndex) => {
        if (sessionIndex > 0) {
          lines.push('');
        }

        lines.push(
          `Data do treino realizado: ${formatExportDateTime(resolveSessionDateValue(session))}`,
        );

        const sessionNotes = cleanText(session.overallNotes);

        if (sessionNotes) {
          lines.push(`Observações do treino realizado: ${sessionNotes}`);
        }

        session.exercises.forEach(exercise => {
          lines.push(`Exercício realizado: ${cleanText(exercise.exerciseName)}`);

          const muscleGroup = cleanText(exercise.muscleGroup);

          if (muscleGroup) {
            lines.push(`Tipo de série realizado: ${muscleGroup}`);
          }

          exercise.sets.forEach((set, setIndex) => {
            const load = formatExportNumber(set.load);
            const reps = formatExportNumber(set.reps);
            const parts = [
              load ? `carga ${load}` : '',
              reps ? `repetições ${reps}` : '',
            ].filter(Boolean);

            lines.push(
              `Série realizada ${setIndex + 1}: ${
                parts.length > 0 ? parts.join(', ') : 'sem carga e repetições informadas'
              }`,
            );

            const setNote = cleanText(set.note);

            if (setNote) {
              lines.push(`Anotação realizada ${setIndex + 1}: ${setNote}`);
            }
          });
        });
      });
    }

    return lines.join('\n');
  });

  return `${sections.join('\n\n---\n\n')}\n`;
};
