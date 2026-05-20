import {
  Component,
  OnInit,
  ViewChild
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  MenuItem
} from 'primeng/api';

import {
  Menu
} from 'primeng/menu';

import {
  AvatarModule
} from 'primeng/avatar';

import {
  MenuModule
} from 'primeng/menu';

import { AuthService }
from '../../core/services/auth-service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    AvatarModule,
    MenuModule
  ],
  templateUrl: './topbar.html'
})
export class TopbarComponent
implements OnInit {

  @ViewChild('menu')
  menu!: Menu;

  userName =
    'User';

  menuItems:
    MenuItem[] = [];

  avatarUrl =
    'assets/image/avatar-placeholder.png';

  constructor(
    private authService:
      AuthService,

    private router:
      Router
  ) {}

  ngOnInit():
  void {

    this.loadUserName();

    this.buildMenu();
  }

  private loadUserName():
  void {

    this.userName =
      this.authService
        .getUserName();
    }

private buildMenu():
void {

  const isAuthor =
    this.authService
      .isAuthor();

  this.menuItems = [

    {
      label:
        'Edit Profile',

      icon:
        'pi pi-user-edit',

      command: () => {

        this.router.navigate([
          '/profile/edit'
        ]);
      }
    },

    ...(
      !isAuthor
        ? [
            {
              label:
                'Become Author',

              icon:
                'pi pi-pencil',

              command: () => {

                this.router.navigate([
                  '/become-author'
                ]);
              }
            }
          ]
        : [
            {
              label:
                'Author Profile',

              icon:
                'pi pi-book',

              command: () => {

                this.router.navigate([
                  '/author/profile'
                ]);
              }
            }
          ]
    ),

    {
      separator:
        true
    },

    {
      label:
        'Logout',

      icon:
        'pi pi-sign-out',

      command: () => {

        this.logout();
      }
    }
  ];
}
  async logout():
  Promise<void> {

    await this.authService
      .logout();
  }

  toggleMenu(
    event: Event
  ): void {

    this.menu.toggle(
      event
    );
  }
}