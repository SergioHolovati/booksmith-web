import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ProgressSpinnerModule }
from 'primeng/progressspinner';

import { AuthService }
from '../../../core/services/auth-service';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [
    ProgressSpinnerModule
  ],
  templateUrl: './callback.html'
})
export class CallbackComponent
implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {


    const token =
      this.route.snapshot.queryParamMap
        .get('token');
    console.log(
      token
    );

    if (token) {
      this.authService.saveToken(
        token
      );

      this.router.navigate([
        '/dashboard'
      ]);

      return;
    }

    this.router.navigate([
      '/login'
    ]);
  }
}