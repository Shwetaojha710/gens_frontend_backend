import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaqItem } from '../../../data/site.models';

@Component({
  selector: 'app-faq-accordion',
  imports: [CommonModule],
  templateUrl: './faq-accordion.component.html',
  styleUrl: './faq-accordion.component.css'
})
export class FaqAccordionComponent {
  @Input({ required: true }) items!: FaqItem[];

  readonly openIndex = signal<number | null>(null);

  toggle(index: number): void {
    this.openIndex.set(this.openIndex() === index ? null : index);
  }
}
