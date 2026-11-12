/**
 * Copia um texto para a área de transferência. `navigator.clipboard` só existe em conexão segura (https ou
 * localhost); pelo celular na rede de casa (http://192.168…) usa o caminho antigo, com uma caixa de texto
 * escondida. Devolve se deu certo.
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // segue para o caminho antigo
    }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
