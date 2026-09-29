import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
  /** Contenteditable host used for Word imports (Quill cannot keep full DOCX HTML). */
  @ViewChild('richHost') richHost?: ElementRef<HTMLDivElement>;
  previewOpen = false;
  previewUrl: SafeResourceUrl | null = null;
  private previewObjectUrl: string | null = null;
  private lastPrintHtml = '';
  notyf = new Notyf();
  list: any[] = [];
  createFlag = false;
  updateFlag = false;
  catalog: any = {
    employee: [
      { key: 'employee_name', label: 'Employee Name' },
      { key: 'employee_id', label: 'Employee ID / Code' },
      { key: 'designation', label: 'Designation' },
      { key: 'department', label: 'Department' },
      { key: 'joining_date', label: 'Joining Date' },
      { key: 'employment_type', label: 'Employment Type' },
      { key: 'work_location', label: 'Work Location' },
      { key: 'reporting_manager', label: 'Reporting Manager' },
      { key: 'father_name', label: 'Father Name' },
      { key: 'permanent_address', label: 'Permanent Address' },
      { key: 'gender_title', label: 'Mr. / Ms.' },
      { key: 'relation', label: 'S/O or D/O' },
    ],
    salary: [],
    company: [],
  };
  letterheadUrl: string | null = null;
  letterheadBase64: string | null = null;
  uploadingLetterhead = false;
  importingDoc = false;
  private quill: Quill | null = null;
  /** When true, editor uses layout-preserving padding (imported Word body already has letterhead). */
  importedLayout = false;
  /** Use contenteditable instead of Quill so DOCX HTML actually remains visible. */
  useRichEditor = false;

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
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadCatalog();
    this.loadList();
    this.loadLetterhead();
  }

  ngOnDestroy(): void {
    this.destroyEditor();
    this.revokePreviewUrl();
  }

  private revokePreviewUrl(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.previewUrl = null;
  }

  get pageBackground(): string | null {
    if (this.letterheadMode === 'blank' || this.form.letterheadBlank) return null;
    return this.letterheadBase64 || this.letterheadUrl;
  }

  syncLetterheadMode(): void {
    this.form.letterheadBlank = this.letterheadMode === 'blank';
  }

  private applyRichTextStyle(property: string, value: string): void {
    if (!value) return;

    const el = this.getRichEl();
    if (!el) return;

    if (!this.restoreRichSelection()) {
      this.notyf.error('Pehle text select karo');
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const range = selection.getRangeAt(0);

    try {
      const span = document.createElement('span');

      span.style.setProperty(property, value);

      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.selectNodeContents(span);

      selection.removeAllRanges();
      selection.addRange(newRange);

      this.richSavedRange = newRange.cloneRange();

      this.onRichInput();
    } catch (error) {
      console.error('applyRichTextStyle failed:', error);
    }
  }

  private applyParagraphSpacing(value: string): void {
    if (!value) return;

    const el = this.getRichEl();
    if (!el) return;

    if (!this.restoreRichSelection()) {
      this.notyf.error('Pehle paragraph select/click karo');
      return;
    }

    const block = this.getSelectionBlock();

    if (!block) {
      this.notyf.error('Paragraph select nahi hua');
      return;
    }

    block.style.marginBottom = value;

    this.form.bodyHtml = el.innerHTML;
    this.saveRichSelection();
  }


  private applyParagraphStyle(property: string, value: string): void {
    if (!value) return;

    const el = this.getRichEl();
    if (!el) return;

    const block = this.getSelectionBlock();

    if (!block) {
      this.notyf.error('Paragraph select/click karo');
      return;
    }

    block.style.setProperty(property, value);

    this.form.bodyHtml = el.innerHTML;
    this.saveRichSelection();
  }


  openPrintPreview(): void {
    if (this.useRichEditor) {
      const el = this.getRichEl();
      if (el) this.form.bodyHtml = el.innerHTML;
    } else if (this.quill) {
      this.form.bodyHtml = this.quill.root.innerHTML;
    }

    const html = this.buildPrintHtml(this.form.bodyHtml || '');
    this.lastPrintHtml = html;
    this.revokePreviewUrl();
    const blob = new Blob([html], { type: 'text/html' });
    this.previewObjectUrl = URL.createObjectURL(blob);
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl);
    this.previewOpen = true;
  }

  closePrintPreview(): void {
    this.previewOpen = false;
    this.revokePreviewUrl();
    this.lastPrintHtml = '';
  }

  printDocument(): void {
    const html = this.lastPrintHtml || this.buildPrintHtml(this.form.bodyHtml || '');
    if (!html.replace(/<[^>]+>/g, '').trim()) {
      this.notyf.error('Document body is empty');
      return;
    }
    const w = window.open('', '_blank');
    if (!w) {
      this.notyf.error('Popup blocked â€” allow popups to print');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch (_) {}
    }, 350);
  }

  /**
   * Full printable HTML â€” same look as browser Print dialog / Generate Letter.
   */
  private buildPrintHtml(bodyHtml: string): string {
    let filled = this.normalizeHtmlForPrint(String(bodyHtml || ''));
    filled = this.wrapTrailingFooterForPrint(filled);

    const useImage = this.letterheadMode === 'image' && !!this.pageBackground;
    const letterheadBlank = this.letterheadMode === 'blank' || !!this.form.letterheadBlank;
    const hasImportedLayout =
      this.importedLayout ||
      this.useRichEditor ||
      /hr-imported-doc|data-preserve-layout|hr-align-|text-align\s*:|hr-numbered|hr-doc-table/i.test(filled);

    const spacer =
      letterheadBlank && !hasImportedLayout
        ? `<div style="height:120mm;min-height:120mm">&nbsp;</div>`
        : '';
    const bodyPadTop = hasImportedLayout ? '14mm' : useImage ? '36mm' : letterheadBlank ? '0' : '18mm';
    const bodyPadX = '16mm';
    const bodyPadBottom = hasImportedLayout ? '10mm' : '18mm';
    const bgUrl = useImage ? String(this.pageBackground).replace(/'/g, '%27') : '';
    const bgCss = bgUrl
      ? `background-image:url('${bgUrl}');background-repeat:no-repeat;background-position:top center;background-size:100% auto;`
      : '';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Print Preview</title>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #d1d5db; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11.5pt;
    line-height: 1.4;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet-wrap { padding: 20px 12px 40px; display: flex; justify-content: center; }
  .page {
    width: 210mm; min-height: 297mm; box-sizing: border-box;
    padding: ${bodyPadTop} ${bodyPadX} ${bodyPadBottom};
    margin: 0 auto; background: #fff; ${bgCss}
    box-shadow: 0 4px 24px rgba(0,0,0,0.22); position: relative;
  }
  /* Force normal flow — Word absolute/float causes overlap on print */
  .page * { position: static !important; float: none !important; transform: none !important; z-index: auto !important; }
  .page-body { display: block; }
  p, h1, h2, h3, h4, h5, h6, li, td, th {
    margin-top: 0.25em !important; margin-bottom: 0.35em !important;
    line-height: 1.4 !important; height: auto !important; max-height: none !important;
    min-height: 0 !important; overflow: visible !important; max-width: 100%;
  }
  p:empty { display: none !important; }
  h1, h2, h3 { font-weight: bold; margin-bottom: 0.5em !important; }
  img {
    max-width: 100% !important; height: auto !important; display: block !important;
    margin: 4px auto !important; page-break-inside: avoid !important; break-inside: avoid !important;
  }
  table, .hr-doc-table { width: 100%; border-collapse: collapse; margin: 0.4em 0 !important; border: none; page-break-inside: avoid; }
  td, th { border: none; padding: 2px 4px; vertical-align: top; }
  table.hr-doc-table-bordered td, table.hr-doc-table-bordered th,
  table[border]:not([border="0"]) td, table[border]:not([border="0"]) th { border: 1px solid #000; padding: 4px 6px; }
  ul, ol, .hr-doc-ul, .hr-doc-ol {
    display: block !important; padding-left: 1.6em !important; margin: 0.45em 0 !important;
    list-style-position: outside !important;
  }
  ol, .hr-doc-ol { list-style-type: decimal !important; }
  ul, .hr-doc-ul { list-style-type: disc !important; }
  li { display: list-item !important; margin: 0.25em 0 !important; line-height: 1.4 !important; page-break-inside: avoid; }
  .hr-numbered { margin: 0.3em 0 !important; display: block !important; }
  .hr-clearfix { display: none !important; height: 0 !important; margin: 0 !important; }
  .page-break {
    display: block; page-break-before: always; break-before: page;
    height: 0 !important; margin: 0 !important; padding: 0 !important; border: 0 !important;
  }
  /* Footer letterhead — keep whole band on one page */
  .hr-print-footer {
    display: block !important; margin-top: 14pt !important;
    page-break-inside: avoid !important; break-inside: avoid !important;
  }
  .hr-print-footer img { page-break-inside: avoid !important; break-inside: avoid !important; margin: 2px auto !important; }
  .hr-imported-doc { font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.4 !important; color: #000; }
  .hr-align-left, .ql-align-left { text-align: left !important; }
  .hr-align-center, .ql-align-center { text-align: center !important; }
  .hr-align-right, .ql-align-right { text-align: right !important; }
  .hr-align-justify, .ql-align-justify { text-align: justify !important; }
  u, span[style*="underline"] { text-decoration: underline !important; }
  [style*="text-align: right"], [style*="text-align:right"] { text-align: right !important; }
  [style*="text-align: left"], [style*="text-align:left"] { text-align: left !important; }
  [style*="text-align: center"], [style*="text-align:center"] { text-align: center !important; }
  [style*="text-align: justify"], [style*="text-align:justify"] { text-align: justify !important; }
  @media print {
    html, body { background: #fff !important; }
    .sheet-wrap { padding: 0 !important; }
    .page { box-shadow: none !important; width: 210mm !important; min-height: 297mm !important; margin: 0 !important; }
    .page-break { border: 0 !important; margin: 0 !important; page-break-before: always; break-before: page; }
    .hr-print-footer { page-break-inside: avoid !important; break-inside: avoid !important; }
  }
</style></head><body spellcheck="false">
<div class="sheet-wrap"><div class="page"><div class="page-body">${spacer}${filled}</div></div></div>
</body></html>`;
  }

  private normalizeHtmlForPrint(html: string): string {
    let out = this.sanitizeOverlappingLayoutHtml(String(html || ''));

    out = out.replace(
      /<(p|div|h[1-6])\b[^>]*>\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*<\/\1>/gi,
      '',
    );

    out = out.replace(
      /<div\b([^>]*class=["'][^"']*page-break[^"']*["'][^>]*)>/gi,
      '<div$1 style="height:0;margin:0;border:0;page-break-before:always;">',
    );

    out = out.replace(/style\s*=\s*(["'])(.*?)\1/gi, (_m, q: string, style: string) => {
      let s = String(style);

      const clampLen = (prop: string, maxPt: number) => {
        s = s.replace(
          new RegExp(`(${prop})\\s*:\\s*(-?[\\d.]+)(pt|px|mm|cm|em|rem)`, 'gi'),
          (_mm, p: string, num: string, unit: string) => {
            let pt = parseFloat(num) || 0;
            const u = unit.toLowerCase();
            if (u === 'px') pt = pt * 0.75;
            else if (u === 'mm') pt = pt * 2.83465;
            else if (u === 'cm') pt = pt * 28.3465;
            else if (u === 'em' || u === 'rem') pt = pt * 12;
            if (pt < 0) pt = 0;
            else pt = Math.min(pt, maxPt);
            return `${p}:${pt.toFixed(1)}pt`;
          },
        );
      };

      clampLen('margin-top', 12);
      clampLen('margin-bottom', 12);
      clampLen('margin-left', 72);
      clampLen('margin-right', 48);
      clampLen('padding-top', 10);
      clampLen('padding-bottom', 10);
      clampLen('padding-left', 48);
      clampLen('padding-right', 48);

      s = s.replace(/margin\s*:\s*([^;]+)/gi, (_mm, val: string) => {
        const parts = String(val).trim().split(/\s+/);
        const mapped = parts.map((part) => {
          const m = part.match(/^(-?[\d.]+)(pt|px|mm)$/i);
          if (!m) return part;
          let pt = parseFloat(m[1]);
          const u = m[2].toLowerCase();
          if (u === 'px') pt *= 0.75;
          if (u === 'mm') pt *= 2.83465;
          return `${Math.min(Math.max(pt, 0), 12).toFixed(1)}pt`;
        });
        return `margin:${mapped.join(' ')}`;
      });

      s = s.replace(/line-height\s*:\s*([\d.]+)(pt|px)?/gi, (_mm, num: string, unit?: string) => {
        const n = parseFloat(num);
        if (!unit) return `line-height:${Math.min(Math.max(n || 1.4, 1.2), 1.8).toFixed(2)}`;
        let pt = n;
        if (unit.toLowerCase() === 'px') pt = n * 0.75;
        return `line-height:${Math.min(Math.max(pt, 14), 22).toFixed(1)}pt`;
      });

      s = s.replace(/line-height\s*:\s*0\s*;?/gi, 'line-height:1.4;');
      s = s.replace(/height\s*:\s*0(?:px|pt)?\s*;?/gi, '');

      return `style=${q}${s}${q}`;
    });

    return out;
  }

  /** Keep trailing letterhead footer images together (never split across pages). */
  private wrapTrailingFooterForPrint(html: string): string {
    let out = String(html || '');
    if (/hr-print-footer/i.test(out)) return out;

    const re =
      /((?:(?:<div\b[^>]*hr-clearfix[^>]*>\s*<\/div>\s*)|(?:<p\b[^>]*>\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*<\/p>\s*))*<img\b[^>]*>\s*(?:<div\b[^>]*hr-clearfix[^>]*>\s*<\/div>\s*)*){1,}\s*$/i;
    const m = out.match(re);
    if (!m || m.index == null) return out;

    const footer = m[0];
    if (!(footer.match(/<img\b/gi) || []).length) return out;
    return `${out.slice(0, m.index)}<div class="hr-print-footer">${footer}</div>`;
  }
  loadCatalog(): void {
    this.master.getHrTemplateVariables().subscribe({
      next: (res: any) => {
        if (res?.status && res.data) {
          const emp = Array.isArray(res.data.employee) ? res.data.employee : [];
          // Ensure department + designation always present in employee chips
          const keys = new Set(emp.map((v: any) => v.key));
          if (!keys.has('designation')) emp.unshift({ key: 'designation', label: 'Designation' });
          if (!keys.has('department')) emp.unshift({ key: 'department', label: 'Department' });
          this.catalog = {
            employee: emp,
            salary: res.data.salary || [],
            company: res.data.company || [],
          };
        }
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
          // If letterhead exists and user hasn't forced blank, show it
          if ((this.letterheadBase64 || this.letterheadUrl) && this.letterheadMode === 'image') {
            this.form.letterheadBlank = false;
          }
          this.cdr.detectChanges();
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
    this.importedLayout = false;
    this.useRichEditor = false;
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
    const html = row.bodyHtml || '';
    this.importedLayout = /hr-imported-doc|page-break|data:image\/|text-align:|margin-top:|<table\b/i.test(html);
    this.useRichEditor = this.importedLayout;
    this.form = {
      id: row.id,
      name: row.name,
      category: row.category || 'custom',
      bodyHtml: html,
      letterheadBlank: row.letterheadBlank === true,
      includeSalaryAnnexure: !!row.includeSalaryAnnexure,
      status: row.status || 'active',
    };
    this.letterheadMode = this.form.letterheadBlank ? 'blank' : 'image';
    setTimeout(() => {
      if (this.useRichEditor) this.renderRichHtml(html);
      else this.initEditor(html);
    }, 0);
  }

  back(): void {
    this.destroyEditor();
    this.createFlag = false;
    this.updateFlag = false;
    this.importedLayout = false;
    this.useRichEditor = false;
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
      placeholder: 'Type your letter like in Wordâ€¦ Insert variables from the chips.',
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
          ['blockquote', 'link', 'image'],
          ['clean'],
        ],
        clipboard: {
          matchVisual: false,
        },
      },
    });

    this.registerClipboardMatchers();
    this.setEditorHtml(html || '<p><br></p>');

    this.quill.on('text-change', () => {
      // Keep raw HTML so imported tables/images/styles survive edits as much as possible
      this.form.bodyHtml = this.quill?.root.innerHTML || '';
    });
  }

  /**
   * Soften Quill's default paste stripping. Prefer setEditorHtml() for full Word imports.
   */
  private registerClipboardMatchers(): void {
    if (!this.quill) return;
    // no-op soft matcher â€” keeps default paste behavior intact
  }

  /**
   * Load HTML into Quill. Never assign quill.root.innerHTML directly â€”
   * that desyncs Quill's Delta and the toolbar/caret stop working.
   */
  private setEditorHtml(html: string, _preserveLayout = false): void {
    const safe = html && html.trim() ? html : '<p><br></p>';
    this.form.bodyHtml = safe;
    if (!this.quill) return;

    try {
      this.quill.setText('', 'silent');
      this.quill.clipboard.dangerouslyPasteHTML(0, safe, 'silent');
      this.quill.root.classList.remove('ql-blank');
      this.form.bodyHtml = this.quill.root.innerHTML || safe;
    } catch (e) {
      console.warn('dangerouslyPasteHTML failed', e);
      // Last resort â€” but prefer switching to rich editor for complex HTML
      this.useRichEditor = true;
      this.importedLayout = true;
      this.destroyEditor();
      this.cdr.detectChanges();
      setTimeout(() => this.renderRichHtml(safe), 0);
    }
  }

  private destroyEditor(): void {
    if (this.quill) {
      if (!this.form.bodyHtml) {
        this.form.bodyHtml = this.quill.root.innerHTML;
      }
      try {
        // Detach Quill listeners if possible
        (this.quill as any).off?.('text-change');
      } catch (_) {}
      this.quill = null;
    }
    if (this.editorHost?.nativeElement) {
      this.editorHost.nativeElement.innerHTML = '';
    }
    // Quill snow theme inserts .ql-toolbar as a SIBLING of the host â€” remove orphans
    // so Word-import mode doesn't show a dead Quill toolbar.
    try {
      document
        .querySelectorAll('app-document-template .editor-frame > .ql-toolbar, app-document-template .editor-frame > .ql-container')
        .forEach((n) => n.remove());
      document
        .querySelectorAll('app-document-template .dt-quill-wrap .ql-toolbar')
        .forEach((n) => {
          // leave inside wrap; wrap *ngIf handles cleanup
        });
    } catch (_) {}
  }

  /** Make Word HTML editable (Word often marks nodes as non-editable). */
  private makeHtmlEditable(html: string): string {
    return String(html || '')
      .replace(/\scontenteditable\s*=\s*(["'])false\1/gi, ' contenteditable="true"')
      .replace(/\sunselectable\s*=\s*(["'])[^"']*\1/gi, '')
      .replace(/pointer-events\s*:\s*none\s*;?/gi, '')
      .replace(/user-select\s*:\s*none\s*;?/gi, '')
      .replace(/-webkit-user-modify\s*:\s*read-only\s*;?/gi, '');
  }

  /** Render imported Word HTML into contenteditable (visible + editable). */
  private renderRichHtml(html: string, attempt = 0): void {
    const safe = this.makeHtmlEditable(html && html.trim() ? html : '<p><br></p>');
    this.form.bodyHtml = safe;
    this.destroyEditor();
    this.cdr.detectChanges();
    let el = this.richHost?.nativeElement;
    if (!el) {
      el = document.querySelector('app-document-template .dt-rich-host') as HTMLDivElement | null;
    }
    if (!el) {
      if (attempt < 20) {
        setTimeout(() => this.renderRichHtml(safe, attempt + 1), 50);
      }
      return;
    }
    el.setAttribute('contenteditable', 'true');
    el.innerHTML = safe;
    // Force nested Word nodes to stay editable
    el.querySelectorAll('[contenteditable="false"]').forEach((n) => {
      n.setAttribute('contenteditable', 'true');
    });
    el.focus();
    try {
      // Place caret at start so typing works immediately
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
      el.scrollTop = 0;
    } catch (_) {}
  }

  /** Saved selection so toolbar clicks don't lose highlight. */
  private richSavedRange: Range | null = null;

  onRichInput(): void {
    const el = this.getRichEl();
    if (el) this.form.bodyHtml = el.innerHTML;
  }

  onRichKeydown(ev: KeyboardEvent): void {
    // Tab / Shift+Tab = indent / outdent (Word-like)
    if (ev.key === 'Tab') {
      ev.preventDefault();
      this.richCmd(ev.shiftKey ? 'outdent' : 'indent');
      return;
    }
    if (ev.ctrlKey || ev.metaKey) {
      const k = ev.key.toLowerCase();
      if (k === 'b') {
        ev.preventDefault();
        this.richCmd('bold');
      } else if (k === 'i') {
        ev.preventDefault();
        this.richCmd('italic');
      } else if (k === 'u') {
        ev.preventDefault();
        this.richCmd('underline');
      }
    }
  }

  private getRichEl(): HTMLDivElement | null {
    return (
      this.richHost?.nativeElement ||
      (document.querySelector('app-document-template .dt-rich-host') as HTMLDivElement | null)
    );
  }

  saveRichSelection(): void {
    const el = this.getRichEl();
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    this.richSavedRange = range.cloneRange();
  }

  private restoreRichSelection(): boolean {
    const el = this.getRichEl();
    if (!el) return false;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return false;
    if (this.richSavedRange) {
      try {
        sel.removeAllRanges();
        sel.addRange(this.richSavedRange);
        return !sel.isCollapsed;
      } catch (_) {
        return false;
      }
    }
    return !!(sel.rangeCount && !sel.isCollapsed && el.contains(sel.getRangeAt(0).commonAncestorContainer));
  }

  /** Fallback when execCommand fails on complex Word HTML. */
  private wrapSelection(tag: string, style?: string): boolean {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
    try {
      const range = sel.getRangeAt(0);
      const wrapper = document.createElement(tag);
      if (style) wrapper.setAttribute('style', style);
      const contents = range.extractContents();
      wrapper.appendChild(contents);
      range.insertNode(wrapper);
      const next = document.createRange();
      next.selectNodeContents(wrapper);
      sel.removeAllRanges();
      sel.addRange(next);
      this.richSavedRange = next.cloneRange();
      return true;
    } catch (e) {
      console.warn('wrapSelection failed', e);
      return false;
    }
  }


  insertPageBreak(): void {
    const el = this.getRichEl();
    if (!el) return;

    this.restoreRichSelection();
    el.focus();

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    const pageBreak = document.createElement('div');
    pageBreak.className = 'page-break';
    pageBreak.innerHTML = '<br>';

    range.deleteContents();
    range.insertNode(pageBreak);

    // Cursor page break ke baad
    const newRange = document.createRange();
    newRange.setStartAfter(pageBreak);
    newRange.collapse(true);

    selection.removeAllRanges();
    selection.addRange(newRange);

    this.richSavedRange = newRange.cloneRange();

    this.form.bodyHtml = el.innerHTML;
  }

  richCmd(command: string, value?: string): void {
    const el = this.getRichEl();
    if (!el) return;

    const hadSelection = this.restoreRichSelection();
    // For indent/align, caret is enough â€” no need for a text selection
    if (!hadSelection && this.richSavedRange) {
      try {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(this.richSavedRange);
      } catch (_) {}
    }
    el.focus();

    if (!hadSelection && ['bold', 'italic', 'underline'].includes(command)) {
      this.notyf.error('Pehle text select karo, phir Bold / Italic / Underline dabao');
      return;
    }

    let applied = false;
    try {
      document.execCommand('styleWithCSS', false, 'true');
      applied = document.execCommand(command, false, value);
    } catch (e) {
      console.warn('richCmd execCommand failed', command, e);
    }

    // Word HTML often ignores formatting â€” wrap selected text manually
    if (hadSelection && ['bold', 'italic', 'underline'].includes(command)) {
      const alreadyOn = document.queryCommandState(command);
      if (!alreadyOn) {
        if (command === 'underline') {
          this.wrapSelection('u') || this.wrapSelection('span', 'text-decoration: underline');
        } else if (command === 'bold' && !applied) {
          this.wrapSelection('strong');
        } else if (command === 'italic' && !applied) {
          this.wrapSelection('em');
        }
      }
    }

    // Alignment fallback: set text-align on nearest block
    if (command.startsWith('justify')) {
      const alignMap: Record<string, string> = {
        justifyLeft: 'left',
        justifyCenter: 'center',
        justifyRight: 'right',
        justifyFull: 'justify',
      };
      const align = alignMap[command];
      if (align) this.applyBlockStyle({ textAlign: align });
    }

    // Indent / outdent fallback via margin-left on block
    if (command === 'indent' || command === 'outdent') {
      this.applyBlockIndent(command === 'indent' ? 36 : -36);
    }

    this.saveRichSelection();
    this.form.bodyHtml = el.innerHTML;
  }

  /** Apply CSS to the block containing the caret/selection. */
  private applyBlockStyle(styles: { textAlign?: string }): void {
    const block = this.getSelectionBlock();
    if (!block) return;
    if (styles.textAlign) {
      block.style.textAlign = styles.textAlign;
      block.classList.remove('hr-align-left', 'hr-align-center', 'hr-align-right', 'hr-align-justify');
      block.classList.add(`hr-align-${styles.textAlign === 'justify' ? 'justify' : styles.textAlign}`);
    }
  }

  private applyBlockIndent(deltaPx: number): void {
    const block = this.getSelectionBlock();
    if (!block) return;
    const cur = parseInt(block.style.marginLeft || '0', 10) || 0;
    const next = Math.max(0, cur + deltaPx);
    block.style.marginLeft = next ? `${next}px` : '';
  }

  private getSelectionBlock(): HTMLElement | null {
    const el = this.getRichEl();
    const sel = window.getSelection();
    if (!el || !sel || !sel.rangeCount) return null;
    let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    while (node && node !== el) {
      if (node instanceof HTMLElement) {
        const tag = node.tagName.toLowerCase();
        if (['p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'blockquote'].includes(tag)) {
          return node;
        }
      }
      node = node.parentNode;
    }
    return null;
  }

  insertVariable(key: string): void {
    const token = `{{${key}}}`;
    if (this.useRichEditor) {
      const el = this.getRichEl();
      if (!el) {
        this.form.bodyHtml = (this.form.bodyHtml || '') + token;
        return;
      }
      this.restoreRichSelection();
      el.focus();
      try {
        const ok = document.execCommand('insertText', false, token);
        if (!ok) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(token));
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          } else {
            el.innerHTML = (el.innerHTML || '') + token;
          }
        }
      } catch (_) {
        el.innerHTML = (el.innerHTML || '') + token;
      }
      this.saveRichSelection();
      this.form.bodyHtml = el.innerHTML;
      return;
    }
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
          this.notyf.success('Letterhead uploaded â€” now showing on template');
          this.letterheadMode = 'image';
          this.form.letterheadBlank = false;
          this.loadLetterhead();
          this.cdr.detectChanges();
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

  async importDocumentFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const isDocx = name.endsWith('.docx');
    const isLegacyDoc = name.endsWith('.doc') && !isDocx;
    const isHtml = name.endsWith('.html') || name.endsWith('.htm');
    const isTxt = name.endsWith('.txt');

    if (isLegacyDoc) {
      this.notyf.error('Old .doc format is not supported. Please Save As .docx in Word, then import.');
      input.value = '';
      return;
    }
    if (!isDocx && !isHtml && !isTxt) {
      this.notyf.error('Supported formats: .docx, .html, .htm, .txt');
      input.value = '';
      return;
    }

    this.importingDoc = true;
    try {
      let html = '';
      if (isDocx) {
        html = await this.convertDocxToHtml(file);
      } else {
        const rawText = await this.readTextFile(file);
        html = rawText;
        if (isTxt) {
          html = `<p>${html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '</p><p>')}</p>`;
        } else {
          const styleBlocks = [...rawText.matchAll(/<style[^>]*>[\s\S]*?<\/style>/gi)].map((m) => m[0]);
          const bodyMatch = rawText.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          html = bodyMatch ? bodyMatch[1] : rawText;
          if (styleBlocks.length) {
            html = styleBlocks.join('\n') + html;
          }
        }
      }

      html = this.normalizeImportedHtml(html, isDocx);
      html = this.sanitizeOverlappingLayoutHtml(html);

      // Mammoth ignores Word headers â€” pull header images ONLY if body has no top logo yet
      // (otherwise logo + Ref line stack/overlap like the Offer Letter glitch)
      if (isDocx) {
        const bodyAlreadyHasLogo = /<img\b/i.test(html.slice(0, 5000));
        if (!bodyAlreadyHasLogo) {
          const headerHtml = await this.extractDocxHeaderHtml(await file.arrayBuffer());
          if (headerHtml) {
            html = this.sanitizeOverlappingLayoutHtml(headerHtml + html);
          }
        }
      }

      const plainCheck = html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!plainCheck || plainCheck.length < 2) {
        this.notyf.error('No readable content found in this file. Re-save as .docx in Word and try again.');
        return;
      }

      this.importedLayout = true;
      this.useRichEditor = true;

      // Letterhead decision:
      // - Word body/header already has logo image â†’ blank (avoid double letterhead)
      // - Otherwise use company uploaded letterhead if available
      const hasEmbeddedLetterhead = /<img\b/i.test(html.slice(0, 4000));
      const hasCompanyLetterhead = !!(this.letterheadBase64 || this.letterheadUrl);
      if (hasEmbeddedLetterhead) {
        this.letterheadMode = 'blank';
        this.form.letterheadBlank = true;
      } else if (hasCompanyLetterhead) {
        this.letterheadMode = 'image';
        this.form.letterheadBlank = false;
      } else {
        this.letterheadMode = 'blank';
        this.form.letterheadBlank = true;
      }

      this.destroyEditor();
      this.form.bodyHtml = html;
      this.cdr.detectChanges();

      // Wait for *ngIf to create #richHost, then paint HTML (Quill cannot show full DOCX)
      setTimeout(() => {
        this.renderRichHtml(html);
        setTimeout(() => {
          const shown = (this.richHost?.nativeElement?.innerText || '').replace(/\s+/g, '').trim();
          if (!shown && !/<img\b/i.test(html)) {
            this.notyf.error('Import ran but content did not render. Try another .docx (Save As in Word).');
          } else {
            const lhNote = this.letterheadMode === 'image'
              ? ' â€” company letterhead applied'
              : hasEmbeddedLetterhead
                ? ' â€” Word letterhead kept in document'
                : ' â€” no letterhead (upload one & select â€œUse uploaded letterheadâ€)';
            this.notyf.success(
              isDocx
                ? `Word template imported${lhNote}`
                : 'Document imported into editor',
            );
          }
        }, 150);
      }, 0);
    } catch (err: any) {
      console.error('importDocumentFile', err);
      this.notyf.error(err?.message || 'Failed to import document');
    } finally {
      this.importingDoc = false;
      input.value = '';
    }
  }

  private readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Mammoth skips Word headers/footers. Extract images from word/header*.xml
   * so appointment-letter letterhead logos still appear after import.
   */
  private async extractDocxHeaderHtml(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
      const JSZipMod: any = await import('jszip');
      const JSZip = JSZipMod.default ?? JSZipMod;
      const zip = await JSZip.loadAsync(arrayBuffer);

      const headerFiles = Object.keys(zip.files).filter(
        (n) => /^word\/header\d*\.xml$/i.test(n),
      );
      if (!headerFiles.length) return '';

      const mimeFor = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.endsWith('.png')) return 'image/png';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
        if (lower.endsWith('.gif')) return 'image/gif';
        if (lower.endsWith('.webp')) return 'image/webp';
        if (lower.endsWith('.emf') || lower.endsWith('.wmf')) return '';
        return 'image/png';
      };

      const imgs: string[] = [];
      const seen = new Set<string>();

      for (const headerPath of headerFiles) {
        const headerXml: string = await zip.file(headerPath)!.async('string');
        // Relationships file for this header
        const relsPath = headerPath.replace('word/', 'word/_rels/') + '.rels';
        const relsFile = zip.file(relsPath);
        const rIdToTarget = new Map<string, string>();
        if (relsFile) {
          const relsXml: string = await relsFile.async('string');
          for (const m of relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/gi)) {
            rIdToTarget.set(m[1], m[2].replace(/^\.\.\//, 'word/').replace(/^media\//, 'word/media/'));
          }
          for (const m of relsXml.matchAll(/Target="([^"]+)"[^>]*Id="(rId\d+)"/gi)) {
            const target = m[1].replace(/^\.\.\//, 'word/').replace(/^media\//, 'word/media/');
            rIdToTarget.set(m[2], target.startsWith('word/') ? target : `word/${target}`);
          }
        }

        // a:blip r:embed="rIdX"
        const embeds = [...headerXml.matchAll(/r:embed="(rId\d+)"/gi)].map((m) => m[1]);
        for (const rId of embeds) {
          let target = rIdToTarget.get(rId);
          if (!target) continue;
          if (!target.startsWith('word/')) {
            target = target.startsWith('media/') ? `word/${target}` : `word/${target}`;
          }
          if (seen.has(target)) continue;
          const media = zip.file(target);
          if (!media) continue;
          const mime = mimeFor(target);
          if (!mime) continue;
          const base64 = await media.async('base64');
          seen.add(target);
          imgs.push(
            `<img class="hr-docx-header-img" src="data:${mime};base64,${base64}" style="max-width:100%;height:auto;display:block;margin:0 auto 8px;" alt="Letterhead" />`,
          );
        }
      }

      if (!imgs.length) return '';
      return `<div class="hr-docx-header hr-imported-doc" style="text-align:center;margin:0 0 8px;">${imgs.join('')}</div>`;
    } catch (err) {
      console.warn('extractDocxHeaderHtml failed', err);
      return '';
    }
  }

  private async convertDocxToHtml(file: File): Promise<string> {
    const mammothMod: any = await import('mammoth');
    const mammoth = mammothMod.default ?? mammothMod;
    let arrayBuffer = await file.arrayBuffer();

    // Word stores 1,2,3â€¦ in numbering.xml (not as visible text). Inject labels so they survive.
    arrayBuffer = await this.injectDocxNumberingLabels(arrayBuffer);

    // Alignment + spacing + indent from Word OOXML (twips)
    const paraStyles = await this.extractDocxParagraphStyles(arrayBuffer);

    const transformParagraph = (element: any) => {
      if (!element || element.type !== 'paragraph') return element;
      const align = String(element.alignment || '').toLowerCase();
      if (!align || align === 'left' || align === 'start') return element;
      const alignStyle =
        align === 'center'
          ? 'AlignCenter'
          : align === 'right' || align === 'end'
            ? 'AlignRight'
            : align === 'both' || align === 'justify'
              ? 'AlignJustify'
              : null;
      if (!alignStyle) return element;
      return { ...element, styleName: alignStyle };
    };

    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        convertImage: mammoth.images.imgElement(async (image: any) => {
          const base64 = await image.read('base64');
          return { src: `data:${image.contentType};base64,${base64}` };
        }),
        transformDocument: mammoth.transforms.paragraph(transformParagraph),
        ignoreEmptyParagraphs: false,
        styleMap: [
          "p[style-name='Title'] => h1.hr-doc-title:fresh",
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Quote'] => blockquote:fresh",
          "p[style-name='AlignCenter'] => p.hr-align-center:fresh",
          "p[style-name='AlignRight'] => p.hr-align-right:fresh",
          "p[style-name='AlignJustify'] => p.hr-align-justify:fresh",
          "p[style-name='AlignLeft'] => p.hr-align-left:fresh",
          "r[style-name='Strong'] => strong",
          "table => table.hr-doc-table",
          "br[type='page'] => div.page-break:fresh",
        ],
        includeDefaultStyleMap: true,
      },
    );

    if (result.messages?.length) {
      console.warn('mammoth messages', result.messages);
    }

    let html = this.applyAlignmentInlineStyles(String(result.value || '').trim());
    html = this.applyDocxParagraphStyles(html, paraStyles);
    // Fallback: turn <ol><li> into "1. â€¦" text so numbers always show in editor/print
    html = this.flattenOrderedListsToNumberedText(html);
    return html;
  }

  /**
   * Word auto-numbering lives in word/numbering.xml. Mammoth often drops the visible
   * "1. 2. 3." markers. Inject literal labels into each numbered paragraph before convert.
   */
  private async injectDocxNumberingLabels(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      const JSZipMod: any = await import('jszip');
      const JSZip = JSZipMod.default ?? JSZipMod;
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docFile = zip.file('word/document.xml');
      const numFile = zip.file('word/numbering.xml');
      if (!docFile || !numFile) return arrayBuffer;

      const numberingXml: string = await numFile.async('string');
      const docXml: string = await docFile.async('string');

      // numId -> abstractNumId
      const numToAbstract = new Map<string, string>();
      for (const m of numberingXml.matchAll(/<w:num\b[^>]*w:numId="(\d+)"[^>]*>[\s\S]*?<w:abstractNumId\b[^>]*w:val="(\d+)"/g)) {
        numToAbstract.set(m[1], m[2]);
      }
      // Also handle attribute order variations
      for (const m of numberingXml.matchAll(/<w:num\b([^>]*)>([\s\S]*?)<\/w:num>/g)) {
        const id = m[1].match(/w:numId="(\d+)"/)?.[1];
        const abs = m[2].match(/<w:abstractNumId\b[^>]*w:val="(\d+)"/)?.[1];
        if (id && abs) numToAbstract.set(id, abs);
      }

      // abstractNumId -> level defs
      type LvlDef = { start: number; numFmt: string; lvlText: string };
      const abstractLevels = new Map<string, Map<number, LvlDef>>();
      for (const absM of numberingXml.matchAll(/<w:abstractNum\b([^>]*)>([\s\S]*?)<\/w:abstractNum>/g)) {
        const absId = absM[1].match(/w:abstractNumId="(\d+)"/)?.[1];
        if (!absId) continue;
        const levels = new Map<number, LvlDef>();
        for (const lvlM of absM[2].matchAll(/<w:lvl\b([^>]*)>([\s\S]*?)<\/w:lvl>/g)) {
          const ilvl = parseInt(lvlM[1].match(/w:ilvl="(\d+)"/)?.[1] || '0', 10);
          const body = lvlM[2];
          const start = parseInt(body.match(/<w:start\b[^>]*w:val="(\d+)"/)?.[1] || '1', 10);
          const numFmt = body.match(/<w:numFmt\b[^>]*w:val="([^"]+)"/)?.[1] || 'decimal';
          const lvlText = body.match(/<w:lvlText\b[^>]*w:val="([^"]*)"/)?.[1] || '%1.';
          levels.set(ilvl, { start, numFmt, lvlText });
        }
        abstractLevels.set(absId, levels);
      }

      // Counters: key = `${numId}:${ilvl}`
      const counters = new Map<string, number>();
      const formatNumber = (n: number, fmt: string): string => {
        const f = (fmt || 'decimal').toLowerCase();
        if (f === 'upperletter') return String.fromCharCode(65 + ((n - 1) % 26));
        if (f === 'lowerletter') return String.fromCharCode(97 + ((n - 1) % 26));
        if (f === 'upperroman') {
          const rom = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
          return rom[n - 1] || String(n);
        }
        if (f === 'lowerroman') {
          const rom = ['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx'];
          return rom[n - 1] || String(n);
        }
        if (f === 'bullet') return 'â€¢';
        return String(n);
      };

      const escapeXml = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

      let labeled = 0;
      const newDocXml = docXml.replace(/<w:p([\s>])([\s\S]*?)<\/w:p>/g, (_full, sep: string, inner: string) => {
        const numPr = inner.match(/<w:numPr\b[^>]*>([\s\S]*?)<\/w:numPr>/);
        if (!numPr) return `<w:p${sep}${inner}</w:p>`;

        const ilvl = parseInt(numPr[1].match(/<w:ilvl\b[^>]*w:val="(\d+)"/)?.[1] || '0', 10);
        const numId = numPr[1].match(/<w:numId\b[^>]*w:val="(\d+)"/)?.[1];
        if (!numId) return `<w:p${sep}${inner}</w:p>`;

        const absId = numToAbstract.get(numId);
        const lvlDef = absId ? abstractLevels.get(absId)?.get(ilvl) : undefined;
        const start = lvlDef?.start ?? 1;
        const numFmt = lvlDef?.numFmt || 'decimal';
        const lvlText = lvlDef?.lvlText || '%1.';

        // Reset deeper levels when this level advances
        for (const key of [...counters.keys()]) {
          if (key.startsWith(`${numId}:`)) {
            const lv = parseInt(key.split(':')[1], 10);
            if (lv > ilvl) counters.delete(key);
          }
        }

        const cKey = `${numId}:${ilvl}`;
        const next = (counters.get(cKey) ?? start - 1) + 1;
        counters.set(cKey, next);

        // Build label from lvlText (%1, %2, â€¦)
        let label = lvlText;
        for (let lv = 0; lv <= ilvl; lv++) {
          const v = counters.get(`${numId}:${lv}`) ?? (lv === ilvl ? next : start);
          const fmt = absId ? abstractLevels.get(absId)?.get(lv)?.numFmt || 'decimal' : 'decimal';
          label = label.replace(new RegExp(`%${lv + 1}`, 'g'), formatNumber(v, fmt));
        }
        // Ensure space after label for readability
        if (label && !/\s$/.test(label) && !/[.)\]:]$/.test(label)) label += '.';
        if (label && !/\s$/.test(label)) label += ' ';

        // Skip if paragraph text already starts with same number (manual numbering)
        const textBits = [...inner.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map((t) => t[1]).join('');
        const plainStart = textBits.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trimStart();
        if (/^(\d+|[ivxlcdm]+|[a-z])[.)]\s/i.test(plainStart) || plainStart.startsWith(label.trim())) {
          // Already has a visible number â€” just strip numPr to avoid mammoth list without markers
          const cleaned = inner.replace(/<w:numPr\b[^>]*>[\s\S]*?<\/w:numPr>/, '');
          return `<w:p${sep}${cleaned}</w:p>`;
        }

        const run = `<w:r><w:t xml:space="preserve">${escapeXml(label)}</w:t></w:r>`;
        // Remove numPr so mammoth won't emit <ol> without markers; keep our literal label
        let cleaned = inner.replace(/<w:numPr\b[^>]*>[\s\S]*?<\/w:numPr>/, '');
        // Insert run after pPr if present, else at start
        if (/<w:pPr\b[\s\S]*?<\/w:pPr>/.test(cleaned)) {
          cleaned = cleaned.replace(/(<\/w:pPr>)/, `$1${run}`);
        } else {
          cleaned = run + cleaned;
        }
        labeled++;
        return `<w:p${sep}${cleaned}</w:p>`;
      });

      if (labeled === 0) return arrayBuffer;

      zip.file('word/document.xml', newDocXml);
      const out = await zip.generateAsync({ type: 'arraybuffer' });
      console.info(`[docx] Injected ${labeled} sequence number label(s)`);
      return out;
    } catch (err) {
      console.warn('injectDocxNumberingLabels failed', err);
      return arrayBuffer;
    }
  }

  /** Convert <ol><li>â€¦</li></ol> into paragraphs with visible "1. " text. */
  private flattenOrderedListsToNumberedText(html: string): string {
    if (!html || !/<ol\b/i.test(html)) return html;
    return html.replace(/<ol\b([^>]*)>([\s\S]*?)<\/ol>/gi, (_full, _attrs: string, inner: string) => {
      let n = 1;
      const startMatch = String(_attrs || '').match(/\bstart\s*=\s*["']?(\d+)/i);
      if (startMatch) n = parseInt(startMatch[1], 10) || 1;
      return inner.replace(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi, (_li, liAttrs: string, liBody: string) => {
        // Drop nested tags wrapper carefully â€” keep inner HTML
        const body = String(liBody || '').trim();
        // Avoid double-numbering if already starts with "1."
        const plain = body.replace(/<[^>]+>/g, '').trim();
        const prefix = /^(\d+|[ivxlcdm]+)[.)]\s/i.test(plain) ? '' : `${n}. `;
        n++;
        const style = /style=/i.test(liAttrs) ? '' : ' style="margin:0.35em 0;"';
        return `<p class="hr-imported-doc hr-numbered"${style}>${prefix}${body}</p>`;
      });
    });
  }

  /** Parse word/document.xml for alignment, spacing and indent (twips â†’ CSS). */
  private async extractDocxParagraphStyles(
    arrayBuffer: ArrayBuffer,
  ): Promise<Array<{ align?: string; style: string }>> {
    try {
      const JSZipMod: any = await import('jszip');
      const JSZip = JSZipMod.default ?? JSZipMod;
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docFile = zip.file('word/document.xml');
      if (!docFile) return [];
      const docXml: string = await docFile.async('string');
      const paras = docXml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];

      return paras.map((pXml) => {
        const pPrMatch = pXml.match(/<w:pPr\b[^>]*>([\s\S]*?)<\/w:pPr>/);
        const pPr = pPrMatch ? pPrMatch[1] : '';
        const styles: string[] = [];
        let align: string | undefined;

        const jc = pPr.match(/<w:jc\b[^>]*w:val="([^"]+)"/);
        if (jc) {
          const v = jc[1].toLowerCase();
          align =
            v === 'center'
              ? 'center'
              : v === 'right' || v === 'end'
                ? 'right'
                : v === 'both' || v === 'distribute'
                  ? 'justify'
                  : v === 'left' || v === 'start'
                    ? 'left'
                    : undefined;
          if (align) styles.push(`text-align:${align}`);
        }

        const spacing = pPr.match(/<w:spacing\b([^>]*)\/?>/);
        if (spacing) {
          const attrs = spacing[1];
          const before = attrs.match(/w:before="(\d+)"/);
          const after = attrs.match(/w:after="(\d+)"/);
          const line = attrs.match(/w:line="(\d+)"/);
          const lineRule = attrs.match(/w:lineRule="([^"]+)"/);
          if (before) {
            const pt = Math.min(parseInt(before[1], 10) / 20, 16);
            styles.push(`margin-top:${pt.toFixed(1)}pt`);
          }
          if (after) {
            const pt = Math.min(parseInt(after[1], 10) / 20, 16);
            styles.push(`margin-bottom:${pt.toFixed(1)}pt`);
          }
          if (line) {
            const lineVal = parseInt(line[1], 10);
            const rule = (lineRule?.[1] || 'auto').toLowerCase();
            if (rule === 'auto') {
              const lh = Math.min(Math.max(lineVal / 240, 1), 2.2);
              styles.push(`line-height:${lh.toFixed(2)}`);
            } else {
              const pt = Math.min(lineVal / 20, 28);
              styles.push(`line-height:${pt.toFixed(1)}pt`);
            }
          }
        }

        const ind = pPr.match(/<w:ind\b([^>]*)\/?>/);
        if (ind) {
          const attrs = ind[1];
          const left = attrs.match(/w:(?:left|start)="(\d+)"/);
          const right = attrs.match(/w:(?:right|end)="(\d+)"/);
          const first = attrs.match(/w:firstLine="(\d+)"/);
          const hanging = attrs.match(/w:hanging="(\d+)"/);
          if (left) styles.push(`margin-left:${Math.min(parseInt(left[1], 10) / 20, 72).toFixed(1)}pt`);
          if (right) styles.push(`margin-right:${Math.min(parseInt(right[1], 10) / 20, 72).toFixed(1)}pt`);
          if (first) styles.push(`text-indent:${Math.min(parseInt(first[1], 10) / 20, 36).toFixed(1)}pt`);
          if (hanging) styles.push(`text-indent:-${Math.min(parseInt(hanging[1], 10) / 20, 36).toFixed(1)}pt`);
        }

        return { align, style: styles.join(';') };
      });
    } catch (err) {
      console.warn('extractDocxParagraphStyles failed', err);
      return [];
    }
  }

  /** Apply OOXML spacing/indent/align onto mammoth HTML blocks in order. */
  private applyDocxParagraphStyles(
    html: string,
    paraStyles: Array<{ align?: string; style: string }>,
  ): string {
    if (!html || !paraStyles?.length) return html;
    let idx = 0;
    return html.replace(/<(p|h1|h2|h3|h4|h5|h6)(\b[^>]*)>/gi, (full, tag: string, attrs: string) => {
      const meta = paraStyles[idx++];
      if (!meta?.style && !meta?.align) return full;

      const bits = [meta.style || ''].filter(Boolean);
      if (meta.align && !/text-align\s*:/i.test(meta.style || '')) {
        bits.push(`text-align:${meta.align}`);
      }
      const extra = bits.filter(Boolean).join(';');
      if (!extra) return full;

      let newAttrs = attrs || '';
      const ql =
        meta.align && meta.align !== 'left'
          ? `ql-align-${meta.align === 'justify' ? 'justify' : meta.align}`
          : '';

      if (/style\s*=/i.test(newAttrs)) {
        newAttrs = newAttrs.replace(/style\s*=\s*(["'])(.*?)\1/i, (_m, q, style) => {
          return `style=${q}${String(style).replace(/;?\s*$/, '')};${extra};${q}`;
        });
      } else {
        newAttrs += ` style="${extra};"`;
      }

      if (ql) {
        if (/class\s*=/i.test(newAttrs)) {
          newAttrs = newAttrs.replace(/class\s*=\s*(["'])(.*?)\1/i, (_m, q, cls) => {
            return `class=${q}${cls} ${ql}${q}`;
          });
        } else {
          newAttrs += ` class="${ql}"`;
        }
      }
      return `<${tag}${newAttrs}>`;
    });
  }

  /** Turn alignment classes into inline text-align so Quill + preview keep DOCX alignment. */
  private applyAlignmentInlineStyles(html: string): string {
    if (!html) return html;
    const map: Record<string, string> = {
      'hr-align-center': 'center',
      'hr-align-right': 'right',
      'hr-align-justify': 'justify',
      'hr-align-left': 'left',
      'align-center': 'center',
      'align-right': 'right',
      'align-justify': 'justify',
      'align-left': 'left',
    };

    return html.replace(
      /<(p|h1|h2|h3|h4|h5|h6|div|li|td|th)([^>]*)>/gi,
      (full, tag: string, attrs: string) => {
        const classMatch = attrs.match(/\bclass\s*=\s*(["'])(.*?)\1/i);
        if (!classMatch) return full;
        const classes = classMatch[2].split(/\s+/);
        let align: string | null = null;
        for (const c of classes) {
          if (map[c]) {
            align = map[c];
            break;
          }
        }
        if (!align) return full;

        const qlClass = `ql-align-${align === 'justify' ? 'justify' : align}`;
        let newAttrs = attrs;
        if (/style=/i.test(newAttrs)) {
          newAttrs = newAttrs.replace(/style\s*=\s*(["'])(.*?)\1/i, (_m, q, style) => {
            const cleaned = String(style).replace(/text-align\s*:\s*[^;]+;?/gi, '').trim();
            return `style=${q}text-align:${align};${cleaned ? cleaned + (cleaned.endsWith(';') ? '' : ';') : ''}${q}`;
          });
        } else {
          newAttrs += ` style="text-align:${align};"`;
        }
        if (/class\s*=/i.test(newAttrs)) {
          newAttrs = newAttrs.replace(/class\s*=\s*(["'])(.*?)\1/i, (_m, q, cls) => {
            const merged = `${cls} ${qlClass}`.replace(/\s+/g, ' ').trim();
            return `class=${q}${merged}${q}`;
          });
        } else {
          newAttrs += ` class="${qlClass}"`;
        }
        return `<${tag}${newAttrs}>`;
      },
    );
  }

  private normalizeImportedHtml(raw: string, fromDocx: boolean): string {
    let html = String(raw || '').trim();
    if (!html) return '<p><br></p>';

    // Normalize page breaks from various exporters
    html = html
      .replace(/<br[^>]*type=["']page["'][^>]*\/?>/gi, '<div class="page-break" style="page-break-before:always;break-before:page;"></div>')
      .replace(/page-break-before\s*:\s*always/gi, 'page-break-before:always;break-before:page');

    // Ensure images don't overflow / don't float over following text (Ref line overlap bug)
    html = html.replace(/<img\b([^>]*)>/gi, (_m, attrs: string) => {
      const safe =
        'max-width:100%;height:auto;display:block;position:static;float:none;margin:0 auto 8px;';
      if (/style=/i.test(attrs)) {
        return `<img${attrs.replace(/style=(["'])/i, `style=$1${safe}`)}>`;
      }
      return `<img${attrs} style="${safe}">`;
    });

    // Tables: layout/signature tables stay borderless; only mark bordered when Word had borders
    html = html.replace(/<table\b([^>]*)>/gi, (_m, attrs: string) => {
      const extra = 'border-collapse:collapse;width:100%;';
      const looksBordered =
        /\bborder\s*=\s*["']?[1-9]/i.test(attrs) ||
        /border\s*:\s*[^;]*[1-9]/i.test(attrs) ||
        /hr-doc-table-bordered/i.test(attrs);
      const cls = looksBordered ? 'hr-doc-table hr-doc-table-bordered' : 'hr-doc-table';
      if (/style=/i.test(attrs)) {
        let a = attrs.replace(/style=(["'])/i, `style=$1${extra}`);
        if (/class=/i.test(a)) {
          a = a.replace(/class\s*=\s*(["'])(.*?)\1/i, (_cm, q, c) => `class=${q}${c} ${cls}${q}`);
        } else {
          a += ` class="${cls}"`;
        }
        return `<table${a}>`;
      }
      return `<table${attrs} class="${cls}" style="${extra}">`;
    });

    // Preserve numbered / bullet lists (1,2,3â€¦ must stay visible)
    html = html.replace(/<ol\b([^>]*)>/gi, (_m, attrs: string) => {
      const extra = 'list-style-type:decimal;padding-left:1.6em;margin:0.4em 0;';
      if (/style=/i.test(attrs)) {
        return `<ol${attrs.replace(/style=(["'])/i, `style=$1${extra}`)} class="hr-doc-ol">`;
      }
      return `<ol${attrs} class="hr-doc-ol" style="${extra}">`;
    });
    html = html.replace(/<ul\b([^>]*)>/gi, (_m, attrs: string) => {
      const extra = 'list-style-type:disc;padding-left:1.6em;margin:0.4em 0;';
      if (/style=/i.test(attrs)) {
        return `<ul${attrs.replace(/style=(["'])/i, `style=$1${extra}`)} class="hr-doc-ul">`;
      }
      return `<ul${attrs} class="hr-doc-ul" style="${extra}">`;
    });
    html = html.replace(/<li\b([^>]*)>/gi, (_m, attrs: string) => {
      if (/style=/i.test(attrs) && /display\s*:\s*none/i.test(attrs)) {
        return `<li${attrs.replace(/display\s*:\s*none\s*;?/gi, '')}>`;
      }
      return `<li${attrs}>`;
    });

    // Do NOT wrap in an outer <div> â€” Quill strips unknown block wrappers and leaves the editor blank.
    // Mark paragraphs so CSS / preview can still detect an imported layout.
    if (fromDocx) {
      html = html.replace(/<(p|h1|h2|h3|h4|h5|h6)(\b[^>]*)>/gi, (full, tag: string, attrs: string) => {
        if (/\bhr-imported-doc\b/i.test(attrs)) return full;
        if (/class\s*=/i.test(attrs)) {
          return `<${tag}${attrs.replace(/class\s*=\s*(["'])(.*?)\1/i, (_m, q, cls) => `class=${q}${cls} hr-imported-doc${q}`)}>`;
        }
        return `<${tag}${attrs} class="hr-imported-doc">`;
      });
    }
    return html;
  }

  /**
   * Word often exports absolute/float positioning that makes Ref/logo text stack on top
   * of each other in HTML. Force normal document flow.
   */
  private sanitizeOverlappingLayoutHtml(html: string): string {
    let out = String(html || '');

    out = out.replace(/style\s*=\s*(["'])(.*?)\1/gi, (_m, q: string, style: string) => {
      let s = String(style)
        .replace(/position\s*:\s*[^;]+;?/gi, '')
        .replace(/(?:^|;)\s*(?:top|left|right|bottom)\s*:\s*[^;]+;?/gi, ';')
        .replace(/float\s*:\s*[^;]+;?/gi, '')
        .replace(/z-index\s*:\s*[^;]+;?/gi, '')
        .replace(/transform\s*:\s*[^;]+;?/gi, '')
        .replace(/letter-spacing\s*:\s*-?[\d.]+(?:px|pt|em|rem)?;?/gi, '')
        .replace(/word-spacing\s*:\s*-?[\d.]+(?:px|pt|em|rem)?;?/gi, '')
        .replace(/margin-top\s*:\s*-\d[\d.]*(?:px|pt|em|rem|mm)?;?/gi, 'margin-top:0;')
        .replace(/margin-bottom\s*:\s*-\d[\d.]*(?:px|pt|em|rem|mm)?;?/gi, 'margin-bottom:0;')
        .replace(/text-indent\s*:\s*-\d[\d.]*(?:px|pt|em|rem|mm)?;?/gi, 'text-indent:0;')
        .replace(/;;+/g, ';')
        .replace(/^;|;$/g, '')
        .trim();
      return s ? `style=${q}${s}${q}` : '';
    });

    // Remove empty style="" left behind
    out = out.replace(/\sstyle=(["'])\s*\1/gi, '');

    // Clearfix after images so following "Ref:" line cannot ride up onto logo
    out = out.replace(
      /(<img\b[^>]*>)/gi,
      '$1<div class="hr-clearfix" style="clear:both;height:0;margin:0;padding:0;border:0;"></div>',
    );

    return out;
  }

  private looksLikeFullLetterLayout(html: string): boolean {
    const imgCount = (html.match(/<img\b/gi) || []).length;
    const hasTable = /<table\b/i.test(html);
    const hasPageBreak = /page-break/i.test(html);
    return imgCount >= 1 || hasTable || hasPageBreak || html.length > 2500;
  }

  save(): void {
    this.syncLetterheadMode();
    if (this.useRichEditor && this.richHost?.nativeElement) {
      this.form.bodyHtml = this.richHost.nativeElement.innerHTML;
    } else if (this.quill?.root?.innerHTML) {
      const fromEditor = this.quill.root.innerHTML;
      const editorPlain = fromEditor.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
      if (editorPlain.length > 0) {
        this.form.bodyHtml = fromEditor;
      }
    }
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
