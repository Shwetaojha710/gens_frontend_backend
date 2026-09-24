import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Notyf } from 'notyf';
import Quill from 'quill';
import Swal from 'sweetalert2';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';

@Component({
  selector: 'app-document-template',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './document-template.component.html',
  styleUrl: './document-template.component.css',
})
export class DocumentTemplateComponent implements OnInit, OnDestroy {
  @ViewChild('editorHost') editorHost?: ElementRef<HTMLDivElement>;

  notyf = new Notyf();
  list: any[] = [];
  createFlag = false;
  updateFlag = false;
  catalog: any = { employee: [], salary: [], company: [] };
  letterheadUrl: string | null = null;
  letterheadBase64: string | null = null;
  uploadingLetterhead = false;
  private quill: Quill | null = null;

  form: any = {
    id: null,
    name: '',
    category: 'custom',
    bodyHtml: '',
    letterheadBlank: false,
    includeSalaryAnnexure: false,
    status: 'active',
  };

  letterheadMode: 'image' | 'blank' = 'image';

  categories = [
    { value: 'offer', label: 'Offer' },
    { value: 'appointment', label: 'Appointment' },
    { value: 'nda', label: 'NDA' },
    { value: 'relieving', label: 'Relieving' },
    { value: 'service', label: 'Service Agreement' },
    { value: 'experience', label: 'Experience' },
    { value: 'custom', label: 'Custom' },
  ];

  sampleBody = `<p style="text-align:center"><strong><u>{{company_name}}</u></strong></p>
<p style="text-align:center">{{company_address}}</p>
<p>Date: {{issue_date}}</p>
<p>Dear {{gender_title}} {{employee_name}},</p>
<p>Emp Code: {{employee_id}}</p>
<p>Designation: {{designation}}</p>
<p>Department: {{department}}</p>
<p>Joining Date: {{joining_date}}</p>
<p>This is a sample HR document. Replace this text with your formal letter content and insert variables from the chips below.</p>
<p>Regards,<br/>{{hr_name}}<br/>{{company_name}}</p>`;

  constructor(
    private master: MasterService,
    public statusService: StatusService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadCatalog();
    this.loadList();
    this.loadLetterhead();
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }

  get pageBackground(): string | null {
    if (this.letterheadMode === 'blank' || this.form.letterheadBlank) return null;
    return this.letterheadBase64 || this.letterheadUrl;
  }

  syncLetterheadMode(): void {
    this.form.letterheadBlank = this.letterheadMode === 'blank';
  }

  loadCatalog(): void {
    this.master.getHrTemplateVariables().subscribe({
      next: (res: any) => {
        if (res?.status && res.data) this.catalog = res.data;
      },
      error: () => {},
    });
  }

