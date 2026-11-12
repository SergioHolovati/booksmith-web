import { PLOT_FIELDS } from '../../features/books/plot-ideas/plot-ideas';
import { appendIdea, ideaText } from './ideas';

describe('sugestões da IA', () => {
  it('a ideia entra com o título, ou só o texto', () => {
    expect(ideaText({ title: 'Medo do mar', text: 'E se Lia evitasse o porto?' })).toBe(
      'Medo do mar: E se Lia evitasse o porto?',
    );
    expect(ideaText({ title: '', text: 'Talvez ela tema o silêncio.' })).toBe('Talvez ela tema o silêncio.');
  });

  it('usar no campo acrescenta um parágrafo novo, sem apagar o que o autor escreveu', () => {
    expect(appendIdea('', 'Ideia', 100)).toBe('Ideia');
    expect(appendIdea('Tem medo de altura.  \n', 'Ideia', 100)).toBe('Tem medo de altura.\n\nIdeia');
  });

  it('não passa do limite do campo', () => {
    expect(appendIdea('x'.repeat(95), 'Ideia nova', 100)).toBeNull();
    expect(appendIdea('', 'x'.repeat(100), 100)).toBe('x'.repeat(100));
  });

  it('o enredo oferece as cinco partes que a API aceita', () => {
    expect(PLOT_FIELDS.map((f) => f.value)).toEqual(['next', 'conflict', 'twist', 'subplot', 'ending']);
  });
});
