import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeekendEmpListComponent } from './weekend-emp-list.component';

describe('WeekendEmpListComponent', () => {
  let component: WeekendEmpListComponent;
  let fixture: ComponentFixture<WeekendEmpListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeekendEmpListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeekendEmpListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
