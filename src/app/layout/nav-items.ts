export interface NavItem {
  label: string;
  icon: string;
  link: string;
}

/** Mesmos destinos na navegação inferior (celular) e na barra lateral (desktop). */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Início', icon: 'pi pi-home', link: '/home' },
  { label: 'Livros', icon: 'pi pi-book', link: '/books' },
  { label: 'Universos', icon: 'pi pi-globe', link: '/universes' },
  { label: 'Perfil', icon: 'pi pi-user', link: '/profile' },
];
