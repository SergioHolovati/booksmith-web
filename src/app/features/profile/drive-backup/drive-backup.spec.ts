import { DRIVE_RESULTS, whenText } from './drive-backup';

describe('backup no Google Drive', () => {
  it('a volta do Google vira uma mensagem', () => {
    expect(DRIVE_RESULTS['connected'].severity).toBe('success');
    expect(DRIVE_RESULTS['denied'].text).toContain('não autorizou');
  });

  it('a data do último backup sai em português', () => {
    expect(whenText('2026-11-12T23:30:00Z')).toMatch(/^\d{2}\/\d{2}\/2026 às \d{2}:\d{2}$/);
  });
});
