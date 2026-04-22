import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddComoffComponent } from './add-comoff.component';

describe('AddComoffComponent', () => {
  let component: AddComoffComponent;
  let fixture: ComponentFixture<AddComoffComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddComoffComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddComoffComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
