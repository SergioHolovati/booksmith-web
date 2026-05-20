import { Routes } from '@angular/router';

import { authGuard }
from './core/guards/auth-guard';

import { ShellComponent }
from './layout/shell/shell';

export const routes: Routes = [

  // Public
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then(c => c.LoginComponent)
  },

  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register')
        .then(c => c.RegisterComponent)
  },

  {
    path: 'forgot-password',
    loadComponent: () =>
      import(
        './features/auth/forgot-password/forgot-password'
      )
      .then(c =>
        c.ForgotPasswordComponent
      )
  },

  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/callback/callback')
        .then(c => c.CallbackComponent)
  },

  // Protected
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [

      {
        path: 'dashboard',
        loadComponent: () =>
          import(
            './features/dashboard/dashboard/dashboard'
          )
          .then(c =>
            c.DashboardComponent
          )
      },

      {
        path: 'books',
        loadComponent: () =>
          import(
            './features/books/pages/books-list/books-list'
          )
          .then(c =>
            c.BooksListComponent
          )
      },

      {
        path: 'books/create',
        loadComponent: () =>
          import(
            './features/books/pages/book-create/book-create'
          )
          .then(c =>
            c.BookCreateComponent
          )
      },
      {
        path: 'become-author',
        loadComponent: () =>
          import(
            './features/profile/author-profile-create/author-profile-create'
          )
          .then(c =>
            c.AuthorProfileCreateComponent
          )
      }
    ]
  },

  // Fallback
  {
    path: '**',
    redirectTo: 'login'
  }
];