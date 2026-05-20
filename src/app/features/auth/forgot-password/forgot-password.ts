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
  RouterLink
} from '@angular/router';

import { CommonModule }
from '@angular/common';

import { CardModule }
from 'primeng/card';

import { InputTextModule }
from 'primeng/inputtext';

import { ButtonModule }
from 'primeng/button';

@Component({
  selector:
    'app-forgot-password',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    InputTextModule,
    ButtonModule
  ],

  templateUrl:
    './forgot-password.html'
})
export class
ForgotPasswordComponent {

  form!: FormGroup;

  loading = false;

  success = false;

  constructor(
    private fb:
      FormBuilder
  ) {

    this.form =
      this.fb.group({

      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ]
    });
  }

  sendResetLink():
  void {

    if (
      this.form.invalid
    ) {
      this.form
        .markAllAsTouched();

      return;
    }

    this.loading = true;

    const payload =
      this.form.value;

    console.log(
      'FORGOT PASSWORD',
      payload
    );

    /**
     * TODO
     *
     * this.authService
     * .forgotPassword(payload)
     */

    setTimeout(() => {
      this.loading =
        false;

      this.success =
        true;
    }, 1000);
  }

  get controls() {
    return this.form.controls;
  }
}