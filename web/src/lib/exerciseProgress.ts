import type {
  ExerciseProgressData,
  ExerciseProgressPoint,
  WorkoutSessionDocument,
} from '../types';

const normalizeToken = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const buildExerciseProgressData = (
  sessions: WorkoutSessionDocument[],
  exerciseName: string,
): ExerciseProgressData | null => {
  const normalizedExerciseName = normalizeToken(exerciseName);
  const points: ExerciseProgressPoint[] = [];

  [...sessions]
    .sort(
      (left, right) =>
        new Date(left.performedAt).getTime() - new Date(right.performedAt).getTime(),
    )
    .forEach(session => {
      session.exercises.forEach(exercise => {
        if (normalizeToken(exercise.exerciseName) !== normalizedExerciseName) {
          return;
        }

        exercise.sets.forEach(setItem => {
          if (setItem.load <= 0 || setItem.reps <= 0) {
            return;
          }

          points.push({
            performedAt: session.performedAt,
            workoutName: session.workoutName,
            load: setItem.load,
            reps: setItem.reps,
            volume: setItem.load * setItem.reps,
            note: setItem.note,
          });
        });
      });
    });

  if (!points.length) {
    return null;
  }

  const totalVolume = points.reduce((sum, point) => sum + point.volume, 0);
  const totalReps = points.reduce((sum, point) => sum + point.reps, 0);
  const recordLoad = points.reduce((record, point) => Math.max(record, point.load), 0);

  return {
    exerciseName,
    recordLoad,
    totalVolume,
    averageReps: totalReps / points.length,
    lastPerformedAt: points.at(-1)?.performedAt ?? null,
    points,
  };
};

export const buildSparklinePath = (
  values: number[],
  width = 640,
  height = 140,
) => {
  if (values.length === 0) {
    return '';
  }

  if (values.length === 1) {
    const centerY = height / 2;
    return `M 0 ${centerY} L ${width} ${centerY}`;
  }

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - minValue) / range) * height;

      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};
