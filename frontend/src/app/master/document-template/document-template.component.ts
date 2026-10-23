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
import Quill, { Delta } from 'quill';
import Swal from 'sweetalert2';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';

/** Quill embed: inserts a real page-break marker that print preview can split on. */
const BlockEmbed = Quill.import('blots/block/embed') as any;
class PageBreakBlot extends BlockEmbed {
  static blotName = 'pagebreak';
  static tagName = 'div';
  static className = 'page-break';

  static create(): HTMLElement {
    const node = super.create() as HTMLElement;
    node.setAttribute('contenteditable', 'false');
    node.setAttribute('data-page-break', '1');
    node.setAttribute('style', 'page-break-before:always;break-before:page;');
    return node;
  }

  static value(): boolean {
    return true;
  }
}

/** Inline font-size / font-family so Word paste (12pt, Times New Roman…) survives. */
const QUILL_SIZE_WHITELIST = [
  '8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '22pt', '24pt', '26pt', '28pt', '32pt', '36pt', '48pt', '72pt',
  '8px', '9px', '10px', '11px', '12px', '13px', '14px', '15px', '16px', '18px', '20px', '22px', '24px', '28px', '32px', '36px', '48px', '64px', '72px',
];
const QUILL_FONT_WHITELIST = [
  'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Georgia', 'Verdana', 'Tahoma',
  'Courier New', 'Courier', 'Comic Sans MS', 'Impact', 'Calibri', 'Cambria',
  'Trebuchet MS', 'Palatino Linotype', 'Lucida Sans Unicode', 'Segoe UI', 'Garamond', 'Book Antiqua',
];

