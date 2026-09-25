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
    // no-op soft matcher — keeps default paste behavior intact
  }

  /**
   * Load HTML into Quill. Never assign quill.root.innerHTML directly —
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
      // Last resort — but prefer switching to rich editor for complex HTML
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
    // Quill snow theme inserts .ql-toolbar as a SIBLING of the host — remove orphans
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

  richCmd(command: string, value?: string): void {
    const el = this.getRichEl();
    if (!el) return;

    const hadSelection = this.restoreRichSelection();
    // For indent/align, caret is enough — no need for a text selection
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

    // Word HTML often ignores formatting — wrap selected text manually
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

      const plainCheck = html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!plainCheck || plainCheck.length < 2) {
        this.notyf.error('No readable content found in this file. Re-save as .docx in Word and try again.');
        return;
      }

      // Word templates usually already include letterhead/logo — avoid double letterhead overlay
      this.letterheadMode = 'blank';
      this.form.letterheadBlank = true;
      this.importedLayout = true;
      this.useRichEditor = true;
      this.destroyEditor();
      this.form.bodyHtml = html;
      this.cdr.detectChanges();

      // Wait for *ngIf to create #richHost, then paint HTML (Quill cannot show full DOCX)
      setTimeout(() => {
        this.renderRichHtml(html);
        setTimeout(() => {
          const shown = (this.richHost?.nativeElement?.innerText || '').replace(/\s+/g, '').trim();
          if (!shown) {
            this.notyf.error('Import ran but content did not render. Try another .docx (Save As in Word).');
          } else {
            this.notyf.success(
              isDocx
                ? 'Word template imported — content is in the editor below'
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

  private async convertDocxToHtml(file: File): Promise<string> {
    const mammothMod: any = await import('mammoth');
    const mammoth = mammothMod.default ?? mammothMod;
    let arrayBuffer = await file.arrayBuffer();

    // Word stores 1,2,3… in numbering.xml (not as visible text). Inject labels so they survive.
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
    // Fallback: turn <ol><li> into "1. …" text so numbers always show in editor/print
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
        if (f === 'bullet') return '•';
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

        // Build label from lvlText (%1, %2, …)
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
          // Already has a visible number — just strip numPr to avoid mammoth list without markers
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

  /** Convert <ol><li>…</li></ol> into paragraphs with visible "1. " text. */
  private flattenOrderedListsToNumberedText(html: string): string {
    if (!html || !/<ol\b/i.test(html)) return html;
    return html.replace(/<ol\b([^>]*)>([\s\S]*?)<\/ol>/gi, (_full, _attrs: string, inner: string) => {
      let n = 1;
      const startMatch = String(_attrs || '').match(/\bstart\s*=\s*["']?(\d+)/i);
      if (startMatch) n = parseInt(startMatch[1], 10) || 1;
      return inner.replace(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi, (_li, liAttrs: string, liBody: string) => {
        // Drop nested tags wrapper carefully — keep inner HTML
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

  /** Parse word/document.xml for alignment, spacing and indent (twips → CSS). */
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
          if (before) styles.push(`margin-top:${(parseInt(before[1], 10) / 20).toFixed(1)}pt`);
          if (after) styles.push(`margin-bottom:${(parseInt(after[1], 10) / 20).toFixed(1)}pt`);
          if (line) {
            const lineVal = parseInt(line[1], 10);
            const rule = (lineRule?.[1] || 'auto').toLowerCase();
            if (rule === 'auto') styles.push(`line-height:${(lineVal / 240).toFixed(2)}`);
            else styles.push(`line-height:${(lineVal / 20).toFixed(1)}pt`);
          }
        }

        const ind = pPr.match(/<w:ind\b([^>]*)\/?>/);
        if (ind) {
          const attrs = ind[1];
          const left = attrs.match(/w:(?:left|start)="(\d+)"/);
          const right = attrs.match(/w:(?:right|end)="(\d+)"/);
          const first = attrs.match(/w:firstLine="(\d+)"/);
          const hanging = attrs.match(/w:hanging="(\d+)"/);
          if (left) styles.push(`margin-left:${(parseInt(left[1], 10) / 20).toFixed(1)}pt`);
          if (right) styles.push(`margin-right:${(parseInt(right[1], 10) / 20).toFixed(1)}pt`);
          if (first) styles.push(`text-indent:${(parseInt(first[1], 10) / 20).toFixed(1)}pt`);
          if (hanging) styles.push(`text-indent:-${(parseInt(hanging[1], 10) / 20).toFixed(1)}pt`);
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

    // Ensure images don't overflow the page
    html = html.replace(/<img\b([^>]*)>/gi, (_m, attrs: string) => {
      if (/style=/i.test(attrs)) {
        return `<img${attrs.replace(/style=(["'])/i, 'style=$1max-width:100%;height:auto;')}>`;
      }
      return `<img${attrs} style="max-width:100%;height:auto;">`;
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

    // Preserve numbered / bullet lists (1,2,3… must stay visible)
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

    // Do NOT wrap in an outer <div> — Quill strips unknown block wrappers and leaves the editor blank.
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
