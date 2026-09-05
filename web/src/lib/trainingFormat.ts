import {formatLoad} from './dashboard';
import type {ExercisePerformanceRecord} from './trainingSession';

export const formatTrainingMetric = (value: number, suffix = '') => {
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace('.', ',');

  return `${formatted}${suffix}`;
};

export const formatSuggestedLoad = (value: string) => {
  const load = value.trim();

  return load.length > 0 ? load : 'Não informada';
};

export const formatExercisePerformanceRecord = (record: ExercisePerformanceRecord) =>
  `${record.loadLabel?.trim() || formatLoad(record.load)} - ${formatTrainingMetric(
    record.reps,
  )} reps`;
