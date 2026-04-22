import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostingSourcingComponent } from './posting-sourcing.component';

describe('PostingSourcingComponent', () => {
  let component: PostingSourcingComponent;
  let fixture: ComponentFixture<PostingSourcingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostingSourcingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PostingSourcingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
