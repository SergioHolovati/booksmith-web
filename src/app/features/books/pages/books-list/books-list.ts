import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import { BookService } from '../../services/book-service';
import { BookResponse } from '../../models/book-response';
import { ProgressSpinner } from "primeng/progressspinner";

@Component({
  selector: 'app-books-list',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    ProgressSpinner
],
  templateUrl: './books-list.html',
  styleUrl: './books-list.scss'
})
export class BooksListComponent implements OnInit {

  books: BookResponse[] = [];

  page = 0;
  size = 8;

  totalPages = 0;
  totalElements = 0;

  loading = false;

  constructor(
    private router: Router,
    private bookService: BookService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBooks();
  }

  async loadBooks(): Promise<void> {

  this.loading = true;

  try {

    const response = await this.bookService.getBooks(this.page, this.size);

    this.books = [...response.content];
    this.totalPages = response?.totalPages ?? 0;
    this.totalElements = response?.totalElements ?? 0;

  } catch (error) {

    console.error('Error loading books', error);

    this.books = [];
    this.totalPages = 0;
    this.totalElements = 0;

  } finally {
    this.loading = false;
    this.cdr.markForCheck();
  }
}

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;

    this.page = page;
    this.loadBooks();
  }

  nextPage(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.loadBooks();
    }
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadBooks();
    }
  }

  createBook(): void {
    this.router.navigate(['/books/create']);
  }

  editBook(bookId: string): void {
    this.router.navigate(['/books/edit', bookId]);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }
}