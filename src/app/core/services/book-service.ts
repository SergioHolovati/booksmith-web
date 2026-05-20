import {
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  API_BASE
} from '../../config';
import { BookResponse } from '../models/response/book-response';


@Injectable({
  providedIn:
    'root'
})
export class
BooksService {

  private readonly endpoint =
    `${API_BASE}/books`;

  constructor(
    private http:
      HttpClient
  ) {}

  getMyBooks():
  Observable<BookResponse[]> {

    return this.http.get<
      BookResponse[]
    >(
      this.endpoint
    );
  }
}