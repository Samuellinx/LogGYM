export const getTrainingStartActionConfig = (hasStartedDraft: boolean) => ({
  label: hasStartedDraft ? 'Continuar treino' : 'Iniciar treino',
  variant: hasStartedDraft ? ('resume' as const) : ('primary' as const),
});

export const getNextTrainingExerciseIndex = (
  currentExerciseIndex: number,
  totalExercises: number,
) => {
  const nextExerciseIndex = currentExerciseIndex + 1;

  if (nextExerciseIndex >= totalExercises) {
    return null;
  }

  return nextExerciseIndex;
};
