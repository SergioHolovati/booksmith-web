/** Mesma regra do backend (AuthDtos.PASSWORD_PATTERN). */
export const PASSWORD_PATTERN = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!])(?=\S+$).{8,}$/;

export function passwordChecks(value: string) {
  return [
    { label: '8+ caracteres', ok: value.length >= 8 },
    { label: 'Letra maiúscula', ok: /[A-Z]/.test(value) },
    { label: 'Letra minúscula', ok: /[a-z]/.test(value) },
    { label: 'Número', ok: /[0-9]/.test(value) },
    { label: 'Especial (@#$%^&+=!)', ok: /[@#$%^&+=!]/.test(value) },
  ];
}
