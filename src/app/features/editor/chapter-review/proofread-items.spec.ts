import { ProofreadIssue } from '../../../core/models/api.models';
import { BlockText } from '../proofread/proofread';
import { proofreadItems, uniqueRange } from './proofread-items';

function block(id: string, text: string): BlockText {
  return { id, text, segments: [{ textStart: 0, textEnd: text.length, docPos: 1, isText: true, skip: false }] };
}

function issue(text: string, word: string, replacements: string[], type: ProofreadIssue['type'] = 'spelling'): ProofreadIssue {
  return {
    offset: text.indexOf(word),
    length: word.length,
    type,
    message: `Erro em ${word}`,
    shortMessage: '',
    replacements,
    ruleId: 'R',
  };
}

describe('ortografia sem IA na revisão', () => {
  it('cada erro do corretor vira um apontamento com Corrigir', () => {
    const text = 'Ela nao respondeu e guardou a carta no bolço.';
    const items = proofreadItems([block('b1', text)], [{
      id: 'b1',
      issues: [issue(text, 'nao', ['não']), issue(text, 'bolço', ['bolso'])],
    }]);

    expect(items.map((i) => [i.quote, i.suggestion, i.fix])).toEqual([
      ['nao', 'não', true],
      ['bolço', 'bolso', true],
    ]);
    expect(items[0].problem).toBe('Erro em nao');
    expect(items[0].blockId).toBe('b1');
  });

  it('palavra repetida no parágrafo ganha vizinhas, para Corrigir cair no lugar certo', () => {
    const text = 'O muinto antigo e o muinto novo.';
    const second = text.lastIndexOf('muinto');
    const items = proofreadItems([block('b1', text)], [{
      id: 'b1',
      issues: [{ ...issue(text, 'muinto', ['muito']), offset: second }],
    }]);

    expect(items[0].quote).toBe('o muinto novo.');
    expect(items[0].suggestion).toBe('o muito novo.');
  });

  it('sem sugestão, só aponta; o "estilo" do corretor fica de fora', () => {
    const text = 'Era uma vez xyzw.';
    const items = proofreadItems([block('b1', text)], [{
      id: 'b1',
      issues: [issue(text, 'xyzw', []), issue(text, 'Era', ['Foi'], 'style')],
    }]);

    expect(items).toHaveLength(1);
    expect(items[0].fix).toBe(false);
  });

  it('o trecho único: abre até não haver outro igual no parágrafo', () => {
    expect(uniqueRange('a casa e a casa', 11, 15)).toEqual([7, 15]);
    expect(uniqueRange('só uma casa', 7, 11)).toEqual([7, 11]);
  });
});
