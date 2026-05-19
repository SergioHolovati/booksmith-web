import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-books-list',
  standalone: true,
  imports: [
    ButtonModule,
    CardModule
  ],
  templateUrl: './books-list.html'
})
export class BooksListComponent {
  constructor(private router: Router) {}

  goToCreateBook() {
    this.router.navigate(['/books/create']);
  }
}