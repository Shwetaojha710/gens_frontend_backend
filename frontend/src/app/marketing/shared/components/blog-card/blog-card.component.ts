import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BlogPost } from '../../../data/site.models';

@Component({
  selector: 'app-blog-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './blog-card.component.html',
  styleUrl: './blog-card.component.css'
})
export class BlogCardComponent {
  @Input({ required: true }) post!: BlogPost;
}
