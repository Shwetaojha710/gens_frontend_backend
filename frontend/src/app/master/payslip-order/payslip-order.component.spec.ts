import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayslipOrderComponent } from './payslip-order.component';

describe('PayslipOrderComponent', () => {
  let component: PayslipOrderComponent;
  let fixture: ComponentFixture<PayslipOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayslipOrderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PayslipOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
