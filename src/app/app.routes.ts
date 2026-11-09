import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guards';
import { unsavedChangesGuard } from './core/util/unsaved-changes.guard';

export const routes: Routes = [
  // Públicas
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((c) => c.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((c) => c.RegisterComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then((c) => c.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then((c) => c.ResetPasswordComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/callback/callback').then((c) => c.CallbackComponent),
  },

  // Editor em tela cheia: fora do shell, sem menus, para escrever no celular sem distração
  {
    path: 'write/:chapterId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/editor/chapter-editor/chapter-editor').then((c) => c.ChapterEditorComponent),
  },

  // Área logada
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((c) => c.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () => import('./features/home/home').then((c) => c.HomeComponent),
      },
      {
        path: 'books',
        loadComponent: () => import('./features/books/book-list/book-list').then((c) => c.BookListComponent),
      },
      {
        path: 'books/new',
        loadComponent: () => import('./features/books/book-form/book-form').then((c) => c.BookFormComponent),
      },
      {
        path: 'books/:bookId',
        loadComponent: () =>
          import('./features/books/book-detail/book-detail').then((c) => c.BookDetailComponent),
      },
      {
        path: 'books/:bookId/characters',
        loadComponent: () =>
          import('./features/characters/character-list/character-list').then((c) => c.CharacterListComponent),
      },
      {
        path: 'books/:bookId/characters/:characterId',
        loadComponent: () =>
          import('./features/characters/character-editor/character-editor').then((c) => c.CharacterEditorComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'books/:bookId/places',
        loadComponent: () => import('./features/places/place-list/place-list').then((c) => c.PlaceListComponent),
      },
      {
        path: 'books/:bookId/places/:placeId',
        loadComponent: () => import('./features/places/place-editor/place-editor').then((c) => c.PlaceEditorComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'books/:bookId/timeline',
        loadComponent: () => import('./features/timeline/timeline').then((c) => c.TimelineComponent),
      },
      {
        path: 'books/:bookId/continuity',
        loadComponent: () => import('./features/continuity/continuity').then((c) => c.ContinuityComponent),
      },
      {
        path: 'books/:bookId/import',
        loadComponent: () => import('./features/books/file-import/file-import').then((c) => c.FileImportComponent),
      },
      {
        path: 'books/:bookId/export',
        loadComponent: () => import('./features/books/book-export/book-export').then((c) => c.BookExportComponent),
      },
      {
        path: 'books/:bookId/edit',
        loadComponent: () => import('./features/books/book-form/book-form').then((c) => c.BookFormComponent),
      },
      {
        path: 'universes',
        loadComponent: () => import('./features/universes/universe-list').then((c) => c.UniverseListComponent),
      },
      {
        path: 'universes/:universeId/places',
        loadComponent: () => import('./features/places/place-list/place-list').then((c) => c.PlaceListComponent),
      },
      {
        path: 'universes/:universeId/places/:placeId',
        loadComponent: () => import('./features/places/place-editor/place-editor').then((c) => c.PlaceEditorComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'universes/:universeId/mundo',
        loadComponent: () => import('./features/lore/lore-list/lore-list').then((c) => c.LoreListComponent),
      },
      {
        path: 'universes/:universeId/mundo/:loreId',
        loadComponent: () => import('./features/lore/lore-editor/lore-editor').then((c) => c.LoreEditorComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'universes/:universeId/mapa',
        loadComponent: () =>
          import('./features/universes/map-generator/map-generator').then((c) => c.MapGeneratorComponent),
      },
      {
        path: 'universes/:universeId',
        loadComponent: () =>
          import('./features/universes/universe-builder/universe-builder').then((c) => c.UniverseBuilderComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'sessions',
        loadComponent: () => import('./features/sessions/sessions').then((c) => c.SessionsComponent),
      },
      {
        path: 'trash',
        loadComponent: () => import('./features/trash/trash').then((c) => c.TrashComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((c) => c.ProfileComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
