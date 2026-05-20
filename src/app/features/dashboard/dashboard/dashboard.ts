import { Component, OnInit } from '@angular/core';

import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CardModule
  ],
  templateUrl: './dashboard.html'
})
export class DashboardComponent
implements OnInit {

  ngOnInit(): void {

    console.log(
      'DashboardComponent carregado', localStorage.getItem('access_token')
    );
  }
}