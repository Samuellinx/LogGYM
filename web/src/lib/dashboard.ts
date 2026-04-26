import type {
  DashboardPersonalRecord,
  DashboardRecentExercise,
  DashboardSnapshot,
  WorkoutDocument,
  WorkoutSessionDocument,
} from '../types';
import {toSessionDate} from './sessionDate';

const compactFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const loadFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

const volumeFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const normalizeText = (value: string) => value.trim().toLowerCase();

const sortByPerformedAtDesc = (sessions: WorkoutSessionDocument[]) =>
  [...sessions].sort(
    (left, right) =>
      toSessionDate(right.performedAt).getTime() -
      toSessionDate(left.performedAt).getTime(),
  );

const getWeekStart = (reference: Date) => {
  const weekStart = new Date(reference);
  const weekday = weekStart.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  weekStart.setDate(weekStart.getDate() + offset);
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
};

export const filterWorkoutsBySearch = (
  workouts: WorkoutDocument[],
  search: string,
) => {
  const normalizedSearch = normalizeText(search);

  if (!normalizedSearch) {
    return workouts;
  }

  return workouts.filter(workout =>
    `${workout.name} ${workout.focus} ${workout.notes} ${workout.exercises
      .map(exercise => exercise.name)
      .join(' ')}`.toLowerCase().includes(normalizedSearch),
  );
};

export const filterSessionsBySearch = (
  sessions: WorkoutSessionDocument[],
  search: string,
) => {
  const normalizedSearch = normalizeText(search);

  if (!normalizedSearch) {
    return sessions;
  }

  return sessions.filter(session =>
    `${session.workoutName} ${session.focus} ${session.overallNotes} ${session.exercises
      .map(exercise => exercise.exerciseName)
      .join(' ')}`.toLowerCase().includes(normalizedSearch),
  );
};

const getWeeklySessionsCount = (
  sessions: WorkoutSessionDocument[],
  now = new Date(),
) => {
  const weekStart = getWeekStart(now).getTime();

  return sessions.filter(
    session => toSessionDate(session.performedAt).getTime() >= weekStart,
  ).length;
};

const getPersonalRecords = (
  sessions: WorkoutSessionDocument[],
): DashboardPersonalRecord[] => {
  const records = new Map<string, number>();

  sessions.forEach(session => {
    session.exercises.forEach(exercise => {
      const exerciseTopLoad = exercise.sets.reduce(
        (highestLoad, setItem) => Math.max(highestLoad, setItem.load || 0),
        0,
      );

      if (!exerciseTopLoad) {
        return;
      }

      const currentRecord = records.get(exercise.exerciseName) ?? 0;

      if (exerciseTopLoad > currentRecord) {
        records.set(exercise.exerciseName, exerciseTopLoad);
      }
    });
  });

  return [...records.entries()]
    .map(([exerciseName, maxLoad]) => ({exerciseName, maxLoad}))
    .sort((left, right) => right.maxLoad - left.maxLoad)
    .slice(0, 6);
};

const getRecentExercises = (
  sessions: WorkoutSessionDocument[],
): DashboardRecentExercise[] => {
  const recentExercises = new Map<string, DashboardRecentExercise>();

  sortByPerformedAtDesc(sessions).forEach(session => {
    session.exercises.forEach(exercise => {
      if (recentExercises.has(exercise.exerciseName)) {
        return;
      }

      const maxLoad = exercise.sets.reduce(
        (highestLoad, setItem) => Math.max(highestLoad, setItem.load || 0),
        0,
      );

      recentExercises.set(exercise.exerciseName, {
        exerciseName: exercise.exerciseName,
        lastPerformedAt: session.performedAt,
        totalSets: exercise.sets.length,
        maxLoad,
      });
    });
  });

  return [...recentExercises.values()].slice(0, 6);
};

export const buildDashboardSnapshot = (
  workouts: WorkoutDocument[],
  sessions: WorkoutSessionDocument[],
  search: string,
): DashboardSnapshot => {
  const sortedSessions = sortByPerformedAtDesc(sessions);

  return {
    highlightedWorkouts: filterWorkoutsBySearch(workouts, search).slice(0, 4),
    lastSession: sortedSessions[0] ?? null,
    personalRecords: getPersonalRecords(sortedSessions),
    recentExercises: getRecentExercises(sortedSessions),
    totalSessions: sortedSessions.length,
    totalTemplates: workouts.length,
    totalTrackedSets: sortedSessions.reduce(
      (sum, sessionItem) => sum + sessionItem.totalSets,
      0,
    ),
    weeklySessions: getWeeklySessionsCount(sortedSessions),
  };
};

export const formatCompactNumber = (value: number) => compactFormatter.format(value);

export const formatLoad = (value: number) =>
  value > 0 ? `${loadFormatter.format(value)} kg` : 'Sem carga';

export const formatVolume = (value: number) =>
  `${volumeFormatter.format(value)} kg`;

export const formatSessionDate = (value: string) =>
  dateFormatter.format(toSessionDate(value));
