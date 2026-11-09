import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BottomNavComponent } from '../bottom-nav/bottom-nav';
import { SidebarComponent } from '../sidebar/sidebar';
import { TopbarComponent } from '../topbar/topbar';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, BottomNavComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {}
