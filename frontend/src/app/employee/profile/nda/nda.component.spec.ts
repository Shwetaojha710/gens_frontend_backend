import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NdaComponent } from './nda.component';

describe('NdaComponent', () => {
  let component: NdaComponent;
  let fixture: ComponentFixture<NdaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NdaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NdaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
