import { formatSize } from './save-file';

describe('tamanho do arquivo', () => {
  it('mostra KB até 1 MB e MB com uma casa depois', () => {
    expect(formatSize(200)).toBe('1 KB');
    expect(formatSize(389_614)).toBe('380 KB');
    expect(formatSize(5 * 1024 * 1024)).toBe('5,0 MB');
  });
});
