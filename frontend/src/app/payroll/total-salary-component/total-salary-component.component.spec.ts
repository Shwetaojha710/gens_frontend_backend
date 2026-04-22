import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TotalSalaryComponentComponent } from './total-salary-component.component';

describe('TotalSalaryComponentComponent', () => {
  let component: TotalSalaryComponentComponent;
  let fixture: ComponentFixture<TotalSalaryComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TotalSalaryComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TotalSalaryComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
