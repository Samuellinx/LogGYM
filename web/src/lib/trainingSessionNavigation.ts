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
