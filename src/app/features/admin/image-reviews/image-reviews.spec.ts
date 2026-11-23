import { CATEGORY_LABEL, STATUS_LABEL, pendingText } from './image-reviews';

describe('imagens da moderação', () => {
  it('conta as imagens para revisar', () => {
    expect(pendingText(0)).toBe('Nada para revisar.');
    expect(pendingText(1)).toBe('1 imagem para revisar.');
    expect(pendingText(3)).toBe('3 imagens para revisar.');
  });

  it('dá nome a cada categoria e situação', () => {
    expect(CATEGORY_LABEL.BOOK_COVER).toBe('Capa');
    expect(STATUS_LABEL.blocked).toBe('Recusada na hora');
  });
});
