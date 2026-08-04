import { Component, Input } from '@angular/core';
import { Feature } from '../../../data/site.models';

@Component({
  selector: 'app-feature-card',
  imports: [],
  templateUrl: './feature-card.component.html',
  styleUrl: './feature-card.component.css'
})
export class FeatureCardComponent {
  @Input() feature!: Feature;
}
