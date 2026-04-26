export type DeleteConfirmationType =
  | 'workout'
  | 'session'
  | 'exercise'
  | 'training-set'
  | 'training-draft';

type DeleteConfirmationInput = {
  type: DeleteConfirmationType;
  name: string;
};

export type DeleteConfirmationCopy = {
  title: string;
  description: string;
  confirmLabel: string;
};

export const getDeleteConfirmation = ({
  type,
  name,
}: DeleteConfirmationInput): DeleteConfirmationCopy => {
  switch (type) {
    case 'workout':
      return {
        title: 'Excluir treino?',
        description: `O treino ${name} será removido da sua lista. O histórico já salvo continua preservado.`,
        confirmLabel: 'Excluir treino',
      };
    case 'session':
      return {
        title: 'Excluir execução?',
        description: `A execução ${name} será removida do histórico e das métricas associadas.`,
        confirmLabel: 'Excluir execução',
      };
    case 'exercise':
      return {
        title: 'Excluir exercício?',
        description: `O exercício ${name} será removido do treino atual.`,
        confirmLabel: 'Excluir exercício',
      };
    case 'training-set':
      return {
        title: 'Excluir série?',
        description: `A série ${name} será removida do treino atual.`,
        confirmLabel: 'Excluir série',
      };
    case 'training-draft':
      return {
        title: 'Limpar treino?',
        description: `O rascunho em andamento de ${name} será apagado. As sessões já salvas continuam preservadas.`,
        confirmLabel: 'Limpar treino',
      };
  }
};
