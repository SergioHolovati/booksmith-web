import { CharacterRole, CharacterSheet } from '../../core/models/api.models';

export const ROLE_LABEL: Record<CharacterRole, string> = {
  protagonist: 'Protagonista',
  antagonist: 'Antagonista',
  supporting: 'Coadjuvante',
  minor: 'Secundário',
};

export const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as CharacterRole[]).map((value) => ({
  value,
  label: ROLE_LABEL[value],
}));

/** Campos de texto da ficha, na ordem da tela. */
export const SHEET_FIELDS: { key: keyof CharacterSheet; label: string; placeholder: string; long: boolean }[] = [
  { key: 'age', label: 'Idade', placeholder: 'Ex.: 17, ou "por volta dos 30"', long: false },
  { key: 'birthday', label: 'Aniversário', placeholder: 'Ex.: 3 de março', long: false },
  { key: 'occupation', label: 'Ocupação', placeholder: 'Ex.: barista, estudante, caçadora de recompensas', long: false },
  { key: 'personality', label: 'Personalidade', placeholder: 'Como ela é? Teimosa, gentil, desconfiada…', long: true },
  { key: 'voice', label: 'Jeito de falar', placeholder: 'Gírias, sotaque, frases típicas, se fala pouco…', long: true },
  { key: 'desires', label: 'O que deseja', placeholder: 'O que move o personagem', long: true },
  { key: 'fears', label: 'Medos', placeholder: 'Do que tem medo, o que evita', long: true },
  { key: 'secrets', label: 'Segredos', placeholder: 'O que esconde dos outros (e do leitor)', long: true },
  { key: 'backstory', label: 'História', placeholder: 'O que aconteceu antes do livro', long: true },
  { key: 'notes', label: 'Anotações', placeholder: 'Qualquer outra coisa', long: true },
];
