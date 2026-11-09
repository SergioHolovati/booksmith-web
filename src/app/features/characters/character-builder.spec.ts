import { AppearanceTab } from '../../core/models/api.models';
import { describe as portrait, progress, rollEmpty, valueText } from './appearance-values';

const FACE: AppearanceTab = {
  key: 'face',
  label: 'Rosto',
  group: 'appearance',
  fields: [
    {
      key: 'eyeColor',
      label: 'Cor dos olhos',
      type: 'color',
      allowCustom: true,
      options: [
        { value: 'green', label: 'Verdes' },
        { value: 'brown', label: 'Castanhos' },
      ],
    },
    { key: 'marks', label: 'Marcas', type: 'multi', options: [{ value: 'freckles', label: 'Sardas' }] },
    { key: 'notes', label: 'Notas', type: 'text' },
  ],
};

const TEMPERAMENT: AppearanceTab = {
  key: 'temperament',
  label: 'Temperamento',
  group: 'personality',
  fields: [
    {
      key: 'introExtro',
      label: 'Introvertido ↔ Extrovertido',
      type: 'scale',
      min: 1,
      max: 5,
      labels: ['Muito introvertido', 'Introvertido', 'Equilibrado', 'Extrovertido', 'Muito extrovertido'],
      poles: ['Introvertido', 'Extrovertido'],
    },
  ],
};

describe('montador de personagem', () => {
  it('mostra os valores como a pessoa leu na tela', () => {
    const eye = FACE.fields[0];
    expect(valueText(eye, 'green')).toBe('Verdes');
    expect(valueText(eye, 'cor de tempestade')).toBe('cor de tempestade');
    expect(valueText(FACE.fields[1], ['freckles', 'pinta no queixo'])).toBe('Sardas, pinta no queixo');
    expect(valueText(TEMPERAMENT.fields[0], 1)).toBe('Muito introvertido');
    expect(valueText(eye, undefined)).toBeNull();
  });

  it('monta o retrato só com o que foi preenchido, uma linha por aba', () => {
    expect(portrait([FACE, TEMPERAMENT], { eyeColor: 'green', notes: 'olhar cansado', introExtro: 2 })).toEqual([
      { tab: 'Rosto', text: 'Cor dos olhos: Verdes · Notas: olhar cansado' },
      { tab: 'Temperamento', text: 'Introvertido' },
    ]);
    expect(portrait([FACE], {})).toEqual([]);
  });

  it('conta o progresso por seção', () => {
    expect(progress([FACE, TEMPERAMENT], { eyeColor: 'green', introExtro: 3 })).toEqual({ filled: 2, total: 4 });
  });

  it('o dado sorteia só escolhas e escalas vazias, sem mexer no que já foi escolhido', () => {
    const rolled = rollEmpty(FACE, { notes: 'x' }, () => 0.99);
    expect(rolled).toEqual({ notes: 'x', eyeColor: 'brown' });
    expect(rollEmpty(FACE, { eyeColor: 'green' }, () => 0)).toEqual({ eyeColor: 'green' });
    expect(rollEmpty(TEMPERAMENT, {}, () => 0)).toEqual({ introExtro: 1 });
  });
});
