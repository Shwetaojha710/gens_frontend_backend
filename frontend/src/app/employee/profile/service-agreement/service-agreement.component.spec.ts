import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceAgreementComponent } from './service-agreement.component';

describe('ServiceAgreementComponent', () => {
  let component: ServiceAgreementComponent;
  let fixture: ComponentFixture<ServiceAgreementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceAgreementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceAgreementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
