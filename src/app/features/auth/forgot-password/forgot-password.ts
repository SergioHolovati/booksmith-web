import {
  Component
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  RouterLink
} from '@angular/router';

import {
  InputTextModule
} from 'primeng/inputtext';

import {
  ButtonModule
} from 'primeng/button';

import {
  CardModule
} from 'primeng/card';

import {
  FloatLabelModule
} from 'primeng/floatlabel';

@Component({
  selector:
    'app-forgot-password',

  standalone:
    true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    ButtonModule,
    CardModule,
    FloatLabelModule
  ],

  templateUrl:
    './forgot-password.html',

  styleUrl:
    './forgot-password.scss'
})
export class
ForgotPasswordComponent {

  forgotForm:
    FormGroup;

  loading =
    false;

  successMessage =
    '';

  constructor(
    private fb:
      FormBuilder
  ) {

    this.forgotForm =
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

  async submit():
  Promise<void> {

    if (
      this.forgotForm.invalid
    ) {

      this.forgotForm
        .markAllAsTouched();

      return;
    }

    this.loading =
      true;

    try {

      const email =
        this
          .forgotForm
          .value
          .email;

      console.log(
        'send forgot password',
        email
      );

      // TODO:
      // call backend

      this.successMessage =
        'If an account exists for this email, we sent a reset link.';

    } catch (e) {

      console.error(e);

    } finally {

      this.loading =
        false;
    }
  }

  get form() {

    return this
      .forgotForm
      .controls;
  }
}