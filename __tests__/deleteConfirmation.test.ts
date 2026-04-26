import {getDeleteConfirmation} from '../web/src/lib/deleteConfirmation';

describe('delete confirmation copy', () => {
  it('describes workout deletion clearly', () => {
    expect(
      getDeleteConfirmation({
        type: 'workout',
        name: 'Upper forte',
      }),
    ).toEqual({
      title: 'Excluir treino?',
      description:
        'O treino Upper forte será removido da sua lista. O histórico já salvo continua preservado.',
      confirmLabel: 'Excluir treino',
    });
  });

  it('describes training draft cleanup clearly', () => {
    expect(
      getDeleteConfirmation({
        type: 'training-draft',
        name: 'Leg day',
      }),
    ).toEqual({
      title: 'Limpar treino?',
      description:
        'O rascunho em andamento de Leg day será apagado. As sessões já salvas continuam preservadas.',
      confirmLabel: 'Limpar treino',
    });
  });
});
