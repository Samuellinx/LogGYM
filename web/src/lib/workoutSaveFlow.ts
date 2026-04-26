export const workoutCreatedSuccessMessage = 'Treino criado com sucesso';
export const workoutUpdatedSuccessMessage = 'Treino salvo com sucesso.';

type WorkoutSaveCompletionInput = {
  savedWorkoutId: string;
  existingWorkoutIds: string[];
};

export const resolveWorkoutSaveCompletion = ({
  savedWorkoutId,
  existingWorkoutIds,
}: WorkoutSaveCompletionInput) => {
  const isCreation = !existingWorkoutIds.includes(savedWorkoutId);

  return {
    isCreation,
    shouldResetEditor: isCreation,
    shouldCloseEditor: isCreation,
    successMessage: isCreation
      ? workoutCreatedSuccessMessage
      : workoutUpdatedSuccessMessage,
  };
};
