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
import { AuthorProfileRequest } from '../models/autor-profile-request';


@Injectable({
  providedIn:
    'root'
})
export class
AuthorProfileService {

private readonly endpoint =
  `${API_BASE}/profile/author`;

  constructor(
    private http:
      HttpClient
  ) {}

  createProfile(
    request:
      AuthorProfileRequest
  ):
  Observable<any> {

    return this.http.post(
      this.endpoint,
      request
    );
  }

  getMyProfile():
  Observable<any> {

    return this.http.get(
      this.endpoint
    );
  }

  updateProfile(
    request:
      AuthorProfileRequest
  ):
  Observable<any> {

    return this.http.put(
      this.endpoint,
      request
    );
  }

  deleteProfile():
  Observable<any> {

    return this.http.delete(
      this.endpoint
    );
  }
}

