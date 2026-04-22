import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecruitmentNavbarComponent } from './recruitment-navbar.component';

describe('RecruitmentNavbarComponent', () => {
  let component: RecruitmentNavbarComponent;
  let fixture: ComponentFixture<RecruitmentNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecruitmentNavbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecruitmentNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