try {
  Quill.register(PageBreakBlot, true);

  const SizeStyle = Quill.import('attributors/style/size') as any;
  SizeStyle.whitelist = QUILL_SIZE_WHITELIST;
  Quill.register(SizeStyle, true);

  const FontStyle = Quill.import('attributors/style/font') as any;
  FontStyle.whitelist = QUILL_FONT_WHITELIST;
  Quill.register(FontStyle, true);
} catch (_) {
  // already registered (HMR / re-init)
}

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
  @ViewChild('richImageInput') richImageInput?: ElementRef<HTMLInputElement>;
  previewOpen = false;
  previewUrl: SafeResourceUrl | null = null;
  private previewObjectUrl: string | null = null;
  private lastPrintHtml = '';
  /** Debounce timer for live print-preview refresh while editing. */
  private previewRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  /** Active inline formats at caret — drives B/I/U/S toolbar highlight. */
  formatActive = {
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
  };
  /** Last picked foreground / background colors (toolbar swatches). */
  editorFgColor = '#000000';
  editorBgColor = '#ffff00';
  fgPresets = ['#000000', '#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#ffffff'];
  bgPresets = ['#ffff00', '#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#f3f4f6'];
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
      { key: 'pan_no', label: 'PAN No' },
      { key: 'shift_name', label: 'Shift Name' },
      {
        key: 'shift_timing',
        label: 'Shift Timing (e.g. 9:00 AM to 6:30 PM, Monday to Saturday)',
      },
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
    branchIds: [] as string[],
    assignAllBranches: true,
  };

  /** All tenant branches for assign multi-select */
  branchList: { id: string; name: string }[] = [];

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
    this.loadBranches();
  }

  loadBranches(): void {
    this.master.BranchDD().subscribe({
      next: (res: any) => {
        if (res?.status) {
          const raw = Array.isArray(res.data) ? res.data : res.data?.branches || [];
          this.branchList = (raw || [])
            .map((b: any) => ({ id: b.id, name: b.name || b.branchName || 'Branch' }))
            .filter((b: any) => !!b.id);
        }
      },
      error: () => {},
    });
  }

  toggleAssignAllBranches(all: boolean): void {
    this.form.assignAllBranches = all;
    if (all) this.form.branchIds = [];
  }

  toggleBranch(id: string, checked: boolean): void {
    this.form.assignAllBranches = false;
    const set = new Set<string>(this.form.branchIds || []);
    if (checked) set.add(id);
    else set.delete(id);
    this.form.branchIds = Array.from(set);
  }

  isBranchSelected(id: string): boolean {
    if (this.form.assignAllBranches) return false;
    return (this.form.branchIds || []).includes(id);
  }

  branchAssignLabel(row: any): string {
    const ids: string[] = Array.isArray(row?.branchIds) ? row.branchIds : [];
    if (!ids.length) return 'All branches';
    const names = ids
      .map((id) => this.branchList.find((b) => b.id === id)?.name || id.slice(0, 6))
      .filter(Boolean);
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  }

  ngOnDestroy(): void {
    if (this.previewRefreshTimer) {
      clearTimeout(this.previewRefreshTimer);
      this.previewRefreshTimer = null;
    }
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

  /**
   * Foreground (text) / Background (highlight) for Quill + rich editor.
   * Works on selection, or at caret for subsequent typing.
   */
  applyEditorColor(kind: 'foreground' | 'background', value: string): void {
    if (!value) return;
    if (kind === 'foreground') this.editorFgColor = value;
    else this.editorBgColor = value;

    if (this.useRichEditor) {
      this.applyRichTextStyle(kind === 'foreground' ? 'color' : 'background-color', value);
      return;
    }
    if (!this.quill) return;
    this.quill.focus();
    const range = this.quill.getSelection(true);
    if (!range) {
      this.quill.setSelection(Math.max(0, this.quill.getLength() - 1), 0, 'silent');
    }
    this.quill.format(kind === 'foreground' ? 'color' : 'background', value, 'user');
    this.form.bodyHtml = this.quill.root.innerHTML;
    this.refreshPrintPreview(false);
  }

  /** Apply font-family / font-size / color / background to selected text (multi-line safe). */
  applyRichTextStyle(property: string, value: string): void {
    if (!value) return;

    const el = this.getRichEl();
    if (!el) return;

    const isColor =
      property === 'color' || property === 'background-color';

    // Color may apply at caret (typing style); font size/family still need a selection
    const hadSelection = this.restoreRichSelection();
    if (!hadSelection && this.richSavedRange) {
      try {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(this.richSavedRange);
      } catch (_) {}
    }
    el.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.notyf.error('Editor mein cursor rakho');
      return;
    }
    if (!isColor && selection.isCollapsed) {
      this.notyf.error('Pehle text select karo');
      return;
    }

    const range = selection.getRangeAt(0).cloneRange();

    try {
      document.execCommand('styleWithCSS', false, 'true');

      if (property === 'color') {
        document.execCommand('foreColor', false, value);
        this.saveRichSelection();
        this.onRichInput();
        return;
      }
      if (property === 'background-color') {
        if (
          !document.execCommand('hiliteColor', false, value) &&
          !document.execCommand('backColor', false, value)
        ) {
          if (!selection.isCollapsed) {
            this.applyInlineStyleToRange(range, 'background-color', value);
          }
        }
        this.saveRichSelection();
        this.onRichInput();
        return;
      }

      // Multi-line / multi-paragraph: walk text nodes (span-wrap of whole range breaks on <p>/<div>)
      this.applyInlineStyleToRange(range, property, value);

      // Font-size on <span> alone leaves parent Word font-size/line-height → huge gaps.
      // Sync block typography so size ↓ also tightens line boxes, without merging lines.
      if (property === 'font-size') {
        this.syncBlocksAfterFontSize(value);
      } else if (property === 'font-family') {
        this.ensureSelectedBlocksStaySeparateLines();
      }

      this.saveRichSelection();
      this.onRichInput();
    } catch (error) {
      console.error('applyRichTextStyle failed:', error);
      this.notyf.error('Formatting apply nahi hua');
    }
  }

  /**
   * After font-size change: parent <p style="font-size:28pt"> keeps a tall CSS strut
   * even when inner text is 10pt — that is the huge gap. Sync block font-size + line-height,
   * but keep each block as display:block so lines never merge into one.
   */
  private syncBlocksAfterFontSize(fontSize: string): void {
    const blocks = this.getSelectedBlocks();
    for (const block of blocks) {
      block.style.fontSize = fontSize;
      // Unitless line-height scales with the new font size (no leftover 28pt line boxes)
      block.style.lineHeight = '1.25';
      block.style.minHeight = '0';
      block.style.height = '';
      block.style.marginTop = block.style.marginTop || '0';
      block.style.marginBottom = '0.15em';
      block.style.paddingTop = '0';
      block.style.paddingBottom = '0';
      const tag = block.tagName.toLowerCase();
      if (tag === 'p' || tag === 'div' || tag === 'li' || /^h[1-6]$/.test(tag)) {
        block.style.display = 'block';
      }
      // Nested Word spans often keep old font-size / absolute line-height
      block.querySelectorAll('span, font').forEach((node) => {
        const el = node as HTMLElement;
        if (el.style.fontSize) el.style.fontSize = fontSize;
        if (el.style.lineHeight && /(pt|px|mm|cm)$/i.test(el.style.lineHeight)) {
          el.style.lineHeight = '1.25';
        }
        // Block-level spans from Word must stay on their own line
        if ((el.style.display || '').toLowerCase() === 'block') {
          el.style.display = 'block';
          el.style.marginBottom = '0.1em';
        }
      });
    }
    this.ensureSelectedBlocksStaySeparateLines();
  }

  /** Prevent Serial/Employee/Year collapsing onto one visual line. */
  private ensureSelectedBlocksStaySeparateLines(): void {
    const blocks = this.getSelectedBlocks();
    for (const block of blocks) {
      const tag = block.tagName.toLowerCase();
      if (tag === 'span' || tag === 'font') {
        // These meta lines are often Word "block" spans — keep them stacked
        block.style.display = 'block';
      } else if (tag === 'p' || tag === 'div' || tag === 'li' || /^h[1-6]$/.test(tag)) {
        block.style.display = 'block';
      }
    }
  }

  /** Walk every text node in the selection and apply style — works across paragraphs. */
  private applyInlineStyleToRange(range: Range, property: string, value: string): void {
    const textNodes = this.getTextNodesInRange(range);
    if (!textNodes.length) return;

    const startNode = range.startContainer;
    const endNode = range.endContainer;
    const startOff = range.startOffset;
    const endOff = range.endOffset;

    // Process from end → start so splitText offsets stay valid
    for (let i = textNodes.length - 1; i >= 0; i--) {
      let text = textNodes[i];
      let from = 0;
      let to = text.length;

      if (text === startNode && text === endNode) {
        from = startOff;
        to = endOff;
      } else if (text === startNode) {
        from = startOff;
      } else if (text === endNode) {
        to = endOff;
      }

      if (from >= to || !text.length) continue;

      // Split end first, then start
      if (to < text.length) {
        text.splitText(to);
      }
      if (from > 0) {
        text = text.splitText(from);
      }

      const parent = text.parentElement;
      if (
        parent &&
        parent.tagName === 'SPAN' &&
        parent.childNodes.length === 1 &&
        parent.textContent === text.textContent
      ) {
        parent.style.setProperty(property, value);
        // Clear conflicting nested size/family from Word import on this span only
        continue;
      }

      const span = document.createElement('span');
      span.style.setProperty(property, value);
      text.parentNode?.insertBefore(span, text);
      span.appendChild(text);
    }

    // Re-select the original range so user can keep formatting
    try {
      const sel = window.getSelection();
      if (sel && this.richSavedRange) {
        sel.removeAllRanges();
        sel.addRange(this.richSavedRange);
      }
    } catch (_) {}
  }

  private getTextNodesInRange(range: Range): Text[] {
    const root =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentNode!
        : range.commonAncestorContainer;

    const nodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node: Node) => {
        if (!node.nodeValue || !node.nodeValue.length) return NodeFilter.FILTER_REJECT;
        try {
          const nodeRange = document.createRange();
          nodeRange.selectNodeContents(node);
          const before =
            range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0;
          const after =
            range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0;
          return before && after ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        } catch {
          return NodeFilter.FILTER_REJECT;
        }
      },
    });

    let n: Node | null;
    while ((n = walker.nextNode())) {
      nodes.push(n as Text);
    }
    return nodes;
  }

  applyParagraphSpacing(value: string): void {
    if (!value) return;

    const el = this.getRichEl();
    if (!el) return;

    if (!this.restoreRichSelection()) {
      // Allow caret-only: still tighten the current paragraph
      el.focus();
    }

    const blocks = this.getSelectedBlocks();
    if (!blocks.length) {
      this.notyf.error('Paragraph select/click karo');
      return;
    }

    const tight = value === '0' || value === '0px';
    for (const block of blocks) {
      const text = (block.textContent || '').replace(/\u00a0/g, ' ').trim();
      const isBlank = !text;

      block.style.marginTop = value;
      block.style.marginBottom = value;
      block.style.display = 'block'; // never allow gap-tighten to merge lines

      if (tight) {
        block.style.paddingTop = '0';
        block.style.paddingBottom = '0';
        block.style.minHeight = '0';
        block.style.height = '';

        if (isBlank) {
          block.classList.add('hr-blank-gap');
          block.style.lineHeight = '0.4';
          block.style.marginTop = '0';
          block.style.marginBottom = '0';
        } else {
          // Content lines: tighten gap but KEEP separate lines (line-height >= 1.15)
          block.classList.remove('hr-blank-gap');
          block.style.lineHeight = '1.2';
          block.style.marginTop = '0';
          block.style.marginBottom = '0.1em';
          // Absolute pt line-heights from Word cause giant gaps after font shrink
          block.querySelectorAll('[style*="line-height"]').forEach((node) => {
            const el = node as HTMLElement;
            if (el.style.lineHeight && /(pt|px|mm|cm)$/i.test(el.style.lineHeight)) {
              el.style.lineHeight = '1.2';
            }
          });
        }
      }
    }

    this.saveRichSelection();
    this.syncBodyAndPreview();
  }

  applyParagraphStyle(property: string, value: string): void {
    if (!value) return;

    const el = this.getRichEl();
    if (!el) return;

    if (!this.restoreRichSelection()) {
      el.focus();
    }

    const blocks = this.getSelectedBlocks();
    if (!blocks.length) {
      this.notyf.error('Paragraph select/click karo');
      return;
    }

    for (const block of blocks) {
      block.style.setProperty(property, value);
      block.style.display = 'block';
      // Absolute line-heights fight unitless values — clear on children when setting line-height
      if (property === 'line-height') {
        block.querySelectorAll('[style*="line-height"]').forEach((node) => {
          const el = node as HTMLElement;
          if (el.style.lineHeight && /(pt|px|mm|cm)$/i.test(el.style.lineHeight)) {
            el.style.lineHeight = value;
          }
        });
      }
    }

    this.saveRichSelection();
    this.syncBodyAndPreview();
  }

  /** Open file picker to insert image at caret. */
  insertImage(): void {
    const el = this.getRichEl();
    if (!el) return;
    this.restoreRichSelection();
    this.richImageInput?.nativeElement?.click();
  }

  onRichImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.notyf.error('Sirf image files allowed hain');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.notyf.error('Image 5 MB se chhoti honi chahiye');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.insertHtmlAtCaret(
        `<img src="${dataUrl}" alt="inserted" style="max-width:100%;height:auto;display:inline-block;" />`,
      );
    };
    reader.readAsDataURL(file);
  }

  /** Prompt for rows/cols and insert a bordered Word-like table. */
  insertTable(): void {
    const rowsRaw = window.prompt('Number of rows?', '3');
    if (rowsRaw == null) return;
    const colsRaw = window.prompt('Number of columns?', '3');
    if (colsRaw == null) return;

    const rows = Math.min(20, Math.max(1, parseInt(rowsRaw, 10) || 3));
    const cols = Math.min(10, Math.max(1, parseInt(colsRaw, 10) || 3));

    let html =
      '<table class="hr-doc-table hr-doc-table-bordered" border="1" cellpadding="4" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0;">';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        const tag = r === 0 ? 'th' : 'td';
        const style =
          'border:1px solid #000;padding:6px 8px;min-width:60px;' +
          (r === 0 ? 'font-weight:bold;background:#f3f4f6;' : '');
        html += `<${tag} style="${style}"><br></${tag}>`;
      }
      html += '</tr>';
    }
    html += '</table><p><br></p>';
    this.insertHtmlAtCaret(html);
  }

  insertHorizontalRule(): void {
    this.insertHtmlAtCaret('<hr style="border:none;border-top:1px solid #000;margin:12px 0;" />');
  }

  private insertHtmlAtCaret(html: string): void {
    const el = this.getRichEl();
    if (!el) return;

    this.restoreRichSelection();
    el.focus();

    try {
      const ok = document.execCommand('insertHTML', false, html);
      if (!ok) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const temp = document.createElement('div');
          temp.innerHTML = html;
          const frag = document.createDocumentFragment();
          let node: ChildNode | null;
          let last: ChildNode | null = null;
          while ((node = temp.firstChild)) {
            last = frag.appendChild(node);
          }
          range.insertNode(frag);
          if (last) {
            const next = document.createRange();
            next.setStartAfter(last);
            next.collapse(true);
            sel.removeAllRanges();
            sel.addRange(next);
            this.richSavedRange = next.cloneRange();
          }
        } else {
          el.innerHTML = (el.innerHTML || '') + html;
        }
      }
    } catch (e) {
      console.warn('insertHtmlAtCaret failed', e);
      el.innerHTML = (el.innerHTML || '') + html;
    }

    this.saveRichSelection();
    this.syncBodyAndPreview();
  }


  openPrintPreview(): void {
    this.lastPrintHtml = ''; // force rebuild even if HTML string matched a prior open
    this.previewOpen = true;
    this.refreshPrintPreview(true);
  }

  closePrintPreview(): void {
    this.previewOpen = false;
    if (this.previewRefreshTimer) {
      clearTimeout(this.previewRefreshTimer);
      this.previewRefreshTimer = null;
    }
    this.revokePreviewUrl();
    this.lastPrintHtml = '';
  }

  /** Sync editor → bodyHtml, then rebuild preview iframe (immediate or debounced). */
  private refreshPrintPreview(immediate = false): void {
    if (!this.previewOpen) return;

    const run = () => {
      this.previewRefreshTimer = null;
      if (!this.previewOpen) return;

      // Same HTML the editor is showing (WYSIWYG)
      this.pullBodyFromEditor();

      const html = this.buildPrintHtml(this.form.bodyHtml || '');
      if (html === this.lastPrintHtml && this.previewObjectUrl) return;

      this.lastPrintHtml = html;
      const prevUrl = this.previewObjectUrl;
      const blob = new Blob([html], { type: 'text/html' });
      this.previewObjectUrl = URL.createObjectURL(blob);
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl);
      this.cdr.detectChanges();
      if (prevUrl) {
        try {
          URL.revokeObjectURL(prevUrl);
        } catch (_) {}
      }
    };

    if (this.previewRefreshTimer) {
      clearTimeout(this.previewRefreshTimer);
      this.previewRefreshTimer = null;
    }
    if (immediate) {
      run();
    } else {
      this.previewRefreshTimer = setTimeout(run, 280);
    }
  }

  /** Call after any document edit so open print preview stays in sync. */
  private syncBodyAndPreview(): void {
    this.pullBodyFromEditor();
    this.refreshPrintPreview(false);
  }

  printDocument(): void {
    this.pullBodyFromEditor();
    const html = this.buildPrintHtml(this.form.bodyHtml || '');
    this.lastPrintHtml = html;
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
   * Full printable HTML — match what the editor shows (WYSIWYG).
   * Page breaks → separate A4 sheets in on-screen preview.
   */
  private buildPrintHtml(bodyHtml: string): string {
    const raw = String(bodyHtml || '');
    // Quill editor content: light touch. Word-import HTML: heavier sanitize.
    const fromQuill =
      !this.useRichEditor ||
      /class=["'][^"']*\bql-(?:align|size|font|indent|direction)-/i.test(raw);

    let filled = fromQuill
      ? this.normalizeQuillHtmlForPrint(raw)
      : this.normalizeHtmlForPrint(raw);
    if (!fromQuill) {
      filled = this.wrapTrailingFooterForPrint(filled);
    }

    const useImage = this.letterheadMode === 'image' && !!this.pageBackground;
    const letterheadBlank = this.letterheadMode === 'blank' || !!this.form.letterheadBlank;
    const hasImportedLayout =
      this.importedLayout ||
      this.useRichEditor ||
      /hr-imported-doc|data-preserve-layout|hr-align-|text-align\s*:|hr-numbered|hr-doc-table/i.test(filled);

    // Match .ql-editor padding from document-template.component.css (WYSIWYG)
    const bodyPadTop = useImage ? '36mm' : hasImportedLayout ? '12mm' : letterheadBlank ? '18mm' : '28mm';
    const bodyPadX = hasImportedLayout ? '14mm' : '18mm';
    const bodyPadBottom = useImage ? '24mm' : hasImportedLayout ? '14mm' : letterheadBlank ? '18mm' : '22mm';
    const bgUrl = useImage ? String(this.pageBackground).replace(/'/g, '%27') : '';
    const bgCss = bgUrl
      ? `background-image:url('${bgUrl}');background-repeat:no-repeat;background-position:top center;background-size:100% auto;`
      : '';

    const sheets = this.splitHtmlByPageBreaks(filled);
    const pagesHtml = sheets
      .map((chunk) => `<div class="page"><div class="page-body ql-editor">${chunk}</div></div>`)
      .join('\n');

    // Exact editor typography so blank lines / signature gaps match hard copy
    const bodyTypeCss = fromQuill
      ? `
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
  }
  .page-body.ql-editor,
  .page-body {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
    overflow-wrap: anywhere;
    word-wrap: break-word;
    /* Keep multiple spaces (signature columns) like the editor */
    white-space: pre-wrap;
  }
  /* Same as editor: each empty <p><br></p> keeps vertical space */
  .page-body p,
  .page-body ol,
  .page-body ul {
    margin: 0.35em 0;
    padding: 0;
    white-space: pre-wrap;
  }
  .page-body p:empty,
  .page-body p:has(> br:only-child) {
    min-height: 1.5em !important;
    height: 1.5em;
    margin: 0.35em 0 !important;
    line-height: 1.5em;
  }
  .page-body .ql-spacer {
    display: block;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .page-body br { line-height: 1.5; }
  /* Signature / 2-column tables from Word or editor */
  .page-body table {
    width: 100% !important;
    table-layout: fixed;
  }
  .page-body table td,
  .page-body table th {
    vertical-align: top;
    width: 50%;
  }
  .page-body h1 { font-size: 2em; margin: 0.35em 0; }
  .page-body h2 { font-size: 1.5em; margin: 0.35em 0; }
  .page-body h3 { font-size: 1.17em; margin: 0.35em 0; }
  .ql-size-small { font-size: 0.75em; }
  .ql-size-large { font-size: 1.5em; }
  .ql-size-huge { font-size: 2.5em; }
  .ql-font-serif { font-family: Georgia, 'Times New Roman', serif; }
  .ql-font-monospace { font-family: Monaco, 'Courier New', monospace; }
  .ql-indent-1 { padding-left: 3em; }
  .ql-indent-2 { padding-left: 6em; }
  .ql-indent-3 { padding-left: 9em; }
  .ql-indent-4 { padding-left: 12em; }
  .ql-indent-5 { padding-left: 15em; }
  .ql-indent-6 { padding-left: 18em; }
  .ql-indent-7 { padding-left: 21em; }
  .ql-indent-8 { padding-left: 24em; }
  .ql-direction-rtl { direction: rtl; text-align: inherit; }
`
      : `
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #000; }
  p, h1, h2, h3, h4, h5, h6, li, td, th {
    margin-top: 0.35em; margin-bottom: 0.35em;
    line-height: 1.5; height: auto; max-height: none;
    min-height: 0; overflow: visible; max-width: 100%;
  }
  p:empty, p:has(> br:only-child) { min-height: 1.5em; }
`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Print Preview</title>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #d1d5db; }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  ${bodyTypeCss}
  .sheet-wrap {
    padding: 20px 12px 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
  }
  .page {
    width: 210mm; min-height: 297mm; box-sizing: border-box;
    padding: ${bodyPadTop} ${bodyPadX} ${bodyPadBottom};
    margin: 0; background: #fff; ${bgCss}
    box-shadow: 0 4px 24px rgba(0,0,0,0.22); position: relative;
  }
  .page-body { display: block; }
  img {
    max-width: 100% !important; height: auto !important; display: inline-block;
    page-break-inside: avoid !important; break-inside: avoid !important;
  }
  table, .hr-doc-table { width: 100%; border-collapse: collapse; margin: 0.5em 0; border: none; page-break-inside: avoid; }
  td, th { border: none; padding: 2px 4px; vertical-align: top; }
  table.hr-doc-table-bordered td, table.hr-doc-table-bordered th,
  table[border]:not([border="0"]) td, table[border]:not([border="0"]) th { border: 1px solid #000; padding: 4px 6px; }
  ul, ol, .hr-doc-ul, .hr-doc-ol {
    display: block; padding-left: 1.5em; margin: 0.4em 0;
    list-style-position: outside;
  }
  ol, .hr-doc-ol { list-style-type: decimal !important; }
  ul, .hr-doc-ul { list-style-type: disc !important; }
  li { display: list-item !important; margin: 0.2em 0; }
  .hr-numbered { margin: 0.3em 0; display: block; }
  .hr-clearfix { display: none !important; height: 0 !important; margin: 0 !important; }
  .page-break, [data-page-break] {
    display: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: 0 !important;
  }
  .hr-print-footer {
    display: block !important; margin-top: 14pt !important;
    page-break-inside: avoid !important; break-inside: avoid !important;
  }
  .hr-print-footer img { page-break-inside: avoid !important; break-inside: avoid !important; margin: 2px auto !important; }
  .hr-imported-doc { font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.4; color: #000; }
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
    .sheet-wrap { padding: 0 !important; gap: 0 !important; }
    .page {
      box-shadow: none !important; width: 210mm !important; min-height: 297mm !important;
      margin: 0 !important; page-break-after: always; break-after: page;
    }
    .page:last-child { page-break-after: auto; break-after: auto; }
    .hr-print-footer { page-break-inside: avoid !important; break-inside: avoid !important; }
  }
</style></head><body spellcheck="false">
<div class="sheet-wrap">${pagesHtml}</div>
</body></html>`;
  }

  /**
   * Light normalize for Quill HTML — keep spacing/formatting like the editor.
   * Preserves signature left/right columns and blank-line gaps for print.
   */
  private normalizeQuillHtmlForPrint(html: string): string {
    let out = String(html || '');
    const PAGE_BREAK_MARK = '<div class="page-break" data-page-break="1"></div>';
    out = out.replace(
      /<div\b[^>]*(?:class\s*=\s*["'][^"']*page-break[^"']*["']|data-page-break\s*=)[^>]*\/?>(?:[\s\S]*?<\/div>)?/gi,
      PAGE_BREAK_MARK,
    );
    out = out.replace(
      /<(?:div|p)\b[^>]*class=["'][^"']*\bpage-break\b[^"']*["'][^>]*>\s*(?:<br\s*\/?>)?\s*<\/(?:div|p)>/gi,
      PAGE_BREAK_MARK,
    );

    // Side-by-side signature rows (left label + right label, or left () + right ())
    out = this.pairSignatureColumnsForPrint(out);

    // ql-align-* → inline text-align (print engines sometimes drop class-only align)
    out = out.replace(
      /<([a-z][a-z0-9]*)\b([^>]*\bclass\s*=\s*["'][^"']*\bql-align-(left|center|right|justify)\b[^"']*["'][^>]*)>/gi,
      (_m, tag: string, attrs: string, align: string) => {
        if (/text-align\s*:/i.test(attrs)) return `<${tag}${attrs}>`;
        if (/style\s*=/i.test(attrs)) {
          return `<${tag}${attrs.replace(/style\s*=\s*(["'])/i, `style=$1text-align:${align};`)}>`;
        }
        return `<${tag}${attrs} style="text-align:${align};">`;
      },
    );

    // Multiple spaces (signature left/right columns) → non-breaking spaces
    out = out.replace(/>([^<]+)</g, (_m, text: string) => {
      const fixed = String(text).replace(/ {2,}/g, (spaces: string) =>
        '&nbsp;'.repeat(spaces.length),
      );
      return `>${fixed}<`;
    });

    // Runs of blank Quill lines → one spacer with exact height (signature gap)
    // Each blank <p><br></p> ≈ line-height 1.5 + margins 0.7 ≈ 1.85em in editor
    out = out.replace(
      /(?:<p\b[^>]*>\s*(?:<br\s*\/?\s*>|&nbsp;|\u00a0|\s)*<\/p>\s*)+/gi,
      (block: string) => {
        const count = (block.match(/<p\b/gi) || []).length;
        if (count <= 0) return block;
        if (count === 1) return '<p><br></p>';
        const em = (count * 1.85).toFixed(2);
        return `<div class="ql-spacer" style="height:${em}em;min-height:${em}em;line-height:${em}em;">&nbsp;</div>`;
      },
    );

    return out;
  }

  /** Keep "Signature of Service Provider | Receiver" (and () marks) on one row in print. */
  private pairSignatureColumnsForPrint(html: string): string {
    const textOf = (h: string) =>
      String(h || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;|\u00a0/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const isSigLine = (h: string) => {
      const t = textOf(h);
      return /signature/i.test(t) || /^\(\s*\)$/.test(t);
    };
    const isRight = (attrs: string) =>
      /ql-align-right|text-align\s*:\s*right/i.test(attrs || '');
    const isLeftish = (attrs: string) =>
      !isRight(attrs) && !/ql-align-center|text-align\s*:\s*center/i.test(attrs || '');

    return String(html || '').replace(
      /<p\b([^>]*)>([\s\S]*?)<\/p>\s*<p\b([^>]*)>([\s\S]*?)<\/p>/gi,
      (full, a1: string, c1: string, a2: string, c2: string) => {
        if (!isLeftish(a1) || !isRight(a2)) return full;
        if (!isSigLine(c1) || !isSigLine(c2)) return full;
        return (
          `<table class="hr-sig-table" style="width:100%;table-layout:fixed;border-collapse:collapse;border:none;margin:0.35em 0;">` +
          `<tbody><tr>` +
          `<td style="width:50%;vertical-align:top;text-align:left;border:none;padding:0 8px 0 0;">${c1}</td>` +
          `<td style="width:50%;vertical-align:top;text-align:right;border:none;padding:0 0 0 8px;">${c2}</td>` +
          `</tr></tbody></table>`
        );
      },
    );
  }

  /**
   * Split HTML into page chunks at page-break markers (after normalizeHtmlForPrint).
   */
  private splitHtmlByPageBreaks(html: string): string[] {
    const src = String(html || '');
    if (!src.trim()) return ['<p><br></p>'];

    // normalizeHtmlForPrint leaves: <div class="page-break" data-page-break="1"></div>
    const parts = src.split(/<div\b[^>]*(?:class\s*=\s*["'][^"']*page-break[^"']*["']|data-page-break\s*=)[^>]*>\s*<\/div>/gi);

    const cleaned = parts
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !/^<div\b[^>]*page-break[^>]*>\s*<\/div>$/i.test(p));

    return cleaned.length ? cleaned : ['<p><br></p>'];
  }

  private normalizeHtmlForPrint(html: string): string {
    let out = this.sanitizeOverlappingLayoutHtml(String(html || ''));

    // Canonical page-break markers FIRST — empty-block strip used to delete them
    const PAGE_BREAK_MARK = '<div class="page-break" data-page-break="1"></div>';
    out = out.replace(
      /<div\b[^>]*(?:class\s*=\s*["'][^"']*page-break[^"']*["']|data-page-break\s*=)[^>]*\/?>(?:[\s\S]*?<\/div>)?/gi,
      PAGE_BREAK_MARK,
    );
    out = out.replace(
      /<(?:br|hr)\b[^>]*(?:type\s*=\s*["']page["']|style\s*=\s*["'][^"']*page-break-before\s*:\s*always[^"']*["'])[^>]*\/?>/gi,
      PAGE_BREAK_MARK,
    );

    // Strip empty blocks — never touch page-break markers
    out = out.replace(
      /<(p|div|h[1-6])\b(?![^>]*page-break)(?![^>]*data-page-break)[^>]*>\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*<\/\1>/gi,
      '',
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
          // Ensure core employee chips always present
          const keys = new Set(emp.map((v: any) => v.key));
          if (!keys.has('designation')) emp.unshift({ key: 'designation', label: 'Designation' });
          if (!keys.has('department')) emp.unshift({ key: 'department', label: 'Department' });
          if (!keys.has('pan_no')) emp.push({ key: 'pan_no', label: 'PAN No' });
          if (!keys.has('shift_name')) emp.push({ key: 'shift_name', label: 'Shift Name' });
          if (!keys.has('shift_timing')) {
            emp.push({
              key: 'shift_timing',
              label: 'Shift Timing (e.g. 9:00 AM to 6:30 PM, Monday to Saturday)',
            });
          }
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
      branchIds: [],
      assignAllBranches: true,
    };
    this.letterheadMode = this.form.letterheadBlank ? 'blank' : 'image';
    setTimeout(() => this.initEditor(this.sampleBody), 0);
  }

  openEdit(row: any): void {
    this.createFlag = true;
    this.updateFlag = true;
    this.useRichEditor = false;

    const applyRow = (data: any) => {
      const html = data?.bodyHtml || '';
      // Keep Quill editor for Add + Update. importedLayout only affects page padding.
      this.importedLayout =
        /hr-imported-doc|page-break|data:image\/|text-align:|margin-top:|<table\b/i.test(html);
      const ids = Array.isArray(data.branchIds) ? data.branchIds.filter(Boolean) : [];
      this.form = {
        id: data.id,
        name: data.name,
        category: data.category || 'custom',
        bodyHtml: html,
        letterheadBlank: data.letterheadBlank === true,
        includeSalaryAnnexure: !!data.includeSalaryAnnexure,
        status: data.status || 'active',
        branchIds: ids,
        assignAllBranches: !ids.length,
      };
      this.letterheadMode = this.form.letterheadBlank ? 'blank' : 'image';
      this.cdr.detectChanges();
      setTimeout(() => this.initEditor(html), 0);
    };

    // Fetch fresh row so update always has latest body + id
    if (row?.id) {
      this.master.getHrTemplate(row.id).subscribe({
        next: (res: any) => {
          if (res?.status && res.data) applyRow(res.data);
          else applyRow(row);
        },
        error: () => applyRow(row),
      });
    } else {
      applyRow(row);
    }
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
    const self = this;
    this.quill = new Quill(host, {
      theme: 'snow',
      placeholder: 'Type your letter like in Word… Paste from Word keeps formatting.',
      modules: {
        toolbar: {
          container: [
            [{ header: [1, 2, 3, false] }],
            [{ font: QUILL_FONT_WHITELIST }],
            [{ size: QUILL_SIZE_WHITELIST }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ align: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ indent: '-1' }, { indent: '+1' }],
            ['blockquote', 'link', 'image'],
            ['pagebreak'],
            ['clean'],
          ],
          handlers: {
            pagebreak() {
              self.insertQuillPageBreak();
            },
          },
        },
        clipboard: {
          matchVisual: false,
        },
      },
    });

    this.registerClipboardMatchers();
    this.bindWordPasteHandler();
    this.setEditorHtml(html || '<p><br></p>');

    this.quill.on('text-change', () => {
      // Keep raw HTML so imported tables/images/styles survive edits as much as possible
      this.form.bodyHtml = this.quill?.root.innerHTML || '';
      this.refreshPrintPreview(false);
    });
  }

  /** Insert page-break embed at caret (Quill mode). Undo/redo supported via Quill history. */
  insertQuillPageBreak(): void {
    if (!this.quill) return;
    const range = this.quill.getSelection(true);
    const index = range ? range.index : Math.max(0, this.quill.getLength() - 1);
    this.quill.insertEmbed(index, 'pagebreak', true, 'user');
    this.quill.insertText(index + 1, '\n', 'user');
    this.quill.setSelection(index + 2, 0, 'user');
    this.form.bodyHtml = this.quill.root.innerHTML;
    this.refreshPrintPreview(false);
  }

  /**
   * Soften Quill's default paste stripping. Prefer setEditorHtml() for full Word imports.
   * Also map .page-break / data-page-break nodes onto the pagebreak blot.
   */
  private registerClipboardMatchers(): void {
    if (!this.quill) return;

    // Preserve inline styles from Word / Google Docs
    const applyInlineFormats = (node: HTMLElement, delta: any) => {
      const formats = this.extractFormatsFromElement(node);
      if (!Object.keys(formats).length) return delta;
      const next = new Delta();
      (delta.ops || []).forEach((op: any) => {
        if (op.insert && typeof op.insert === 'string') {
          next.insert(op.insert, { ...(op.attributes || {}), ...formats });
        } else if (op.insert) {
          next.insert(op.insert, op.attributes);
        }
      });
      return next.ops?.length ? next : delta;
    };

    for (const tag of ['SPAN', 'FONT', 'P', 'DIV', 'LI', 'TD', 'TH', 'A', 'B', 'I', 'U', 'STRONG', 'EM']) {
      this.quill.clipboard.addMatcher(tag, (node: HTMLElement, delta: any) => {
        if (
          tag === 'DIV' &&
          (node?.classList?.contains('page-break') || node?.getAttribute?.('data-page-break'))
        ) {
          return new Delta().insert({ pagebreak: true });
        }
        return applyInlineFormats(node, delta);
      });
    }
  }

  private extractFormatsFromElement(el: HTMLElement): Record<string, any> {
    const formats: Record<string, any> = {};
    if (!el) return formats;

    // Legacy <font face="" size="" color="">
    if (el.tagName === 'FONT') {
      const face = this.normalizeFontFamily(el.getAttribute('face') || '');
      if (face) formats['font'] = face;
      const color = el.getAttribute('color');
      if (color) formats['color'] = color;
      const sizeAttr = el.getAttribute('size');
      if (sizeAttr) {
        const mapped: Record<string, string> = {
          '1': '8pt',
          '2': '10pt',
          '3': '12pt',
          '4': '14pt',
          '5': '18pt',
          '6': '24pt',
          '7': '36pt',
        };
        if (mapped[sizeAttr]) formats['size'] = mapped[sizeAttr];
      }
    }

    const style = el.style;
    if (style) {
      const family = this.normalizeFontFamily(style.fontFamily || '');
      if (family) formats['font'] = family;
      const size = this.normalizeFontSize(style.fontSize || '');
      if (size) formats['size'] = size;
      if (style.color) formats['color'] = style.color;
      if (style.backgroundColor && style.backgroundColor !== 'transparent') {
        formats['background'] = style.backgroundColor;
      }
      const weight = (style.fontWeight || '').toLowerCase();
      if (weight === 'bold' || parseInt(weight, 10) >= 600) formats['bold'] = true;
      if ((style.fontStyle || '').toLowerCase() === 'italic') formats['italic'] = true;
      const deco = (style.textDecoration || style.textDecorationLine || '').toLowerCase();
      if (deco.includes('underline')) formats['underline'] = true;
      if (deco.includes('line-through')) formats['strike'] = true;
      const align = (style.textAlign || '').toLowerCase();
      if (align && align !== 'start' && align !== 'left' && align !== 'initial') {
        formats['align'] = align === 'justify' ? 'justify' : align;
      }
    }

    const tag = el.tagName;
    if (tag === 'B' || tag === 'STRONG') formats['bold'] = true;
    if (tag === 'I' || tag === 'EM') formats['italic'] = true;
    if (tag === 'U') formats['underline'] = true;
    if (tag === 'S' || tag === 'STRIKE') formats['strike'] = true;

    return formats;
  }

  /** Intercept Word / rich HTML paste so formatting is cleaned then kept. */
  private bindWordPasteHandler(): void {
    if (!this.quill) return;
    const root = this.quill.root;
    root.addEventListener(
      'paste',
      (ev: ClipboardEvent) => {
        const html = ev.clipboardData?.getData('text/html') || '';
        if (!html || !this.looksLikeRichOrWordHtml(html)) return;

        ev.preventDefault();
        ev.stopPropagation();

        const cleaned = this.cleanWordPasteHtml(html);
        if (!cleaned.trim()) return;

        const quill = this.quill!;
        const range = quill.getSelection(true);
        let index = range ? range.index : Math.max(0, quill.getLength() - 1);
        const length = range && range.length ? range.length : 0;
        if (length > 0) {
          quill.deleteText(index, length, 'user');
        }
        // Insert cleaned Word HTML through Quill clipboard (uses our style formats)
        quill.clipboard.dangerouslyPasteHTML(index, cleaned, 'user');
        this.form.bodyHtml = quill.root.innerHTML;
        this.refreshPrintPreview(false);
      },
      true,
    );
  }

  private looksLikeRichOrWordHtml(html: string): boolean {
    const h = String(html || '');
    if (!h.includes('<')) return false;
    return (
      /mso-|MsoNormal|xmlns:o=|xmlns:w=|WordDocument|office:word/i.test(h) ||
      /font-family\s*:/i.test(h) ||
      /font-size\s*:/i.test(h) ||
      /<span\b[^>]*style=/i.test(h) ||
      /<p\b[^>]*style=/i.test(h) ||
      /docs-internal-guid|Apple-converted-space/i.test(h)
    );
  }

  /** Strip Word junk; keep font/size/color/align/bold/tables/images. */
  private cleanWordPasteHtml(html: string): string {
    let h = String(html || '');
    h = h.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '');
    h = h.replace(/<!--[\s\S]*?-->/g, '');
    h = h.replace(/<\/?(?:xml|o:p|w:[^>\s]+)[^>]*>/gi, '');
    h = h.replace(/<style[\s\S]*?<\/style>/gi, '');
    h = h.replace(/<script[\s\S]*?<\/script>/gi, '');
    h = h.replace(/<meta[^>]*>/gi, '');
    h = h.replace(/<link[^>]*>/gi, '');

    try {
      const doc = new DOMParser().parseFromString(h, 'text/html');
      this.normalizeWordDom(doc.body);
      return doc.body.innerHTML;
    } catch (_) {
      return h;
    }
  }

  private normalizeWordDom(root: HTMLElement): void {
    const keepProps = new Set([
      'font-family',
      'font-size',
      'color',
      'background-color',
      'background',
      'text-align',
      'font-weight',
      'font-style',
      'text-decoration',
      'text-decoration-line',
      'line-height',
      'margin-left',
      'text-indent',
    ]);

    const walk = (node: Node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Drop Word helper tags
      if (tag === 'o:p' || tag === 'meta' || tag === 'link' || tag === 'script' || tag === 'style') {
        el.remove();
        return;
      }

      if (el.hasAttribute('style')) {
        const kept: string[] = [];
        const style = el.style;
        for (let i = 0; i < style.length; i++) {
          const prop = style.item(i);
          if (!keepProps.has(prop)) continue;
          let val = style.getPropertyValue(prop);
          if (!val) continue;
          if (prop === 'font-family') {
            const fam = this.normalizeFontFamily(val);
            if (!fam) continue;
            val = fam;
          }
          if (prop === 'font-size') {
            const sz = this.normalizeFontSize(val);
            if (!sz) continue;
            val = sz;
          }
          kept.push(`${prop}:${val}`);
        }
        if (kept.length) el.setAttribute('style', kept.join(';'));
        else el.removeAttribute('style');
      }

      // Drop Mso* classes — styles already captured
      if (el.className && /mso/i.test(String(el.className))) {
        el.removeAttribute('class');
      }

      // Convert bold/italic tags Word sometimes emits as font-weight on span
      Array.from(el.childNodes).forEach(walk);
    };

    Array.from(root.childNodes).forEach(walk);
  }

  private normalizeFontFamily(raw: string): string | null {
    if (!raw) return null;
    const first = raw
      .split(',')[0]
      .replace(/['"]/g, '')
      .trim();
    if (!first) return null;
    const lower = first.toLowerCase();
    const hit = QUILL_FONT_WHITELIST.find((f) => f.toLowerCase() === lower);
    if (hit) return hit;
    // Partial match e.g. "TimesNewRoman" / "times new roman"
    const compact = lower.replace(/\s+/g, '');
    const soft = QUILL_FONT_WHITELIST.find((f) => f.toLowerCase().replace(/\s+/g, '') === compact);
    return soft || null;
  }

  private normalizeFontSize(raw: string): string | null {
    if (!raw) return null;
    const m = String(raw)
      .trim()
      .match(/^([\d.]+)\s*(pt|px|em|rem)?$/i);
    if (!m) {
      // already like "12pt" with extra spaces
      const cleaned = String(raw).replace(/\s+/g, '').toLowerCase();
      const hit = QUILL_SIZE_WHITELIST.find((s) => s.toLowerCase() === cleaned);
      return hit || null;
    }
    let n = parseFloat(m[1]);
    let unit = (m[2] || 'px').toLowerCase();
    if (unit === 'em' || unit === 'rem') {
      n = n * 16;
      unit = 'px';
    }
    // Prefer pt for Word docs
    if (unit === 'px') {
      const asPt = Math.round((n * 0.75) * 2) / 2; // round to .0/.5
      const ptStr = `${asPt % 1 === 0 ? asPt.toFixed(0) : asPt}pt`;
      const exact = QUILL_SIZE_WHITELIST.find((s) => s.toLowerCase() === ptStr.toLowerCase());
      if (exact) return exact;
      // nearest pt
      const pts = QUILL_SIZE_WHITELIST.filter((s) => s.endsWith('pt')).map((s) => parseFloat(s));
      let best = pts[0];
      let bestDiff = Math.abs(best - asPt);
      for (const p of pts) {
        const d = Math.abs(p - asPt);
        if (d < bestDiff) {
          best = p;
          bestDiff = d;
        }
      }
      return `${best}pt`;
    }
    const ptVal = `${Math.round(n * 2) / 2}`.replace(/\.0$/, '');
    const candidate = `${ptVal}pt`;
    const hit = QUILL_SIZE_WHITELIST.find((s) => s.toLowerCase() === candidate.toLowerCase());
    if (hit) return hit;
    const pts = QUILL_SIZE_WHITELIST.filter((s) => s.endsWith('pt')).map((s) => parseFloat(s));
    let best = pts[0];
    let bestDiff = Math.abs(best - n);
    for (const p of pts) {
      const d = Math.abs(p - n);
      if (d < bestDiff) {
        best = p;
        bestDiff = d;
      }
    }
    return `${best}pt`;
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
      // Stay on Quill — try a simpler paste rather than switching editors
      try {
        this.quill.setText(safe.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '\n', 'silent');
        this.form.bodyHtml = this.quill.root.innerHTML;
      } catch (_) {
        this.notyf.error('Document load partially failed — try re-saving the template');
      }
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
    let out = String(html || '')
      .replace(/\scontenteditable\s*=\s*(["'])false\1/gi, ' contenteditable="true"')
      .replace(/\sunselectable\s*=\s*(["'])[^"']*\1/gi, '')
      .replace(/pointer-events\s*:\s*none\s*;?/gi, '')
      .replace(/user-select\s*:\s*none\s*;?/gi, '')
      .replace(/-webkit-user-modify\s*:\s*read-only\s*;?/gi, '');
    return this.collapseBlankParagraphs(out);
  }

  /**
   * Word often inserts many empty <p><br></p> / &nbsp; blocks between sections.
   * Those create huge white gaps AND a giant blue highlight when selecting text.
   */
  private collapseBlankParagraphs(html: string): string {
    let out = String(html || '');

    const emptyBlock =
      /<(p|div)\b([^>]*)>(?:\s|&nbsp;|\u00a0|<br\s*\/?>|<span\b[^>]*>\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*<\/span>)*<\/\1>/gi;

    // Mark empties, then collapse consecutive markers into one thin spacer
    out = out.replace(emptyBlock, '<!--HR_BLANK-->');
    out = out.replace(/(?:<!--HR_BLANK-->\s*)+/g, '<p class="hr-blank-gap"><br></p>');

    // Clamp oversized top/bottom margins that inflate select gaps
    out = out.replace(/style\s*=\s*(["'])(.*?)\1/gi, (_m, q: string, style: string) => {
      let s = String(style);
      const clamp = (prop: string, maxPt: number) => {
        s = s.replace(
          new RegExp(`(${prop})\\s*:\\s*(-?[\\d.]+)(pt|px|mm|em|rem)`, 'gi'),
          (_mm, p: string, num: string, unit: string) => {
            let pt = parseFloat(num) || 0;
            const u = unit.toLowerCase();
            if (u === 'px') pt *= 0.75;
            else if (u === 'mm') pt *= 2.83465;
            else if (u === 'em' || u === 'rem') pt *= 12;
            pt = Math.min(Math.max(pt, 0), maxPt);
            return `${p}:${pt.toFixed(1)}pt`;
          },
        );
      };
      clamp('margin-top', 8);
      clamp('margin-bottom', 8);
      clamp('padding-top', 6);
      clamp('padding-bottom', 6);
      return `style=${q}${s}${q}`;
    });

    return out;
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
    this.syncBodyAndPreview();
    this.updateFormatActive();
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
    // Don't overwrite a good multi-line selection with a collapsed caret (e.g. when Font dropdown takes focus)
    if (sel.isCollapsed && this.richSavedRange && !this.richSavedRange.collapsed) return;
    this.richSavedRange = range.cloneRange();
    this.updateFormatActive();
  }

  /** Read browser format state at caret so B/I/U/S buttons show on/off. */
  updateFormatActive(): void {
    if (!this.useRichEditor) return;
    try {
      this.formatActive = {
        bold: !!document.queryCommandState('bold'),
        italic: !!document.queryCommandState('italic'),
        underline: !!document.queryCommandState('underline'),
        strikeThrough: !!document.queryCommandState('strikeThrough'),
      };
    } catch (_) {}
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


  /** A4 height — used so on-screen page breaks push content onto the next page. */
  private readonly A4_PAGE_HEIGHT_MM = 297;

  /** Convert mm → CSS px in the current document (more accurate than a fixed dpi). */
  private cssMmToPx(mm: number): number {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;left:-9999px;top:0;height:${mm}mm;width:0;pointer-events:none;`;
    document.body.appendChild(probe);
    const px = probe.getBoundingClientRect().height;
    document.body.removeChild(probe);
    return px > 0 ? px : mm * (96 / 25.4);
  }

  /** Y offset of the caret inside the rich editor (relative to host top + scroll). */
  private getRichCaretTop(el: HTMLElement): number {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      return Math.max(0, el.scrollHeight - 1);
    }

    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);

    let top = 0;
    const rects = range.getClientRects();
    if (rects.length > 0) {
      top = rects[0].top;
    } else {
      const rect = range.getBoundingClientRect();
      if (rect.top || rect.height) {
        top = rect.top;
      } else {
        // Empty block / end of content — temporary marker, then restore selection
        const marker = document.createElement('span');
        marker.textContent = '\u200b';
        const live = sel.getRangeAt(0).cloneRange();
        live.collapse(true);
        live.insertNode(marker);
        top = marker.getBoundingClientRect().top;
        const parent = marker.parentNode;
        const after = document.createRange();
        after.setStartAfter(marker);
        after.collapse(true);
        parent?.removeChild(marker);
        parent?.normalize();
        try {
          sel.removeAllRanges();
          sel.addRange(after);
          this.richSavedRange = after.cloneRange();
        } catch (_) {}
      }
    }

    const elRect = el.getBoundingClientRect();
    return Math.max(0, top - elRect.top + el.scrollTop);
  }

  /**
   * Insert a real page break: fill remaining space on the current A4 page so
   * content after the caret starts on the next page. Uses insertHTML so Undo works.
   */
  insertPageBreak(): void {
    const el = this.getRichEl();
    if (!el) return;

    this.restoreRichSelection();
    el.focus();

    const pageH = this.cssMmToPx(this.A4_PAGE_HEIGHT_MM);
    const caretTop = this.getRichCaretTop(el);
    const posInPage = caretTop % pageH;
    const minGap = 56; // room for the "PAGE BREAK" label
    let spacerPx = Math.ceil(pageH - posInPage);
    // Near the bottom of a page → jump a full extra page so content clearly moves
    if (spacerPx < minGap) {
      spacerPx += Math.ceil(pageH);
    }
    spacerPx = Math.max(minGap, Math.min(spacerPx, Math.ceil(pageH + minGap)));

    // contenteditable=false keeps typing out of the spacer; height fills to next page.
    // Print path (normalizeHtmlForPrint) zeros height and keeps page-break-before.
    const html =
      `<div class="page-break" contenteditable="false" data-page-break="1" ` +
      `style="display:block;box-sizing:border-box;height:${spacerPx}px;` +
      `margin:0;padding:0;border:0;border-top:2px dashed #94a3b8;` +
      `page-break-before:always;break-before:page;"></div>` +
      `<p><br></p>`;

    this.insertHtmlAtCaret(html);
  }

  richCmd(command: string, value?: string): void {
    const el = this.getRichEl();
    if (!el) return;

    const inlineFmt = ['bold', 'italic', 'underline', 'strikeThrough'];
    const hadSelection = this.restoreRichSelection();
    // For indent/align/inline toggle, caret is enough — no need for a text selection
    if (!hadSelection && this.richSavedRange) {
      try {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(this.richSavedRange);
      } catch (_) {}
    }
    el.focus();

    let applied = false;
    try {
      // false = use <b>/<i>/<u> tags — more reliable for caret typing than CSS spans
      document.execCommand('styleWithCSS', false, 'false');
      applied = document.execCommand(command, false, value);
    } catch (e) {
      console.warn('richCmd execCommand failed', command, e);
    }

    // Selected text: if execCommand failed on complex Word HTML, wrap manually
    if (hadSelection && inlineFmt.includes(command) && !document.queryCommandState(command)) {
      if (command === 'underline') {
        this.wrapSelection('u') || this.wrapSelection('span', 'text-decoration: underline');
      } else if (command === 'bold' && !applied) {
        this.wrapSelection('strong') || this.wrapSelection('b');
      } else if (command === 'italic' && !applied) {
        this.wrapSelection('em') || this.wrapSelection('i');
      } else if (command === 'strikeThrough' && !applied) {
        this.wrapSelection('s') || this.wrapSelection('span', 'text-decoration: line-through');
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
    this.updateFormatActive();
    this.syncBodyAndPreview();
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
    const blocks = this.getSelectedBlocks();
    return blocks.length ? blocks[0] : null;
  }

  /** All block elements intersecting the current (or saved) selection. */
  private getSelectedBlocks(): HTMLElement[] {
    const el = this.getRichEl();
    const sel = window.getSelection();
    if (!el || !sel || !sel.rangeCount) return [];

    const range = sel.getRangeAt(0);
    const blockTags = new Set([
      'p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'blockquote',
    ]);

    const findBlock = (node: Node | null): HTMLElement | null => {
      let n: Node | null = node;
      if (n && n.nodeType === Node.TEXT_NODE) n = n.parentElement;
      while (n && n !== el) {
        if (n instanceof HTMLElement && blockTags.has(n.tagName.toLowerCase())) {
          // Prefer innermost content block, but skip the editor host itself
          return n;
        }
        n = n.parentNode;
      }
      return null;
    };

    // Collapsed caret → single block
    if (sel.isCollapsed) {
      const one = findBlock(range.startContainer);
      return one ? [one] : [];
    }

    const found = new Set<HTMLElement>();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (node: Node) => {
        try {
          const nr = document.createRange();
          if (node.nodeType === Node.TEXT_NODE) {
            if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
            nr.selectNodeContents(node);
          } else {
            nr.selectNode(node);
          }
          const intersects =
            range.compareBoundaryPoints(Range.END_TO_START, nr) < 0 &&
            range.compareBoundaryPoints(Range.START_TO_END, nr) > 0;
          return intersects ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        } catch {
          return NodeFilter.FILTER_REJECT;
        }
      },
    });

    let n: Node | null;
    while ((n = walker.nextNode())) {
      const block = findBlock(n);
      if (block && el.contains(block) && block !== el) found.add(block);
    }

    // Always include start/end blocks
    const startB = findBlock(range.startContainer);
    const endB = findBlock(range.endContainer);
    if (startB) found.add(startB);
    if (endB) found.add(endB);

    return Array.from(found);
  }

  insertVariable(key: string): void {
    const token = `{{${key}}}`;
    // Insert as bold so filled letter values stay emphasized
    if (this.useRichEditor) {
      const el = this.getRichEl();
      if (!el) {
        this.form.bodyHtml = (this.form.bodyHtml || '') + `<strong>${token}</strong>`;
        return;
      }
      this.insertHtmlAtCaret(`<strong>${token}</strong>&nbsp;`);
      return;
    }
    if (!this.quill) {
      this.form.bodyHtml = (this.form.bodyHtml || '') + `<strong>${token}</strong>`;
      this.refreshPrintPreview(false);
      return;
    }
    const range = this.quill.getSelection(true);
    const index = range ? range.index : this.quill.getLength();
    this.quill.insertText(index, token, { bold: true }, 'user');
    this.quill.setSelection(index + token.length, 0, 'user');
    this.form.bodyHtml = this.quill.root.innerHTML;
    this.refreshPrintPreview(false);
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
      html = this.collapseBlankParagraphs(html);

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
      // Always keep Quill editor (same as Add / Update)
      this.useRichEditor = false;

      // Letterhead decision:
      // - Word body/header already has logo image → blank (avoid double letterhead)
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

      setTimeout(() => {
        this.initEditor(html);
        setTimeout(() => {
          const shown = (this.quill?.getText() || '').replace(/\s+/g, '').trim();
          if (!shown && !/<img\b/i.test(html)) {
            this.notyf.error('Import ran but content did not render. Try another .docx (Save As in Word).');
          } else {
            const lhNote = this.letterheadMode === 'image'
              ? ' — company letterhead applied'
              : hasEmbeddedLetterhead
                ? ' — Word letterhead kept in document'
                : ' — no letterhead (upload one & select “Use uploaded letterhead”)';
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

  /** Always pull latest HTML from the live editor before save / preview (WYSIWYG). */
  private pullBodyFromEditor(): void {
    if (this.useRichEditor) {
      const el = this.getRichEl();
      if (el) this.form.bodyHtml = el.innerHTML;
      return;
    }
    // Prefer visible .ql-editor HTML so print preview matches what user sees
    const domEditor = document.querySelector(
      'app-document-template .dt-quill-wrap .ql-editor',
    ) as HTMLElement | null;
    if (domEditor?.innerHTML != null && String(domEditor.innerHTML).trim() !== '') {
      this.form.bodyHtml = domEditor.innerHTML;
      return;
    }
    if (this.quill?.root?.innerHTML) {
      this.form.bodyHtml = this.quill.root.innerHTML;
    }
  }

  save(): void {
    this.syncLetterheadMode();
    this.pullBodyFromEditor();

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

    // Prefer update whenever we have an id (avoids accidental create on edit)
    const isUpdate = !!(this.updateFlag || this.form?.id);
    if (isUpdate && !this.form?.id) {
      this.notyf.error('Template id missing — reopen and try again');
      return;
    }

    if (!this.form.assignAllBranches && !(this.form.branchIds || []).length) {
      this.notyf.error('Select at least one branch, or choose All branches');
      return;
    }

    const payload: any = {
      id: this.form.id,
      name: String(this.form.name).trim(),
      category: this.form.category || 'custom',
      bodyHtml: this.form.bodyHtml,
      letterheadBlank: !!this.form.letterheadBlank,
      includeSalaryAnnexure: !!this.form.includeSalaryAnnexure,
      status: this.form.status || 'active',
      assignAllBranches: !!this.form.assignAllBranches,
      branchIds: this.form.assignAllBranches ? [] : this.form.branchIds || [],
    };

    const req = isUpdate
      ? this.master.updateHrTemplate(payload)
      : this.master.createHrTemplate(payload);

    req.subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.notyf.success(res.message || (isUpdate ? 'Updated' : 'Saved'));
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
