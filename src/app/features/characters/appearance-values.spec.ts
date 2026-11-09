import { AppearanceField } from '../../core/models/api.models';
import { isCustom, stableJson, toggleChoice, toggleMulti, withValue } from './appearance-values';

const eyeColor: AppearanceField = {
  key: 'eyeColor',
  label: 'Cor dos olhos',
  type: 'color',
  allowCustom: true,
  options: [
    { value: 'green', label: 'Verdes', hex: '#4f7a3a' },
    { value: 'blue', label: 'Azuis', hex: '#3f6fa8' },
  ],
};

describe('valores do formulário de aparência', () => {
  it('distingue opção de texto livre', () => {
    expect(isCustom(eyeColor, 'green')).toBe(false);
    expect(isCustom(eyeColor, 'cor de âmbar')).toBe(true);
    expect(isCustom(eyeColor, '')).toBe(false);
    expect(isCustom(eyeColor, undefined)).toBe(false);
  });

  it('tocar de novo na mesma opção desmarca', () => {
    const marked = toggleChoice({}, 'eyeColor', 'green');
    expect(marked).toEqual({ eyeColor: 'green' });
    expect(toggleChoice(marked, 'eyeColor', 'blue')).toEqual({ eyeColor: 'blue' });
    expect(toggleChoice(marked, 'eyeColor', 'green')).toEqual({});
  });

  it('múltipla escolha liga e desliga, e lista vazia some', () => {
    let values = toggleMulti({}, 'marks', 'freckles');
    values = toggleMulti(values, 'marks', 'scars');
    expect(values).toEqual({ marks: ['freckles', 'scars'] });
    values = toggleMulti(values, 'marks', 'freckles');
    values = toggleMulti(values, 'marks', 'scars');
    expect(values).toEqual({});
  });

  it('texto em branco remove o campo', () => {
    expect(withValue({ notes: 'algo' }, 'notes', '   ')).toEqual({});
    expect(withValue({}, 'height', 3)).toEqual({ height: 3 });
    expect(withValue({ height: 3 }, 'height', null)).toEqual({});
  });

  it('compara rascunho e versão salva sem depender da ordem das chaves', () => {
    expect(stableJson({ b: 1, a: { d: 2, c: [3] } })).toBe(stableJson({ a: { c: [3], d: 2 }, b: 1 }));
    expect(stableJson({ marks: ['a', 'b'] })).not.toBe(stableJson({ marks: ['b', 'a'] }));
  });
});