  loadLetterhead(): void {
    this.master.getLetterhead().subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.letterheadUrl = res.data?.url || null;
          this.letterheadBase64 = res.data?.base64 || null;
        }
      },
      error: () => {},
    });
  }

  loadList(): void {
    this.master.listHrTemplates({}).subscribe({
      next: (res: any) => {
        const message = res.message || 'Loaded';
        const status = this.statusService.handleResponseStatus(res.status, message);
        if (status === true) this.list = res.data || [];
        else if (status === 'expired') this.router.navigate(['login']);
      },
      error: (err) => this.notyf.error(err?.error?.message || 'Failed to load templates'),
    });
  }

  openCreate(): void {
    this.createFlag = true;
    this.updateFlag = false;
    this.form = {
      id: null,
      name: '',
      category: 'custom',
      bodyHtml: this.sampleBody,
      letterheadBlank: !this.letterheadUrl && !this.letterheadBase64,
      includeSalaryAnnexure: false,
      status: 'active',
    };
    this.letterheadMode = this.form.letterheadBlank ? 'blank' : 'image';
    setTimeout(() => this.initEditor(this.sampleBody), 0);
  }

  openEdit(row: any): void {
    this.createFlag = true;
    this.updateFlag = true;
    this.form = {
      id: row.id,
      name: row.name,
      category: row.category || 'custom',
      bodyHtml: row.bodyHtml || '',
      letterheadBlank: row.letterheadBlank === true,
      includeSalaryAnnexure: !!row.includeSalaryAnnexure,
      status: row.status || 'active',
    };
    this.letterheadMode = this.form.letterheadBlank ? 'blank' : 'image';
    setTimeout(() => this.initEditor(row.bodyHtml || ''), 0);
  }

  back(): void {
    this.destroyEditor();
    this.createFlag = false;
    this.updateFlag = false;
  }

  private initEditor(html: string): void {
    this.destroyEditor();
    const host = this.editorHost?.nativeElement;
    if (!host) {
      setTimeout(() => this.initEditor(html), 50);
      return;
    }
    host.innerHTML = '';
    this.quill = new Quill(host, {
      theme: 'snow',
      placeholder: 'Type your letter like in Word… Insert variables from the chips.',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          [{ font: [] }],
          [{ size: ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          ['blockquote', 'link'],
          ['clean'],
        ],
      },
    });
    const delta = this.quill.clipboard.convert({ html: html || '<p><br></p>' });
    this.quill.setContents(delta, 'silent');
    this.quill.on('text-change', () => {
      this.form.bodyHtml = this.quill?.root.innerHTML || '';
    });
    this.form.bodyHtml = this.quill.root.innerHTML;
  }

  private destroyEditor(): void {
    if (this.quill) {
      this.form.bodyHtml = this.quill.root.innerHTML;
      this.quill = null;
    }
    if (this.editorHost?.nativeElement) {
      this.editorHost.nativeElement.innerHTML = '';
    }
  }

  insertVariable(key: string): void {
    const token = `{{${key}}}`;
    if (!this.quill) {
      this.form.bodyHtml = (this.form.bodyHtml || '') + token;
      return;
    }
    const range = this.quill.getSelection(true);
    const index = range ? range.index : this.quill.getLength();
    this.quill.insertText(index, token, 'user');
    this.quill.setSelection(index + token.length, 0, 'user');
    this.form.bodyHtml = this.quill.root.innerHTML;
  }

  onLetterheadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.notyf.error('Only image files are allowed (PNG, JPG)');
      input.value = '';
      return;
    }
    this.uploadingLetterhead = true;
    this.master.uploadLetterhead(file).subscribe({
      next: (res: any) => {
        this.uploadingLetterhead = false;
        input.value = '';
        if (res?.status) {
          this.notyf.success('Letterhead uploaded');
          this.letterheadMode = 'image';
          this.form.letterheadBlank = false;
          this.loadLetterhead();
        } else {
          this.notyf.error(res?.message || 'Upload failed');
        }
      },
      error: (err) => {
        this.uploadingLetterhead = false;
        input.value = '';
        this.notyf.error(err?.error?.message || 'Upload failed');
      },
    });
  }

  importDocumentFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.html') && !name.endsWith('.htm') && !name.endsWith('.txt')) {
      this.notyf.error('Import HTML or TXT for now (Word .docx later)');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      let html = String(reader.result || '');
      if (name.endsWith('.txt')) {
        html = `<p>${html
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '</p><p>')}</p>`;
      } else {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) html = bodyMatch[1];
      }
      if (this.quill) {
        const delta = this.quill.clipboard.convert({ html });
        this.quill.setContents(delta, 'user');
        this.form.bodyHtml = this.quill.root.innerHTML;
      } else {
        this.form.bodyHtml = html;
      }
      this.notyf.success('Document imported into editor');
      input.value = '';
    };
    reader.readAsText(file);
  }

  save(): void {
    this.syncLetterheadMode();
    if (this.quill) this.form.bodyHtml = this.quill.root.innerHTML;
    if (!String(this.form.name || '').trim()) {
      this.notyf.error('Template name is required');
      return;
    }
    const plain = String(this.form.bodyHtml || '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    if (!plain) {
      this.notyf.error('Template body is required');
      return;
    }

    const payload = { ...this.form };
    const req = this.updateFlag
      ? this.master.updateHrTemplate(payload)
      : this.master.createHrTemplate(payload);

    req.subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.notyf.success(res.message || 'Saved');
          this.back();
          this.loadList();
        } else {
          this.notyf.error(res?.message || 'Save failed');
        }
      },
      error: (err) => this.notyf.error(err?.error?.message || 'Save failed'),
    });
  }

  remove(row: any): void {
    Swal.fire({
      title: 'Delete template?',
      text: row.name,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.master.deleteHrTemplate(row.id).subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.notyf.success('Deleted');
            this.loadList();
          } else this.notyf.error(res?.message || 'Delete failed');
        },
        error: (err) => this.notyf.error(err?.error?.message || 'Delete failed'),
      });
    });
  }

  letterheadLabel(row: any): string {
    return row.letterheadBlank ? 'Blank top' : 'Company image';
  }
}
