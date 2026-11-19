import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import { AiAgentService } from '../../services/ai-agent.service';

@Component({
  selector: 'app-aa-knowledge',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aa-knowledge.component.html',
})
export class AaKnowledgeComponent implements OnInit {
  private notyf = new Notyf();
  rows: any[] = [];
  form: any = null;
  file: File | null = null;
  saving = false;
  q = '';
  categories = ['company', 'product', 'feature', 'pricing', 'faq', 'service', 'document', 'brochure', 'case_study', 'other'];

  constructor(private api: AiAgentService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.listKnowledge({ q: this.q || undefined }).subscribe((res: any) => {
      this.rows = res?.data || [];
    });
  }

  open(row?: any): void {
    this.file = null;
    this.form = row
      ? { ...row, tags: Array.isArray(row.tags) ? row.tags.join(', ') : '' }
      : { title: '', category: 'faq', content: '', tags: '', isActive: true, isApproved: true };
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.file = input.files?.[0] || null;
  }

  save(): void {
    if (!this.form?.title) return;
    this.saving = true;
    const payload = {
      id: this.form.id,
      title: this.form.title,
      category: this.form.category,
      content: this.form.content || '',
      tags: this.form.tags,
      isActive: !!this.form.isActive,
      isApproved: !!this.form.isApproved,
    };
    this.api.saveKnowledge(payload, this.file || undefined).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          this.form = null;
          this.file = null;
          this.load();
        } else this.notyf.error(res?.message || 'Save failed');
      },
      error: () => (this.saving = false),
    });
  }

  toggle(row: any, field: 'isActive' | 'isApproved'): void {
    this.api.toggleKnowledge(row.id, { [field]: !row[field] }).subscribe((res: any) => {
      if (res?.status === true) this.load();
      else this.notyf.error(res?.message || 'Update failed');
    });
  }

  remove(row: any): void {
    if (!confirm('Delete this knowledge entry?')) return;
    this.api.deleteKnowledge(row.id).subscribe((res: any) => {
      if (res?.status === true) {
        this.notyf.success('Deleted');
        this.load();
      } else this.notyf.error(res?.message || 'Delete failed');
    });
  }
}
