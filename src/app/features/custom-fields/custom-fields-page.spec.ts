import { toDraft, withType } from './custom-fields-page';

describe('campos próprios', () => {
  it('mantém a chave do campo e das opções ao virar rascunho', () => {
    const draft = toDraft({
      key: 'f_signo',
      label: 'Signo',
      type: 'choice',
      allowCustom: true,
      options: [{ value: 'o_aries', label: 'Áries' }],
    });
    expect(draft).toEqual({
      key: 'f_signo',
      label: 'Signo',
      type: 'choice',
      allowCustom: true,
      options: [{ value: 'o_aries', label: 'Áries' }],
    });
  });

  it('ajusta o rascunho ao trocar o tipo', () => {
    const text = { key: 'f_x', label: 'Temperamento', type: 'text' as const };
    expect(withType(text, 'choice').options).toEqual([{ label: '' }]);
    expect(withType(text, 'scale').poles).toEqual(['', '']);
    const choice = withType(text, 'multi');
    expect(withType(choice, 'text')).toEqual({ key: 'f_x', label: 'Temperamento', type: 'text' });
  });
});
