import {ZodError, type ZodIssue} from 'zod';

import type {WorkoutFormValues} from '@/features/workouts/workout.schemas';
import {setTypeOptions} from '@/utils/constants';

export const createWorkoutFormExerciseDraft = (): WorkoutFormValues['exercises'][number] => ({
  name: '',
  muscleGroup: setTypeOptions[2],
  baseLoadKg: '',
  baseLoadPlates: '',
  baseLoadLegacy: '',
  targetReps: '',
  note: '',
});

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
        return `${exerciseLabel}: informe a faixa de repetições.`;
      case 'baseLoadKg':
        return `${exerciseLabel}: use apenas números na carga em kg.`;
      case 'baseLoadPlates':
        return `${exerciseLabel}: use apenas números na carga em plates.`;
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

export const getWorkoutValidationMessage = (
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
