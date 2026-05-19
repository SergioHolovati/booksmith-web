import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-book-create',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    TextareaModule
  ],
  templateUrl: './book-create.html'
})
export class BookCreateComponent {
  title = '';
  description = '';

  createBook() {
    console.log({
      title: this.title,
      description: this.description
    });
  }
}