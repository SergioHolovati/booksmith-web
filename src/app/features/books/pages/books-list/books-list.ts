import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  Router
} from '@angular/router';

import {
  firstValueFrom
} from 'rxjs';

import {
  CardModule
} from 'primeng/card';

import {
  ButtonModule
} from 'primeng/button';

import {
  TagModule
} from 'primeng/tag';

import {
  ProgressSpinnerModule
} from 'primeng/progressspinner';

import {
  BooksService
} from '../../../../core/services/book-service';
import { BookResponse } from '../../../../core/models/response/book-response';

@Component({
  selector:
    'app-books-list',

  standalone:
    true,

  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    ProgressSpinnerModule
  ],

  templateUrl:
    './books-list.html'
})
export class
BooksListComponent
implements OnInit {

  books:
    BookResponse[] =
    [];

  loading =
    true;

  constructor(
    private booksService:
      BooksService,

    private router:
      Router
  ) {}

  async ngOnInit():
  Promise<void> {

    await this.loadBooks();
  }

  async loadBooks():
  Promise<void> {

    try {

      this.books =
        await firstValueFrom(

          this.booksService
            .getMyBooks()
        );

    } catch (e) {

      console.error(
        'Error loading books',
        e
      );

    } finally {

      this.loading =
        false;
    }
  }

  createBook():
  void {

    this.router.navigate([
      '/books/create'
    ]);
  }

  editBook(
    id: string
  ): void {

    this.router.navigate([
      '/books/edit',
      id
    ]);
  }
}