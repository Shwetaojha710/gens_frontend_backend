import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingEmpListComponent } from './pending-emp-list.component';

describe('PendingEmpListComponent', () => {
  let component: PendingEmpListComponent;
  let fixture: ComponentFixture<PendingEmpListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingEmpListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PendingEmpListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
