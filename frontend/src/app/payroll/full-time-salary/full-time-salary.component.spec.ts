import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullTimeSalaryComponent } from './full-time-salary.component';

describe('FullTimeSalaryComponent', () => {
  let component: FullTimeSalaryComponent;
  let fixture: ComponentFixture<FullTimeSalaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullTimeSalaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FullTimeSalaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
