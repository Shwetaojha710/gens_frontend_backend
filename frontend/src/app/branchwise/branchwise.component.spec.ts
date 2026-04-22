import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BranchwiseComponent } from './branchwise.component';

describe('BranchwiseComponent', () => {
  let component: BranchwiseComponent;
  let fixture: ComponentFixture<BranchwiseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchwiseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BranchwiseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
