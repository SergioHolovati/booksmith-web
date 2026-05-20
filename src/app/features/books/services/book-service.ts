import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../../../config';

import { BookResponse } from '../models/book-response';
import { PageResponse } from '../models/page-response';

@Injectable({
  providedIn: 'root'
})
export class BookService {

  constructor(private http: HttpClient) {}

   getBooks(page: number, size: number) {
    return firstValueFrom(
      this.http.get<PageResponse<BookResponse>>(
        `${API_BASE}/books?page=${page}&size=${size}`
      )
    );
  }
}