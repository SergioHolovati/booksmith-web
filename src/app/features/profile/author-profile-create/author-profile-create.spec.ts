import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthorProfileCreate } from './author-profile-create';

describe('AuthorProfileCreate', () => {
  let component: AuthorProfileCreate;
  let fixture: ComponentFixture<AuthorProfileCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthorProfileCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthorProfileCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
