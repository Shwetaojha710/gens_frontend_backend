import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Testimonial } from '../../../data/site.models';

@Component({
  selector: 'app-testimonial-card',
  imports: [CommonModule],
  templateUrl: './testimonial-card.component.html',
  styleUrl: './testimonial-card.component.css'
})
export class TestimonialCardComponent {
  @Input({ required: true }) testimonial!: Testimonial;
  readonly stars = [1, 2, 3, 4, 5];
}
