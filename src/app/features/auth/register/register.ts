import {
  Component,
  OnInit
} from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import {
  Router,
  RouterLink
} from '@angular/router';

import { CommonModule }
from '@angular/common';

import { InputTextModule }
from 'primeng/inputtext';

import { PasswordModule }
from 'primeng/password';

import { ButtonModule }
from 'primeng/button';

import { CardModule }
from 'primeng/card';

import { AuthService }
from '../../../core/services/auth-service';
import { RegisterRequest }
from '../../../core/models/register-request';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CardModule
  ],
  templateUrl: './register.html'
})
export class RegisterComponent
implements OnInit {

  registerForm!: FormGroup;

  loading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService:
      AuthService
  ) {}

  ngOnInit(): void {

    // if (
    //   this.authService
    //     .getAccessToken()
    // ) {
    //   this.router.navigate([
    //     '/dashboard'
    //   ]);

    //   return;
    // }

    this.createForm();
  }

  private createForm(): void {

    this.registerForm =
      this.fb.group(
        {
          firstName: [
            '',
            Validators.required
          ],

          lastName: [
            '',
            Validators.required
          ],

          username: [
            '',
            Validators.required
          ],

          document: [
            '',
            Validators.required
          ],

          email: [
            '',
            [
              Validators.required,
              Validators.email
            ]
          ],

          password: [
            '',
            [
              Validators.required,
              Validators.minLength(8)
            ]
          ],

          confirmPassword: [
            '',
            Validators.required
          ],

          phone: [
            '',
            Validators.required
          ]
        },
        {
          validators:
            this.passwordMatchValidator()
        }
      );
  }

  private passwordMatchValidator():
  ValidatorFn {

    return (
      control:
        AbstractControl
    ):
      ValidationErrors | null => {

      const password =
        control.get(
          'password'
        )?.value;

      const confirmPassword =
        control.get(
          'confirmPassword'
        )?.value;

      if (
        password !==
        confirmPassword
      ) {
        return {
          passwordMismatch:
            true
        };
      }

      return null;
    };
  }

  async register(): Promise<void> {

    if (
      this.registerForm.invalid
    ) {
      this.registerForm
        .markAllAsTouched();

      return;
    }

    this.loading = true;

    const {
      confirmPassword,
      ...payload
    } =
      this.registerForm.value;

    const request = new RegisterRequest(
      payload.firstName,
      payload.lastName,
      payload.username,
      payload.document,
      payload.email,
      payload.password,
      payload.phone
    );

    let success = false;

    try {
      success = await this.authService
        .register(request);
    } catch {
      success = false;
    } finally {
      this.loading = false;
    }

    if (success) {
      this.router.navigate(['/login']);
      return;
    }
    
    alert('Registration failed. Please check your data and try again.');
  }

  get form() {
    return this.registerForm.controls;
  }

  get passwordsDoNotMatch():
  boolean {

    return !!(
      this.registerForm
        .hasError(
          'passwordMismatch'
        ) &&

      this.form[
        'confirmPassword'
      ].touched
    );
  }
}