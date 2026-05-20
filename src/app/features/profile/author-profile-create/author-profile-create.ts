import {
  Component
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

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
  InputTextModule
} from 'primeng/inputtext';

import {
  TextareaModule
} from 'primeng/textarea';

import {
  AutoCompleteModule
} from 'primeng/autocomplete';

import {
  SelectModule
} from 'primeng/select';

import {
  ButtonModule
} from 'primeng/button';

import {
  AuthorProfileService} from '../../../core/services/author-profile-service';
import { AuthorProfileRequest } from '../../../core/models/autor-profile-request';

@Component({
  selector:
    'app-author-profile-create',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    TextareaModule,
    AutoCompleteModule,
    SelectModule,
    ButtonModule
  ],

  templateUrl:
    './author-profile-create.html'
})
export class
AuthorProfileCreateComponent {

  form!: FormGroup;

  avatarBase64:
    string | null =
    null;

  loading =
    false;

  audiences = [
    'Adult',
    'Young Adult',
    'Teen',
    'Children'
  ];

  languages = [
    'English',
    'Portuguese',
    'Spanish',
    'French'
  ];

  constructor(
    private fb:
      FormBuilder,

    private authorProfileService:
      AuthorProfileService,

    private router:
      Router
  ) {

    this.form =
      this.fb.group({

        penName: [
          '',
          Validators.required
        ],

        bio: [
          '',
          Validators.required
        ],

        socialLinks: [
          []
        ],

        bookGenres: [
          []
        ],

        writingStyle: [
          []
        ],

        authorReferences: [
          []
        ],

        audience: [
          '',
          Validators.required
        ],

        language: [
          '',
          Validators.required
        ]
      });
  }

  onAvatarSelected(
    event: Event
  ): void {

    const target =
      event.target;

    if (
      !target ||
      !(target instanceof HTMLInputElement)
    ) {
      return;
    }

    const file =
      target.files?.[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload =
      () => {

        if (
          typeof reader.result
          === 'string'
        ) {

          this.avatarBase64 =
            reader.result;
        }
      };

    reader.readAsDataURL(
      file
    );
  }

  async submit():
  Promise<void> {

    if (
      this.form.invalid
    ) {

      this.form
        .markAllAsTouched();

      return;
    }

    this.loading =
      true;

    const payload:
      AuthorProfileRequest = {

      avatar:
        this.avatarBase64,

      penName:
        this.form.value
          .penName,

      bio:
        this.form.value
          .bio,

      socialLinks:
        this.form.value
          .socialLinks ?? [],

      bookGenres:
        this.form.value
          .bookGenres ?? [],

      writingStyle:
        this.form.value
          .writingStyle ?? [],

      authorReferences:
        this.form.value
          .authorReferences ?? [],

      audience:
        this.form.value
          .audience,

      language:
        this.form.value
          .language
    };

    console.log(
      payload
    );

    try {

      await firstValueFrom(

        this
          .authorProfileService
          .createProfile(
            payload
          )
      );

      this.router.navigate([
        '/dashboard'
      ]);

    } catch (e) {

      console.error(
        'Error creating profile',
        e
      );

    } finally {

      this.loading =
        false;
    }
  }
}