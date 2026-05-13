import {ZodError, type ZodIssue} from 'zod';

import {workoutDocumentSchema} from './documentSchemas';
import type {WorkoutDocument, WorkoutExerciseInput} from '../types';

const createDraftId = () => {
  const cryptoApi = (globalThis as {
    crypto?: {
      randomUUID?: () => string;
    };
  }).crypto;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createWorkoutExerciseDraft = (): WorkoutExerciseInput => ({
  id: createDraftId(),
  name: '',
  muscleGroup: '',
  baseLoad: '',
  targetReps: '',
  note: '',
  orderIndex: 0,
});

export const reorderWorkoutExercises = <Exercise>(
  exercises: Exercise[],
  fromIndex: number,
  toIndex: number,
) => {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= exercises.length ||
    toIndex >= exercises.length
  ) {
    return exercises;
  }

  const nextExercises = [...exercises];
  const [movedExercise] = nextExercises.splice(fromIndex, 1);
  nextExercises.splice(toIndex, 0, movedExercise);

  return nextExercises;
};

export const normalizeWorkoutForSave = (
  workout: WorkoutDocument,
  userId: string,
): WorkoutDocument => {
  const now = new Date().toISOString();

  return {
    ...workout,
    userId,
    name: workout.name.trim(),
    focus: workout.focus.trim() || workout.name.trim(),
    notes: workout.notes.trim(),
    scheduledDay: workout.scheduledDay === 'Livre' ? null : workout.scheduledDay,
    updatedAt: now,
    createdAt: workout.createdAt || now,
    exercises: workout.exercises
      .map((exercise, index) => ({
        ...exercise,
        name: exercise.name.trim(),
        muscleGroup: exercise.muscleGroup.trim(),
        baseLoad: exercise.baseLoad.trim(),
        targetReps: exercise.targetReps.trim(),
        note: exercise.note.trim(),
        orderIndex: index,
      }))
      .filter(exercise => exercise.name.length > 0),
  };
};

const formatWorkoutIssue = (issue: ZodIssue) => {
  const [rootKey, pathIndex, fieldKey] = issue.path;

  if (rootKey === 'exercises' && typeof pathIndex === 'number' && typeof fieldKey === 'string') {
    const exerciseLabel = `Exercício ${pathIndex + 1}`;

    switch (fieldKey) {
      case 'name':
        return `${exerciseLabel}: informe o nome.`;
      case 'muscleGroup':
        return `${exerciseLabel}: escolha o grupo ou tipo.`;
      case 'targetReps':
        return `${exerciseLabel}: informe as repetições.`;
      case 'baseLoad':
        return `${exerciseLabel}: use apenas números na carga.`;
      case 'note':
        return `${exerciseLabel}: reduza o tamanho da observação.`;
      default:
        break;
    }
  }

  switch (rootKey) {
    case 'name':
      return 'Informe um nome para o treino.';
    case 'focus':
      return 'Escolha o foco do treino.';
    case 'notes':
      return 'Reduza o tamanho das notas do treino.';
    case 'accentColor':
      return 'Escolha uma cor válida para o treino.';
    case 'scheduledDay':
      return 'Escolha um dia sugerido válido.';
    case 'exercises':
      return issue.message || 'Adicione pelo menos um exercício antes de salvar.';
    default:
      return issue.message || null;
  }
};

export const getWorkoutDocumentValidationMessage = (
  error: unknown,
  fallback = 'Não foi possível salvar o treino.',
) => {
  if (!(error instanceof ZodError)) {
    return fallback;
  }

  const messages = Array.from(
    new Set(
      error.issues
        .map(formatWorkoutIssue)
        .filter((message): message is string => Boolean(message && message.trim().length)),
    ),
  );

  if (messages.length === 0) {
    return fallback;
  }

  if (messages.length === 1) {
    return messages[0];
  }

  return `Antes de salvar, ajuste: ${messages.join(' ')}`;
};

export const validateWorkoutDocumentForSave = (
  workout: WorkoutDocument,
  fallback = 'Não foi possível salvar o treino.',
) => {
  const parsed = workoutDocumentSchema.safeParse(workout);

  if (!parsed.success) {
    throw new Error(getWorkoutDocumentValidationMessage(parsed.error, fallback));
  }

  return parsed.data;
};
