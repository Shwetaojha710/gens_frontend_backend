import { hrPaginate, paginatorScriptTag } from './print-paginator';
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
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
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

/**
 * Durable vertical gap (signature blank lines). Survives Quill save/reload —
 * consecutive empty <p><br></p> alone often collapse on paste.
 */
class VerticalSpaceBlot extends BlockEmbed {
  static blotName = 'vspace';
  static tagName = 'div';
  static className = 'ql-spacer';

  static create(value: unknown): HTMLElement {
    const node = super.create() as HTMLElement;
    const em = Math.max(0.5, parseFloat(String(value ?? '')) || 1.85);
    node.setAttribute('contenteditable', 'false');
    node.setAttribute('data-vspace', String(em));
    node.setAttribute(
      'style',
      `display:block;height:${em}em;min-height:${em}em;line-height:${em}em;margin:0;padding:0;border:0;`,
    );
    node.innerHTML = '\u00a0';
    return node;
  }

  static value(node: HTMLElement): number {
    const fromData = parseFloat(node.getAttribute('data-vspace') || '');
    if (!Number.isNaN(fromData) && fromData > 0) return fromData;
    const m = String(node.getAttribute('style') || '').match(/height\s*:\s*([\d.]+)\s*em/i);
    const h = m ? parseFloat(m[1]) : NaN;
    return !Number.isNaN(h) && h > 0 ? h : 1.85;
  }
}

/** Inline font-size / font-family so Word paste (12pt, Times New Roman…) survives. */
const QUILL_SIZE_WHITELIST = [
  '8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '22pt', '24pt', '26pt', '28pt', '32pt', '36pt', '48pt', '72pt',
  '8px', '9px', '10px', '11px', '12px', '13px', '14px', '15px', '16px', '18px', '20px', '22px', '24px', '28px', '32px', '36px', '48px', '64px', '72px',
];
const QUILL_FONT_WHITELIST = [
  'Arial',
  'Arial Black',
  'Arial Narrow',
  'Book Antiqua',
  'Bookman Old Style',
  'Calibri',
  'Cambria',
  'Candara',
  'Century Gothic',
  'Comic Sans MS',
  'Consolas',
  'Constantia',
  'Corbel',
  'Courier',
  'Courier New',
  'Franklin Gothic Medium',
  'Garamond',
  'Georgia',
  'Helvetica',
  'Impact',
  'Lucida Console',
  'Lucida Sans',
  'Lucida Sans Unicode',
  'Microsoft Sans Serif',
  'Monaco',
  'Palatino',
  'Palatino Linotype',
  'Rockwell',
  'Segoe UI',
  'Tahoma',
  'Times',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
];
const QUILL_LINEHEIGHT_WHITELIST = ['1', '1.15', '1.5', '1.75', '2', '2.5'];
/** Paragraph spacing after each block (margin-bottom). Default in CSS = 5pt. */
const QUILL_PARASPACING_WHITELIST = [
  '0pt',
  '1pt',
  '2pt',
  '3pt',
  '4pt',
  '5pt',
  '6pt',
  '8pt',
  '10pt',
  '12pt',
  '14pt',
  '18pt',
  '24pt',
];
const DEFAULT_PARA_SPACING_PT = '5pt';

try {
  Quill.register(PageBreakBlot, true);
  Quill.register(VerticalSpaceBlot, true);

  const SizeStyle = Quill.import('attributors/style/size') as any;
  SizeStyle.whitelist = QUILL_SIZE_WHITELIST;
  Quill.register(SizeStyle, true);

  const FontStyle = Quill.import('attributors/style/font') as any;
  FontStyle.whitelist = QUILL_FONT_WHITELIST;
  Quill.register(FontStyle, true);

  // Inline color / highlight so print + save keep exact hex (not ql-color-* classes)
  const ColorStyle = Quill.import('attributors/style/color') as any;
  Quill.register(ColorStyle, true);
  const BackgroundStyle = Quill.import('attributors/style/background') as any;
  Quill.register(BackgroundStyle, true);

  // Block line-height (toolbar "Line" picker) — applied only when user selects
  const Parchment = Quill.import('parchment') as any;
  const LineHeightStyle = new Parchment.StyleAttributor('lineheight', 'line-height', {
    scope: Parchment.Scope.BLOCK,
    whitelist: QUILL_LINEHEIGHT_WHITELIST,
  });
  Quill.register(LineHeightStyle, true);

  // Paragraph spacing (margin-bottom) — toolbar "Space" picker; CSS default 5pt
  const ParaSpacingStyle = new Parchment.StyleAttributor('paragraphspacing', 'margin-bottom', {
    scope: Parchment.Scope.BLOCK,
    whitelist: QUILL_PARASPACING_WHITELIST,
  });
  Quill.register(ParaSpacingStyle, true);
} catch (_) {
  // already registered (HMR / re-init)
}

/** Boundary between two pages in the editor: bottom margin of page N, grey gap, top margin of page N+1. */
interface PageSeam {
  /** px from the top of the editor page */
  top: number;
  height: number;
  bottomPx: number;
  gapPx: number;
  topPx: number;
  /** number of the page that starts below this seam */
  page: number;
  lhFoot: boolean;
  lhHead: boolean;
  footHtml: SafeHtml | null;
  headHtml: SafeHtml | null;
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
  /** Sticky slot above A4 page — Quill toolbar is moved here after init. */
  @ViewChild('quillToolbarHost') quillToolbarHost?: ElementRef<HTMLDivElement>;
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
    /** null = auto; otherwise mm from page top to content */
    topPaddingMm: null as number | null,
    /** '1' | '2' | 'all' — print pages that show company letterhead */
    letterheadPages: 'all' as '1' | '2' | 'all',
    /** Letterhead logo band height (mm) */
    letterheadHeaderMm: 28,
    /** Letterhead address / GSTN band height (mm) */
    letterheadFooterMm: 40,
    /** Paper size — editor + print */
    pageSize: 'A4' as 'A4' | 'Letter' | 'Legal' | 'A5',
    /** Defaults restored on edit / used when body has no inline font */
    defaultFontFamily: 'Times New Roman',
    defaultFontSize: '12pt',
    includeSalaryAnnexure: false,
    status: 'active',
    branchIds: [] as string[],
    assignAllBranches: true,
    /** Custom running header / footer (see defaultHeaderFooter) */
    headerFooter: null as any,
  };

  /** Top space options (mm) — user can pick how much gap above content */
  topPadOptions = [0, 2, 4, 5, 8, 10, 12, 15, 18, 20, 22, 25, 28, 30, 35, 40];

  /** Letterhead header/footer band heights (mm) — 1mm steps for precise kam/zyada */
  lhBandOptions = Array.from({ length: 81 }, (_, i) => 10 + i); // 10 … 90

  readonly pageSizeOptions: { id: 'A4' | 'Letter' | 'Legal' | 'A5'; label: string; wMm: number; hMm: number }[] = [
    { id: 'A4', label: 'A4 (210×297 mm)', wMm: 210, hMm: 297 },
    { id: 'Letter', label: 'Letter (8.5×11 in)', wMm: 216, hMm: 279 },
    { id: 'Legal', label: 'Legal (8.5×14 in)', wMm: 216, hMm: 356 },
    { id: 'A5', label: 'A5 (148×210 mm)', wMm: 148, hMm: 210 },
  ];

  /** Font family list for Format bar + Quill toolbar */
  fontFamilyOptions = QUILL_FONT_WHITELIST;
  fontSizeOptions = QUILL_SIZE_WHITELIST.filter((s) => s.endsWith('pt'));

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
    this.clearAutoPageBreaks(true);
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
    if (this.letterheadMode === 'blank' || this.coerceLetterheadBlank(this.form?.letterheadBlank)) {
      return null;
    }
    return this.letterheadBase64 || this.letterheadUrl;
  }

  syncLetterheadMode(): void {
    this.form.letterheadBlank = this.letterheadMode === 'blank';
    if (!this.form.letterheadPages) this.form.letterheadPages = 'all';
    // Switching to uploaded letterhead — ensure image is loaded for editor bands
    if (this.letterheadMode === 'image' && !this.letterheadBase64 && !this.letterheadUrl) {
      this.loadLetterhead(() => {
        this.cdr.detectChanges();
        this.refreshPrintPreview(true);
      });
      return;
    }
    this.cdr.detectChanges();
    this.refreshPrintPreview(true);
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
      this.notyf.error('Place the cursor in the editor first');
      return;
    }
    if (!isColor && selection.isCollapsed) {
      this.notyf.error('Select some text first');
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
      this.notyf.error('Could not apply formatting');
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

  /**
   * Rich-editor paragraph spacing (margin after block). Prefer pt values (default 5pt).
   * Also accepts legacy px values from older toolbar options.
   */
  applyParagraphSpacing(value: string): void {
    if (!value) return;

    // Quill mode — use format attributor
    if (this.quill && !this.useRichEditor) {
      const pt = /pt$/i.test(value)
        ? value
        : /px$/i.test(value)
          ? `${Math.round(parseFloat(value) * 0.75)}pt`
          : `${parseFloat(value) || 5}pt`;
      this.applyQuillParagraphSpacing(pt);
      return;
    }

    const el = this.getRichEl();
    if (!el) return;

    if (!this.restoreRichSelection()) {
      el.focus();
    }

    const blocks = this.getSelectedBlocks();
    if (!blocks.length) {
      this.notyf.error('Click inside or select a paragraph first');
      return;
    }

    const spacing = /pt$/i.test(value)
      ? value
      : /px$/i.test(value)
        ? value
        : `${parseFloat(value) || 5}pt`;
    const tight = spacing === '0' || spacing === '0pt' || spacing === '0px';

    for (const block of blocks) {
      const text = (block.textContent || '').replace(/\u00a0/g, ' ').trim();
      const isBlank = !text;

      block.style.marginTop = '0';
      block.style.marginBottom = spacing;
      block.style.display = 'block';

      if (tight) {
        block.style.paddingTop = '0';
        block.style.paddingBottom = '0';
        block.style.minHeight = '0';
        block.style.height = '';

        if (isBlank) {
          block.classList.add('hr-blank-gap');
          block.style.lineHeight = '0.4';
          block.style.marginBottom = '0';
        } else {
          block.classList.remove('hr-blank-gap');
          block.style.lineHeight = block.style.lineHeight || '1.2';
          block.style.marginBottom = '0';
        }
      } else {
        block.classList.remove('hr-blank-gap');
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
      this.notyf.error('Click inside or select a paragraph first');
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
      this.notyf.error('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.notyf.error('Image must be smaller than 5 MB');
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
    if (this.quill && !this.useRichEditor) {
      this.insertQuillTable();
      return;
    }

    const size = this.promptTableSize();
    if (!size) return;
    const { rows, cols } = size;

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

  private promptTableSize(): { rows: number; cols: number } | null {
    const rowsRaw = window.prompt('Number of rows?', '3');
    if (rowsRaw == null) return null;
    const colsRaw = window.prompt('Number of columns?', '3');
    if (colsRaw == null) return null;
    return {
      rows: Math.min(20, Math.max(1, parseInt(rowsRaw, 10) || 3)),
      cols: Math.min(10, Math.max(1, parseInt(colsRaw, 10) || 3)),
    };
  }

  /** Insert table via Quill table module (toolbar Table button). */
  insertQuillTable(): void {
    if (!this.quill) return;
    const size = this.promptTableSize();
    if (!size) return;

    const tableModule = this.quill.getModule('table') as {
      insertTable?: (rows: number, cols: number) => void;
      getTable?: () => [any, any, any, number] | null;
    } | null;
    if (!tableModule?.insertTable) {
      this.notyf.error('Table tool is not available');
      return;
    }

    let range = this.quill.getSelection(true);
    if (!range) {
      const idx = Math.max(0, this.quill.getLength() - 1);
      this.quill.setSelection(idx, 0, 'silent');
      range = this.quill.getSelection(true);
    }
    if (!range) return;

    tableModule.insertTable(size.rows, size.cols);

    // Border + print classes so table shows like Word / rich-editor insert
    try {
      const [tableBlot] = tableModule.getTable?.() || [null];
      const el = tableBlot?.domNode as HTMLElement | undefined;
      if (el && el.tagName === 'TABLE') {
        el.classList.add('hr-doc-table', 'hr-doc-table-bordered');
        el.setAttribute('border', '1');
        el.setAttribute('cellpadding', '4');
        el.setAttribute('cellspacing', '0');
        const prev = el.getAttribute('style') || '';
        if (!/width\s*:/i.test(prev)) {
          el.setAttribute(
            'style',
            `${prev};width:100%;border-collapse:collapse;margin:8px 0;`.replace(/^;/, ''),
          );
        }
      }
    } catch (_) {}

    this.form.bodyHtml = this.quill.root.innerHTML;
    this.refreshPrintPreview(false);
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
    this.scheduleAutoPageBreaks();
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

  /* ---------- Word-like pages in the editor ---------- */

  /** Page boundaries drawn in the editor (same breaks as Print Preview / PDF). */
  autoBreaks: PageSeam[] = [];
  autoPageCount = 0;
  /** Editor page grows to whole pages so the last page looks complete. */
  autoFrameMinPx: number | null = null;
  /** Letterhead footer band at the document end only when the last page has letterhead. */
  autoLastPageLh = true;
  private readonly PAGE_GAP_PX = 16;
  private autoBreakTimer: any = null;
  private autoBreakToken = 0;
  private measureFrame: HTMLIFrameElement | null = null;
  /** Global <style> that pushes the first block of each page down to its page. */
  private pageFlowStyle: HTMLStyleElement | null = null;

  private scheduleAutoPageBreaks(): void {
    if (!this.createFlag) return;
    if (this.autoBreakTimer) clearTimeout(this.autoBreakTimer);
    this.autoBreakTimer = setTimeout(() => {
      this.autoBreakTimer = null;
      this.computeAutoPageBreaks();
    }, 400);
  }

  private clearAutoPageBreaks(removeFrame = false): void {
    if (this.autoBreakTimer) clearTimeout(this.autoBreakTimer);
    this.autoBreakTimer = null;
    this.autoBreakToken++;
    this.autoBreaks = [];
    this.autoPageCount = 0;
    this.autoFrameMinPx = null;
    this.autoLastPageLh = true;
    if (this.pageFlowStyle) this.pageFlowStyle.textContent = '';
    if (removeFrame) {
      this.measureFrame?.remove();
      this.measureFrame = null;
      this.pageFlowStyle?.remove();
      this.pageFlowStyle = null;
    }
  }

  /**
   * Lay the print HTML out in a hidden frame (same paginator as Print Preview / PDF),
   * then show the same pages in the editor.
   */
  private computeAutoPageBreaks(): void {
    if (!this.createFlag || typeof document === 'undefined') return;
    const html = this.buildPrintHtml(this.form.bodyHtml || '');
    if (!this.measureFrame || !this.measureFrame.isConnected) {
      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.style.cssText =
        'position:fixed;left:-20000px;top:0;width:1400px;height:900px;border:0;visibility:hidden;pointer-events:none;';
      document.body.appendChild(frame);
      this.measureFrame = frame;
    }
    const fdoc = this.measureFrame.contentDocument;
    if (!fdoc) return;
    const token = ++this.autoBreakToken;
    fdoc.open();
    fdoc.write(html);
    fdoc.close();
    const started = Date.now();
    const check = () => {
      if (token !== this.autoBreakToken) return;
      if (fdoc.body?.getAttribute('data-hr-paginated') !== '1') {
        if (Date.now() - started < 5000) setTimeout(check, 60);
        return;
      }
      this.layoutEditorPages(fdoc);
    };
    setTimeout(check, 20);
  }

  /** CSS selector for el (e.g. ".editor-frame .ql-editor > :nth-child(4) > :nth-child(2)"). */
  private cssPathFrom(root: HTMLElement, el: HTMLElement, rootSel: string): string | null {
    const parts: string[] = [];
    let node: HTMLElement | null = el;
    while (node && node !== root) {
      const parent: HTMLElement | null = node.parentElement;
      if (!parent) return null;
      parts.unshift(`:nth-child(${Array.prototype.indexOf.call(parent.children, node) + 1})`);
      node = parent;
    }
    return node === root && parts.length ? `${rootSel} > ${parts.join(' > ')}` : null;
  }

  /**
   * Word-like page view: find the editor block where each printed page starts, push it
   * to the top of that page (padding via a global stylesheet — the editor DOM itself is
   * never touched) and draw the page seam (margins, letterhead, header/footer, gap).
   */
  private layoutEditorPages(fdoc: Document): void {
    const pages = Array.from(fdoc.querySelectorAll<HTMLElement>('[data-hr-root] > .page'));
    const editorRoot: HTMLElement | undefined = this.useRichEditor
      ? this.richHost?.nativeElement
      : this.quill?.root;
    const frameEl = editorRoot?.closest('.editor-frame') as HTMLElement | null;
    if (!editorRoot || !frameEl || !pages.length) return;
    const rootSel = this.useRichEditor ? '.editor-frame .dt-rich-host' : '.editor-frame .ql-editor';

    if (!this.pageFlowStyle || !this.pageFlowStyle.isConnected) {
      this.pageFlowStyle = document.createElement('style');
      this.pageFlowStyle.setAttribute('data-hr-page-flow', '');
      document.head.appendChild(this.pageFlowStyle);
    }
    // Measure blocks at their natural position (no page spacing applied)
    this.pageFlowStyle.textContent = '';

    const pxPerMm = this.mmToPx(1);
    const pageH = this.pageDims.hMm * pxPerMm;
    const gap = this.PAGE_GAP_PX;
    const padPx = (page: HTMLElement, side: 'paddingTop' | 'paddingBottom') =>
      (parseFloat((page.querySelector('.page-body') as HTMLElement | null)?.style[side] || '0') || 0) *
      pxPerMm;

    const BLOCKS = 'p,h1,h2,h3,h4,h5,h6,li,tr,blockquote,pre,div';
    const leafBlocks = (root: ParentNode) =>
      Array.from(root.querySelectorAll<HTMLElement>(BLOCKS)).filter(
        (el) => !el.querySelector(BLOCKS),
      );
    const norm = (t: string | null) =>
      String(t || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. Editor block where each printed page (2…N) starts
    const candidates = leafBlocks(editorRoot);
    const frameTop = frameEl.getBoundingClientRect().top;
    const starts: { el: HTMLElement; top: number; index: number }[] = [];
    let ptr = 0;
    pages.slice(1).forEach((page, k) => {
      const body = page.querySelector('.page-body');
      if (!body) return;
      const first = leafBlocks(body).find((el) => norm(el.textContent).length > 0);
      const anchor = norm(first?.textContent ?? '').slice(0, 40);
      if (!anchor) return;
      for (let j = ptr; j < candidates.length; j++) {
        const t = norm(candidates[j].textContent);
        const hit =
          !!t &&
          (t.startsWith(anchor) || (t.length >= Math.min(anchor.length, 8) && anchor.startsWith(t)));
        if (hit) {
          ptr = j + 1;
          starts.push({ el: candidates[j], top: candidates[j].getBoundingClientRect().top - frameTop, index: k + 1 });
          return;
        }
      }
    });

    // 2. Push each page's first block down to where that page's text starts
    const rules: string[] = [];
    let shift = 0;
    for (const st of starts) {
      const target = st.index * (pageH + gap) + padPx(pages[st.index], 'paddingTop');
      const extra = Math.round(target - (st.top + shift));
      const sel = this.cssPathFrom(editorRoot, st.el, rootSel);
      if (!sel || extra <= 0) continue;
      const isRow = st.el.tagName === 'TR';
      const cell = (isRow ? st.el.firstElementChild : st.el) as HTMLElement | null;
      const base = cell ? parseFloat(getComputedStyle(cell).paddingTop) || 0 : 0;
      rules.push(
        isRow
          ? `${sel} > td, ${sel} > th { padding-top: ${base + extra}px !important; }`
          : `${sel} { padding-top: ${base + extra}px !important; }`,
      );
      shift += extra;
    }
    this.pageFlowStyle.textContent = rules.join('\n');

    // 3. Seams between pages: bottom margin (+ letterhead footer / footer text), gap, next top margin
    const trust = (el: Element | null) =>
      el ? this.sanitizer.bypassSecurityTrustHtml(el.outerHTML) : null;
    const seams: PageSeam[] = [];
    for (let i = 1; i < pages.length; i++) {
      const prev = pages[i - 1];
      const next = pages[i];
      const bottomPx = padPx(prev, 'paddingBottom');
      const topPx = padPx(next, 'paddingTop');
      seams.push({
        top: (i - 1) * (pageH + gap) + pageH - bottomPx,
        height: bottomPx + gap + topPx,
        bottomPx,
        gapPx: gap,
        topPx,
        page: i + 1,
        lhFoot: prev.classList.contains('page--lh'),
        lhHead: next.classList.contains('page--lh'),
        footHtml: trust(prev.querySelector('.page-hf--footer')),
        headHtml: trust(next.querySelector('.page-hf--header')),
      });
    }
    this.autoBreaks = seams;
    this.autoPageCount = pages.length;
    this.autoFrameMinPx = Math.ceil(pages.length * pageH + (pages.length - 1) * gap);
    this.autoLastPageLh = pages[pages.length - 1].classList.contains('page--lh');
    this.cdr.detectChanges();
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
      this.notyf.error('Popup blocked — allow popups to print');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Print once the paginator has laid out the pages (or after 4s as a fallback)
    const started = Date.now();
    const tryPrint = () => {
      const ready = w.document?.body?.getAttribute('data-hr-paginated') === '1';
      if (!ready && Date.now() - started < 4000) {
        setTimeout(tryPrint, 100);
        return;
      }
      try {
        w.focus();
        w.print();
      } catch (_) {}
    };
    setTimeout(tryPrint, 150);
  }

  /** Export current editor HTML as PDF (same layout as Print Preview). */
  async exportAsPdf(): Promise<void> {
    this.pullBodyFromEditor();
    const html = this.buildPrintHtml(this.form.bodyHtml || '');
    const plain = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!plain) {
      this.notyf.error('Document body is empty');
      return;
    }
    try {
      const html2pdfMod: any = await import('html2pdf.js');
      const html2pdf = html2pdfMod.default ?? html2pdfMod;
      const dims = this.pageDims;
      const host = document.createElement('div');
      host.className = 'hr-pdf-host';
      host.style.cssText = `position:fixed;left:-10000px;top:0;width:${dims.wMm}mm;`;
      host.innerHTML = html; // <script> doesn't run via innerHTML — paginate here instead
      document.body.appendChild(host);
      await Promise.all(
        Array.from(host.querySelectorAll('img')).map((img) =>
          img.complete ? Promise.resolve() : img.decode().catch(() => undefined),
        ),
      );
      hrPaginate(host.querySelector('[data-hr-root]'), this.lastPaginateCfg || {});
      const name = (this.form.name || 'document').replace(/[^\w\-]+/g, '_').slice(0, 60);
      await html2pdf()
        .set({
          margin: 0,
          filename: `${name}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: [dims.wMm, dims.hMm], orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], before: '.page-break' },
        })
        .from(host)
        .save();
      document.body.removeChild(host);
      this.notyf.success('PDF downloaded');
    } catch (err) {
      console.error('exportAsPdf', err);
      this.notyf.error('PDF export failed');
    }
  }

  /** Export current editor content as .docx (fonts/bold/align/headings/breaks preserved best-effort). */
  async exportAsDocx(): Promise<void> {
    this.pullBodyFromEditor();
    const raw = String(this.form.bodyHtml || '').trim();
    if (!raw.replace(/<[^>]+>/g, '').replace(/\s+/g, '').trim()) {
      this.notyf.error('Document body is empty');
      return;
    }
    try {
      const blob = await this.htmlToDocxBlob(raw);
      const name = (this.form.name || 'document').replace(/[^\w\-]+/g, '_').slice(0, 60);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      this.notyf.success('DOCX downloaded');
    } catch (err) {
      console.error('exportAsDocx', err);
      this.notyf.error('DOCX export failed');
    }
  }

  /** Best-effort HTML → DOCX using the installed `docx` package. */
  private async htmlToDocxBlob(html: string): Promise<Blob> {
    const docxMod: any = await import('docx');
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      AlignmentType,
      HeadingLevel,
      PageBreak,
      Table,
      TableRow,
      TableCell,
      WidthType,
      Header,
      Footer,
      PageNumber,
    } = docxMod;

    const alignOf = (attrs: string) => {
      if (/text-align\s*:\s*center|ql-align-center|hr-align-center/i.test(attrs)) {
        return AlignmentType.CENTER;
      }
      if (/text-align\s*:\s*right|ql-align-right|hr-align-right/i.test(attrs)) {
        return AlignmentType.RIGHT;
      }
      if (/text-align\s*:\s*justify|ql-align-justify|hr-align-justify/i.test(attrs)) {
        return AlignmentType.JUSTIFIED;
      }
      return AlignmentType.LEFT;
    };

    const parseRuns = (inner: string): any[] => {
      const runs: any[] = [];
      const parts = String(inner || '').split(/(<br\s*\/?>)/gi);
      for (const part of parts) {
        if (/^<br\s*\/?>$/i.test(part)) {
          runs.push(new TextRun({ break: 1 }));
          continue;
        }
        const tmp = document.createElement('div');
        tmp.innerHTML = part;
        const walk = (node: Node, fmt: { bold?: boolean; italics?: boolean; underline?: any; font?: string; size?: number }) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const t = node.textContent || '';
            if (!t) return;
            runs.push(
              new TextRun({
                text: t,
                bold: !!fmt.bold,
                italics: !!fmt.italics,
                underline: fmt.underline,
                font: fmt.font || 'Times New Roman',
                size: fmt.size || 24, // half-points (12pt)
              }),
            );
            return;
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();
          const style = el.getAttribute('style') || '';
          const next = { ...fmt };
          if (tag === 'strong' || tag === 'b') next.bold = true;
          if (tag === 'em' || tag === 'i') next.italics = true;
          if (tag === 'u') next.underline = {};
          const ff = style.match(/font-family\s*:\s*([^;]+)/i)?.[1]?.replace(/['"]/g, '').split(',')[0]?.trim();
          const fs = style.match(/font-size\s*:\s*([\d.]+)\s*pt/i)?.[1];
          if (ff) next.font = ff;
          if (fs) next.size = Math.round(parseFloat(fs) * 2);
          Array.from(el.childNodes).forEach((c) => walk(c, next));
        };
        Array.from(tmp.childNodes).forEach((c) => walk(c, {}));
      }
      return runs.length ? runs : [new TextRun({ text: '' })];
    };

    const children: any[] = [];
    const blockRe =
      /<(p|h1|h2|h3|h4|h5|h6|div|table)(\b[^>]*)>([\s\S]*?)<\/\1>/gi;
    let m: RegExpExecArray | null;
    const src = html;
    while ((m = blockRe.exec(src))) {
      const full = m[0];
      if (/page-break|data-page-break/i.test(full)) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
        continue;
      }
      const tag = (m[1] || 'p').toLowerCase();
      const attrs = m[2] || '';
      const inner = m[3] || '';
      if (tag === 'table') {
        const rows: any[] = [];
        const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
        let rm: RegExpExecArray | null;
        while ((rm = rowRe.exec(inner))) {
          const cells: any[] = [];
          const cellRe = /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;
          let cm: RegExpExecArray | null;
          while ((cm = cellRe.exec(rm[1]))) {
            cells.push(
              new TableCell({
                children: [
                  new Paragraph({
                    children: parseRuns(cm[2]),
                  }),
                ],
                width: { size: 2250, type: WidthType.DXA },
              }),
            );
          }
          if (cells.length) rows.push(new TableRow({ children: cells }));
        }
        if (rows.length) {
          children.push(
            new Table({
              rows,
              width: { size: 9026, type: WidthType.DXA },
            }),
          );
        }
        continue;
      }
      if (tag === 'div' && !inner.replace(/<[^>]+>/g, '').trim()) continue;

      const heading =
        tag === 'h1'
          ? HeadingLevel.HEADING_1
          : tag === 'h2'
            ? HeadingLevel.HEADING_2
            : tag === 'h3'
              ? HeadingLevel.HEADING_3
              : undefined;

      children.push(
        new Paragraph({
          children: parseRuns(inner),
          alignment: alignOf(attrs),
          heading,
          spacing: { after: 120 },
        }),
      );
    }

    if (!children.length) {
      children.push(new Paragraph({ children: [new TextRun({ text: plainTextFromHtml(html) })] }));
    }

    function plainTextFromHtml(h: string): string {
      const d = document.createElement('div');
      d.innerHTML = h;
      return d.textContent || '';
    }

    // Custom header / footer → native Word header/footer (page numbers as Word fields)
    const hf = this.form?.headerFooter;
    const hfAlign = (a: string) =>
      a === 'left' ? AlignmentType.LEFT : a === 'right' ? AlignmentType.RIGHT : AlignmentType.CENTER;
    const hfParagraphs = (part: any): any[] => {
      const size = Math.round((parseFloat(part.fontSize) || 10) * 2); // half-points
      const text = String(part.text || '').trim();
      const lines = text ? text.split(/\r?\n/) : [];
      const paras = lines.map(
        (line) =>
          new Paragraph({
            alignment: hfAlign(part.align),
            children: [new TextRun({ text: line, size, bold: !!part.bold })],
          }),
      );
      if (part.pageNumber) {
        paras.push(
          new Paragraph({
            alignment: hfAlign(part.align),
            children: [
              new TextRun({
                children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                size,
                bold: !!part.bold,
              }),
            ],
          }),
        );
      }
      return paras;
    };
    const hfSection: any = {};
    if (this.hfActive()) {
      const head = this.hfPartActive(hf.header) ? new Header({ children: hfParagraphs(hf.header) }) : null;
      const foot = this.hfPartActive(hf.footer) ? new Footer({ children: hfParagraphs(hf.footer) }) : null;
      const blankHead = new Header({ children: [new Paragraph({})] });
      const blankFoot = new Footer({ children: [new Paragraph({})] });
      if (hf.pages === 'all') {
        if (head) hfSection.headers = { default: head };
        if (foot) hfSection.footers = { default: foot };
      } else {
        // Word "different first page": first-only or all-except-first
        const firstOnly = hf.pages === 'first';
        hfSection.titlePage = true;
        if (head) {
          hfSection.headers = firstOnly
            ? { first: head, default: blankHead }
            : { first: blankHead, default: head };
        }
        if (foot) {
          hfSection.footers = firstOnly
            ? { first: foot, default: blankFoot }
            : { first: blankFoot, default: foot };
        }
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            titlePage: !!hfSection.titlePage,
            page: {
              size: { width: 11906, height: 16838 }, // A4 DXA
              // Extra top/bottom room so body text clears the header/footer
              margin: {
                top: hfSection.headers ? 1200 : 720,
                right: 720,
                bottom: hfSection.footers ? 1200 : 720,
                left: 720,
                header: 400,
                footer: 400,
              },
            },
          },
          headers: hfSection.headers,
          footers: hfSection.footers,
          children,
        },
      ],
    });
    return await Packer.toBlob(doc);
  }

  /**
   * Full printable HTML — match what the editor shows (WYSIWYG).
   * Page breaks → separate A4 sheets in on-screen preview.
   */
  private buildPrintHtml(bodyHtml: string): string {
    // Always use live editor DOM so print = what user sees
    this.pullBodyFromEditor();
    const raw = String(bodyHtml || this.form.bodyHtml || '');
    const fromQuill =
      !this.useRichEditor ||
      /class=["'][^"']*\bql-(?:align|size|font|indent|direction)-/i.test(raw);

    let filled = fromQuill
      ? this.normalizeQuillHtmlForPrint(raw)
      : this.normalizeHtmlForPrint(raw);
    if (!fromQuill) {
    filled = this.wrapTrailingFooterForPrint(filled);
    }
    // With company letterhead, drop Word's leftover blank lines under the logo
    if (this.letterheadMode === 'image' && this.pageBackground) {
      filled = this.stripLeadingBlankBlocks(filled, 16);
    }

    const useImage = this.letterheadMode === 'image' && !!this.pageBackground;
    const letterheadBlank = this.letterheadMode === 'blank' || !!this.form.letterheadBlank;
    // Match editor-frame modifiers only — do NOT infer from HTML (text-align etc.)
    // or print gets 14mm pad while Quill editor stays 18mm (wider text / tighter look).
    const hasImportedLayout = !!(this.importedLayout || this.useRichEditor);

    const bodyPadX = hasImportedLayout ? '14mm' : '18mm';
    const bodyPadTopPlain = this.topPadCss;
    const bodyPadBottomPlain = hasImportedLayout ? '14mm' : letterheadBlank ? '18mm' : '22mm';
    const bgUrl = useImage ? String(this.pageBackground).replace(/'/g, '%27') : '';
    const lhMax = this.letterheadPageLimit(); // Infinity for all

    // One .page per manual page-break sheet. The embedded paginator (print-paginator.ts)
    // measures the rendered content and auto-breaks it into pages of the selected size,
    // adding letterhead / header / footer / page numbers per page.
    const rawSheets = this.splitHtmlByPageBreaks(filled);
    const lhHead = this.effectiveLhHeaderMm;
    const lhFoot = this.effectiveLhFooterMm;
    const paginateCfg = {
      useImage: useImage && !!bgUrl,
      lhMax: Number.isFinite(lhMax) ? lhMax : 9999,
      lhHead,
      lhFoot,
      lhTopPad: this.effectiveTopPadMm,
      plainTop: this.effectiveTopPadMm,
      plainBottom: parseFloat(bodyPadBottomPlain),
      padX: bodyPadX,
      hf: this.hfPaginateCfg(bodyPadX),
    };
    this.lastPaginateCfg = paginateCfg;
    const pagesHtml = rawSheets
      .map(
        (chunk, i) =>
          `<div class="page page--plain" data-sheet="${i}">` +
          `<div class="page-body ql-editor" style="padding:${bodyPadTopPlain} ${bodyPadX} ${bodyPadBottomPlain};">${chunk}</div></div>`,
      )
      .join('\n');

    const dims = this.pageDims;
    const pageW = `${dims.wMm}mm`;
    const pageH = `${dims.hMm}mm`;
    const defFont = (this.form?.defaultFontFamily || 'Times New Roman').replace(/"/g, '');
    const defSize = this.normalizeFontSizeToken(this.form?.defaultFontSize);

    // Mirror saved template defaults (so edit reopens with the same font/size/page)
    const bodyTypeCss = `
  body {
    font-family: "${defFont}", Arial, sans-serif;
    font-size: ${defSize};
    line-height: 1.15;
    color: #000;
  }
  .page-body.ql-editor,
  .page-body {
    font-family: "${defFont}", Arial, sans-serif;
    font-size: ${defSize};
    line-height: 1.15;
    color: #000;
    overflow-wrap: anywhere;
    word-wrap: break-word;
    white-space: pre-wrap;
  }
  /* Default paragraph spacing 5pt — inline margin-bottom from toolbar wins */
  .page-body p,
  .page-body ol,
  .page-body ul,
  .page-body pre,
  .page-body blockquote,
  .page-body h1, .page-body h2, .page-body h3,
  .page-body h4, .page-body h5, .page-body h6 {
    margin: 0;
    margin-bottom: 5pt;
    padding: 0;
  }
  .page-body li { margin-bottom: 0; }
  /* Empty Enter-lines must keep a full line box (same as Quill) */
  .page-body p:empty,
  .page-body p:has(> br:only-child) {
    min-height: 1.375em;
  }
  .page-body .ql-spacer,
  .page-body div[data-vspace] {
    display: block;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .page-body table {
    width: 100% !important;
    border-collapse: collapse;
    table-layout: auto;
    margin: 0;
  }
  .page-body table td,
  .page-body table th {
    vertical-align: top;
    width: auto;
    padding: 2px 4px;
  }
  .page-body table.hr-sig-table td {
    width: 50%;
  }
  .page-body h1 { font-size: 2em; }
  .page-body h2 { font-size: 1.5em; }
  .page-body h3 { font-size: 1.17em; }
  .ql-size-small { font-size: 0.75em; }
  .ql-size-large { font-size: 1.5em; }
  .ql-size-huge { font-size: 2.5em; }
  .ql-font-serif { font-family: Georgia, 'Times New Roman', serif; }
  .ql-font-monospace { font-family: Monaco, 'Courier New', monospace; }
  /* Bold / italic / underline / strike — same as editor */
  .page-body strong, .page-body b { font-weight: 700 !important; }
  .page-body em, .page-body i { font-style: italic !important; }
  .page-body u { text-decoration: underline !important; }
  .page-body s, .page-body strike, .page-body del { text-decoration: line-through !important; }
  /* Quill snow color classes (fallback if not inlined) */
  .ql-color-white { color: #fff !important; }
  .ql-color-red { color: #e60000 !important; }
  .ql-color-orange { color: #f90 !important; }
  .ql-color-yellow { color: #ff0 !important; }
  .ql-color-green { color: #008a00 !important; }
  .ql-color-blue { color: #06c !important; }
  .ql-color-purple { color: #93f !important; }
  .ql-bg-black { background-color: #000 !important; }
  .ql-bg-red { background-color: #e60000 !important; }
  .ql-bg-orange { background-color: #f90 !important; }
  .ql-bg-yellow { background-color: #ff0 !important; }
  .ql-bg-green { background-color: #008a00 !important; }
  .ql-bg-blue { background-color: #06c !important; }
  .ql-bg-purple { background-color: #93f !important; }
  /* Keep inline color / highlight exactly as editor (never force black on spans) */
  .page-body span[style*="color"],
  .page-body span[style*="background"],
  .page-body strong[style*="color"],
  .page-body b[style*="color"],
  .page-body font[color],
  .page-body [style*="color:"],
  .page-body [style*="background-color"],
  .page-body [style*="background:"] {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  [class*="ql-indent"] { padding-left: 0 !important; margin-left: 0 !important; }
  .page-body p, .page-body div, .page-body h1, .page-body h2, .page-body h3,
  .page-body h4, .page-body h5, .page-body h6, .page-body span, .page-body li {
    margin-left: 0 !important;
    text-indent: 0 !important;
  }
  .page-body p, .page-body h1, .page-body h2, .page-body h3,
  .page-body h4, .page-body h5, .page-body h6 {
    padding-left: 0 !important;
  }
  .ql-direction-rtl { direction: rtl; text-align: inherit; }
  blockquote { margin: 0; padding: 0; border: 0; }
`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Print Preview</title>
<style>
  @page { size: ${dims.id}; margin: 0; }
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
  /* Every page is a fixed sheet of the selected paper size (auto-paginated) */
  .page {
    width: ${pageW}; height: ${pageH}; box-sizing: border-box;
    margin: 0; padding: 0; background-color: #fff; overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.22); position: relative;
  }
  /* Letterhead viewports — pinned to top / bottom of selected page size */
  .page-lh-header, .page-lh-footer {
    position: absolute; left: 0; right: 0; z-index: 0;
    pointer-events: none;
    background-image: url('${bgUrl}');
    background-repeat: no-repeat;
    background-size: ${pageW} ${pageH};
  }
  .page-lh-header {
    top: 0; height: ${lhHead}mm;
    background-position: top center;
  }
  .page-lh-footer {
    bottom: 0; height: ${lhFoot}mm;
    background-position: bottom center;
  }
  /* Opaque white between logo & address so mid-letterhead never shows through */
  .page-lh-mask {
    position: absolute; left: 0; right: 0; z-index: 0;
    top: ${lhHead}mm;
    bottom: ${lhFoot}mm;
    background: #fff;
    pointer-events: none;
  }
  .page > .page-body {
    position: relative; z-index: 1;
    box-sizing: border-box;
    height: 100%;
    overflow: hidden !important;
    background: transparent;
    margin: 0;
  }
  .page-hf {
    position: absolute; left: 0; right: 0; z-index: 2; box-sizing: border-box;
    font-family: "${defFont}", Arial, sans-serif;
    line-height: 1.25; color: #000; white-space: normal; pointer-events: none;
  }
  /* PDF export renders this in the app page — no gaps so sheets line up with PDF pages */
  .hr-pdf-host .sheet-wrap { padding: 0 !important; gap: 0 !important; background: #fff; }
  .hr-pdf-host .page { box-shadow: none !important; }
  .page-body { display: block; }
  img {
    max-width: 100% !important; height: auto !important; display: inline-block;
    page-break-inside: avoid !important; break-inside: avoid !important;
  }
  /* Match editor table/list spacing (no print-only extra margins) */
  table, .hr-doc-table { width: 100%; border-collapse: collapse; margin: 0; border: none; }
  td, th { border: none; padding: 2px 4px; vertical-align: top; }
  table.hr-doc-table-bordered td, table.hr-doc-table-bordered th,
  table[border]:not([border="0"]) td, table[border]:not([border="0"]) th { border: 1px solid #000; padding: 4px 6px; }
  ul, ol, .hr-doc-ul, .hr-doc-ol {
    display: block; padding-left: 1.4em !important; margin: 0.4em 0;
    list-style-position: outside;
  }
  ol, .hr-doc-ol { list-style-type: decimal !important; }
  ul, .hr-doc-ul { list-style-type: disc !important; }
  li { display: list-item !important; margin: 0; }
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
  .hr-imported-doc { font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; color: #000; }
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
    html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
    .sheet-wrap { padding: 0 !important; gap: 0 !important; margin: 0 !important; }
    .page {
      box-shadow: none !important; width: ${pageW} !important;
      height: ${pageH} !important; min-height: 0 !important; max-height: ${pageH} !important;
      overflow: hidden !important;
      margin: 0 !important; page-break-after: always; break-after: page;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .page-lh-header, .page-lh-footer, .page-lh-mask {
      -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
    }
    .page:last-child { page-break-after: auto; break-after: auto; }
    .hr-print-footer { page-break-inside: avoid !important; break-inside: avoid !important; }
    [class*="ql-indent"] { padding-left: 0 !important; margin-left: 0 !important; }
    .page-body p, .page-body div { margin-left: 0 !important; text-indent: 0 !important; padding-left: 0 !important; }
  }
</style></head><body spellcheck="false">
<div class="sheet-wrap" data-hr-root>${pagesHtml}</div>
${paginatorScriptTag(paginateCfg)}
</body></html>`;
  }

  /**
   * Remove accidental left indent (Word / Quill Tab / leading &nbsp; inside spans).
   * Print + editor must stay flush left like headings.
   */
  private stripDefaultTabIndent(html: string): string {
    let out = String(html || '');

    // Any Quill indent level (1 tab, 2 tabs, …)
    out = out.replace(/\bql-indent-\d+\b/gi, '');
    out = out.replace(/\sclass=(["'])\s*\1/gi, '');

    // Drop left indent styles entirely on body content (keep list padding via CSS only)
    out = out.replace(/style\s*=\s*(["'])(.*?)\1/gi, (_m, q: string, style: string) => {
      let s = String(style)
        .replace(/margin-left\s*:\s*[^;]+;?/gi, '')
        .replace(/padding-left\s*:\s*[^;]+;?/gi, '')
        .replace(/text-indent\s*:\s*[^;]+;?/gi, '')
        .replace(/;;+/g, ';')
        .replace(/^;|;$/g, '')
        .trim();
      return s ? `style=${q}${s}${q}` : '';
    });
    out = out.replace(/\sstyle=(["'])\s*\1/gi, '');

    // Leading spaces / &nbsp; / tabs right after <p> or after opening inline tags
    const leadWs = '(?:&nbsp;|\\u00a0|&#160;|&#xA0;|\\t| |\\u2003|\\u2002){1,24}';
    out = out.replace(
      new RegExp(`<(p|h[1-6]|div|li|td|th)(\\b[^>]*)>${leadWs}`, 'gi'),
      '<$1$2>',
    );
    out = out.replace(
      new RegExp(
        `<(p|h[1-6]|li|td|th)(\\b[^>]*)>((?:<(?:strong|b|em|i|u|span|a|font)\\b[^>]*>)+)${leadWs}`,
        'gi',
      ),
      '<$1$2>$3',
    );

    // Unwrap empty blockquotes Quill sometimes wraps around indented paras
    out = out.replace(/<blockquote[^>]*>\s*/gi, '').replace(/\s*<\/blockquote>/gi, '');

    return out;
  }

  /**
   * Light print normalize — keep HTML as editor shows it (WYSIWYG).
   * Only fix page-breaks, strip fake tab-indent, flatten Word vertical margins.
   */
  private preserveSpacingInHtml(html: string): string {
    let out = this.stripDefaultTabIndent(html);
    const PAGE_BREAK_MARK = '<div class="page-break" data-page-break="1"></div>';
    out = out.replace(
      /<div\b[^>]*(?:class\s*=\s*["'][^"']*page-break[^"']*["']|data-page-break\s*=)[^>]*\/?>(?:[\s\S]*?<\/div>)?/gi,
      PAGE_BREAK_MARK,
    );
    out = out.replace(
      /<(?:div|p)\b[^>]*class=["'][^"']*\bpage-break\b[^"']*["'][^>]*>\s*(?:<br\s*\/?>)?\s*<\/(?:div|p)>/gi,
      PAGE_BREAK_MARK,
    );

    // Keep vertical spacing that editor shows (inline margin beats CSS margin:0).
    // Only drop absolute Word line-height pt/px that create giant line boxes.
    out = out.replace(/style\s*=\s*(["'])(.*?)\1/gi, (_m, q: string, style: string) => {
      const rawStyle = String(style);
      if (/height\s*:\s*[\d.]+em/i.test(rawStyle) && /min-height/i.test(rawStyle)) {
        return `style=${q}${rawStyle}${q}`;
      }
      let s = rawStyle
        .replace(/line-height\s*:\s*[\d.]+(?:pt|px)\s*;?/gi, '')
        .replace(/;;+/g, ';')
        .replace(/^;|;$/g, '')
        .trim();
      return s ? `style=${q}${s}${q}` : '';
    });
    out = out.replace(/\sstyle=(["'])\s*\1/gi, '');

    // Side-by-side signature rows
    out = this.pairSignatureColumnsForPrint(out);

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

    // Leading indent spaces only (keep mid-sentence double spaces as nbsp)
    out = out.replace(/>([^<]+)</g, (_m, text: string) => {
      const trimmedLead = String(text).replace(/^[\s\u00a0\t]+/, '');
      const fixed = trimmedLead.replace(/ {2,}/g, (spaces: string) =>
        '&nbsp;'.repeat(spaces.length),
      );
      return `>${fixed}<`;
    });

    return this.stripDefaultTabIndent(out);
  }

  /**
   * Print path — keep editor HTML almost verbatim (WYSIWYG).
   * Only canonicalize page-breaks for sheet split; do NOT strip margins/empty lines.
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
    // Keep unitless toolbar line-height; drop only absolute Word pt/px line boxes
    out = out.replace(/style\s*=\s*(["'])(.*?)\1/gi, (_m, q: string, style: string) => {
      let s = String(style)
        .replace(/line-height\s*:\s*[\d.]+(?:pt|px)\s*;?/gi, '')
        .replace(/;;+/g, ';')
        .replace(/^;|;$/g, '')
        .trim();
      return s ? `style=${q}${s}${q}` : '';
    });
    out = out.replace(/\sstyle=(["'])\s*\1/gi, '');
    // Bold / color / highlight must survive print iframe (no quill.snow.css there)
    out = this.inlineQuillFormatClassesForPrint(out);
    return out;
  }

  /**
   * Quill snow stores some colors as .ql-color-red / .ql-bg-yellow — print HTML
   * has no snow.css, so bake those into inline style. Also harden <strong>/<b>.
   */
  private inlineQuillFormatClassesForPrint(html: string): string {
    const COLOR: Record<string, string> = {
      white: '#fff',
      red: '#e60000',
      orange: '#f90',
      yellow: '#ff0',
      green: '#008a00',
      blue: '#06c',
      purple: '#93f',
      black: '#000',
    };
    const BG: Record<string, string> = {
      black: '#000',
      red: '#e60000',
      orange: '#f90',
      yellow: '#ff0',
      green: '#008a00',
      blue: '#06c',
      purple: '#93f',
      white: '#fff',
    };

    let out = String(html || '');

    // <span class="ql-color-red ql-bg-yellow">… → inline style
    out = out.replace(
      /<([a-z][a-z0-9]*)\b([^>]*\bclass\s*=\s*["'][^"']*\bql-(?:color|bg)-[^"']*["'][^>]*)>/gi,
      (_m, tag: string, attrs: string) => {
        let a = attrs;
        const extras: string[] = [];
        a = a.replace(/\bql-color-([a-z0-9#-]+)\b/gi, (_c, name: string) => {
          const hex = COLOR[name.toLowerCase()] || (/^#/.test(name) ? name : null);
          if (hex) extras.push(`color:${hex}`);
          return '';
        });
        a = a.replace(/\bql-bg-([a-z0-9#-]+)\b/gi, (_c, name: string) => {
          const hex = BG[name.toLowerCase()] || (/^#/.test(name) ? name : null);
          if (hex) extras.push(`background-color:${hex}`);
          return '';
        });
        a = a.replace(/class=(["'])\s*\1/gi, '');
        a = a.replace(/class=(["'])\s+/gi, 'class=$1');
        a = a.replace(/\s{2,}/g, ' ');
        if (!extras.length) return `<${tag}${attrs}>`;
        if (/style\s*=/i.test(a)) {
          a = a.replace(/style\s*=\s*(["'])/i, `style=$1${extras.join(';')};`);
        } else {
          a += ` style="${extras.join(';')}"`;
        }
        return `<${tag}${a}>`;
      },
    );

    // Ensure bold/italic tags keep weight even if UA/print CSS resets
    out = out.replace(
      /<(strong|b)(\b[^>]*)>/gi,
      (_m, tag: string, attrs: string) => {
        if (/font-weight\s*:/i.test(attrs)) return `<${tag}${attrs}>`;
        if (/style\s*=/i.test(attrs)) {
          return `<${tag}${attrs.replace(/style\s*=\s*(["'])/i, 'style=$1font-weight:700;')}>`;
        }
        return `<${tag}${attrs} style="font-weight:700">`;
      },
    );
    out = out.replace(
      /<(em|i)(\b[^>]*)>/gi,
      (_m, tag: string, attrs: string) => {
        if (/font-style\s*:/i.test(attrs)) return `<${tag}${attrs}>`;
        if (/style\s*=/i.test(attrs)) {
          return `<${tag}${attrs.replace(/style\s*=\s*(["'])/i, 'style=$1font-style:italic;')}>`;
        }
        return `<${tag}${attrs} style="font-style:italic">`;
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
   * Remove leading empty paragraphs (Word often leaves many blank lines under where
   * the header was). Fixes large white gap under uploaded letterhead logo.
   */
  private stripLeadingBlankBlocks(html: string, maxStrip = 12): string {
    let out = String(html || '');
    const emptyLead =
      /^(?:\s*<(?:p|div)\b[^>]*>\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*<\/(?:p|div)>\s*)+/i;
    let stripped = 0;
    while (stripped < maxStrip && emptyLead.test(out)) {
      out = out.replace(emptyLead, (block) => {
        // Strip one empty block at a time to keep control
        return block.replace(
          /^\s*<(?:p|div)\b[^>]*>\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*<\/(?:p|div)>\s*/i,
          '',
        );
      });
      stripped++;
    }
    return out;
  }

  /** True when a split sheet has no printable text/media (causes blank PDF pages). */
  private isEmptyPrintSheet(html: string): boolean {
    const raw = String(html || '');
    if (/<img\b/i.test(raw) || /<table\b/i.test(raw) || /<svg\b/i.test(raw)) return false;
    const plain = raw
      .replace(/<div\b[^>]*(?:page-break|data-page-break)[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;|&#160;|\u00a0/gi, '')
      .replace(/\s+/g, '')
      .trim();
    return plain.length === 0;
  }

  /** Default logo band height (mm) when form value missing */
  private static readonly LH_HEADER_MM_DEFAULT = 28;
  /** Default address / GSTN band height (mm) */
  private static readonly LH_FOOTER_MM_DEFAULT = 40;
  /** Fallback when pageDims unavailable; prefer this.pageDims.hMm at runtime. */
  private static readonly PAGE_H_MM = 297;

  /** px per CSS mm (probe once per call batch). */
  private mmToPx(mm: number): number {
    if (typeof document === 'undefined') return mm * 3.7795;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:-99999px;top:0;height:100mm;width:1px;margin:0;padding:0;border:0;';
    document.body.appendChild(probe);
    const pxPerMm = probe.offsetHeight / 100 || 3.7795;
    document.body.removeChild(probe);
    return mm * pxPerMm;
  }

  /**
   * Split HTML into page chunks at page-break markers (after normalizeHtmlForPrint).
   * Drops empty chunks so consecutive PAGE BREAKs don't create blank PDF pages.
   */
  private splitHtmlByPageBreaks(html: string): string[] {
    let src = String(html || '');
    if (!src.trim()) return ['<p><br></p>'];

    // Collapse back-to-back page-break markers into one
    src = src.replace(
      /(?:<div\b[^>]*(?:class\s*=\s*["'][^"']*\bpage-break\b[^"']*["']|data-page-break\s*=)[^>]*>\s*<\/div>\s*){2,}/gi,
      '<div class="page-break" data-page-break="1"></div>',
    );

    const parts = src.split(
      /<div\b[^>]*(?:class\s*=\s*["'][^"']*page-break[^"']*["']|data-page-break\s*=)[^>]*>\s*<\/div>/gi,
    );

    const cleaned = parts
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !this.isEmptyPrintSheet(p));

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

    return this.inlineQuillFormatClassesForPrint(out);
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

  loadLetterhead(done?: () => void): void {
    this.master.getLetterhead().subscribe({
      next: (res: any) => {
        if (res?.status) {
          this.letterheadUrl = res.data?.url || null;
          this.letterheadBase64 = res.data?.base64 || null;
          // Template saved with letterhead → keep image mode once file is available
          if (
            (this.letterheadBase64 || this.letterheadUrl) &&
            this.letterheadMode === 'image' &&
            !this.coerceLetterheadBlank(this.form?.letterheadBlank)
          ) {
            this.form.letterheadBlank = false;
            this.letterheadMode = 'image';
          }
          this.cdr.detectChanges();
        }
        done?.();
      },
      error: () => done?.(),
    });
  }

  /** DB / JSON may send boolean, 0/1, or "true"/"false". */
  private coerceLetterheadBlank(v: unknown): boolean {
    return v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
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

  /** Resolved top padding in mm (saved value or sensible auto default). */
  get effectiveTopPadMm(): number {
    const custom = this.form?.topPaddingMm;
    if (custom != null && custom !== '' && !Number.isNaN(Number(custom))) {
      return Math.min(80, Math.max(0, Number(custom)));
    }
    // Letterhead header is a separate band — default flush under logo
    if (this.letterheadMode === 'image' && this.pageBackground) return 0;
    return 0;
  }

  get topPadCss(): string {
    return `${this.effectiveTopPadMm}mm`;
  }

  /** Clamp letterhead band mm (10–90). */
  private normalizeLhBandMm(value: unknown, fallback: number): number {
    if (value == null || value === '' || value === 'auto') return fallback;
    const n = parseInt(String(value), 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(90, Math.max(10, n));
  }

  get effectiveLhHeaderMm(): number {
    return this.normalizeLhBandMm(
      this.form?.letterheadHeaderMm,
      DocumentTemplateComponent.LH_HEADER_MM_DEFAULT,
    );
  }

  get effectiveLhFooterMm(): number {
    return this.normalizeLhBandMm(
      this.form?.letterheadFooterMm,
      DocumentTemplateComponent.LH_FOOTER_MM_DEFAULT,
    );
  }

  get lhHeaderCss(): string {
    return `${this.effectiveLhHeaderMm}mm`;
  }

  get lhFooterCss(): string {
    return `${this.effectiveLhFooterMm}mm`;
  }

  onTopPaddingChange(): void {
    this.cdr.detectChanges();
    this.refreshPrintPreview(true);
  }

  /** Paginator config used by the last buildPrintHtml (PDF export runs it in-page) */
  private lastPaginateCfg: any = null;

  /** Active mouse drag of the on-page Top space handle */
  topPadDrag: { startY: number; startMm: number; pxPerMm: number } | null = null;

  /** Handle sits where body content starts (below letterhead band if shown). */
  get topPadGuideTopCss(): string {
    const lh = this.letterheadMode === 'image' && this.pageBackground ? this.effectiveLhHeaderMm : 0;
    return `${lh + this.editorTopPadMm}mm`;
  }

  startTopPadDrag(ev: PointerEvent): void {
    ev.preventDefault();
    (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
    this.topPadDrag = {
      startY: ev.clientY,
      startMm: this.effectiveTopPadMm,
      pxPerMm: this.mmToPx(1) || 3.7795,
    };
  }

  moveTopPadDrag(ev: PointerEvent): void {
    if (!this.topPadDrag) return;
    const { startY, startMm, pxPerMm } = this.topPadDrag;
    const mm = Math.min(80, Math.max(0, Math.round(startMm + (ev.clientY - startY) / pxPerMm)));
    if (mm === this.form.topPaddingMm) return;
    this.form.topPaddingMm = mm;
    this.cdr.detectChanges();
  }

  endTopPadDrag(ev: PointerEvent): void {
    if (!this.topPadDrag) return;
    (ev.target as HTMLElement).releasePointerCapture?.(ev.pointerId);
    const changed = this.topPadDrag.startMm !== this.effectiveTopPadMm;
    this.topPadDrag = null;
    if (!changed) return;
    // Keep the Top space dropdown showing the dragged value
    const mm = this.effectiveTopPadMm;
    if (!this.topPadOptions.includes(mm)) {
      this.topPadOptions = [...this.topPadOptions, mm].sort((a, b) => a - b);
    }
    this.onTopPaddingChange();
  }

  resetTopPad(): void {
    this.form.topPaddingMm = 0;
    this.onTopPaddingChange();
  }

  /* ---------- Custom header / footer ---------- */

  readonly hfFontSizes = ['8pt', '9pt', '10pt', '11pt', '12pt', '14pt'];

  /** Saved / partial config → full editable shape (mirrors backend normalizeHeaderFooter). */
  normalizeHeaderFooter(v: any): any {
    let src = v;
    if (typeof src === 'string') {
      try {
        src = JSON.parse(src);
      } catch {
        src = null;
      }
    }
    const part = (p: any, fallbackSize: string, withPageNumber: boolean) => {
      const offset = parseInt(String(p?.offsetMm ?? ''), 10);
      const out: any = {
        enabled: !!p?.enabled,
        text: String(p?.text || '').slice(0, 1000),
        align: ['left', 'center', 'right'].includes(p?.align) ? p.align : 'center',
        fontSize: p?.fontSize ? this.normalizeFontSizeToken(p.fontSize) : fallbackSize,
        bold: !!p?.bold,
        offsetMm: Number.isNaN(offset) ? 8 : Math.min(60, Math.max(0, offset)),
      };
      if (withPageNumber) out.pageNumber = !!p?.pageNumber;
      return out;
    };
    return {
      header: part(src?.header, '10pt', false),
      footer: part(src?.footer, '9pt', true),
      pages: ['all', 'first', 'notFirst'].includes(src?.pages) ? src.pages : 'all',
    };
  }

  private hfPartActive(part: any): boolean {
    return !!(part?.enabled && (String(part.text || '').trim() || part.pageNumber));
  }

  private hfActive(): boolean {
    const hf = this.form?.headerFooter;
    return !!hf && (this.hfPartActive(hf.header) || this.hfPartActive(hf.footer));
  }

  private hfShowsOnPage(index: number): boolean {
    if (!this.hfActive()) return false;
    const pages = this.form.headerFooter.pages;
    if (pages === 'first') return index === 0;
    if (pages === 'notFirst') return index > 0;
    return true;
  }

  /** Space (mm) from the page edge the header/footer needs, so body text never overlaps it. */
  private hfReserveMm(part: any): number {
    if (!this.hfPartActive(part)) return 0;
    const pt = parseFloat(part.fontSize) || 10;
    const text = String(part.text || '').trim();
    const lines = (text ? text.split('\n').length : 0) + (part.pageNumber ? 1 : 0);
    return Math.ceil(part.offsetMm + Math.max(1, lines) * pt * 0.3528 * 1.25 + 3);
  }

  private hfPartHtml(part: any, pageLabel: string): string {
    let html = String(part.text || '')
      .trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r?\n/g, '<br>');
    if (part.pageNumber) html += `${html ? '<br>' : ''}${pageLabel}`;
    return html;
  }

  /** Header/footer HTML + reserved space handed to the paginator (page no. filled per page). */
  private hfPaginateCfg(padX: string): any {
    if (!this.hfActive()) return null;
    const hf = this.form.headerFooter;
    const one = (kind: 'header' | 'footer') => {
      const part = hf[kind];
      if (!this.hfPartActive(part)) return null;
      const pos = kind === 'header' ? `top:${part.offsetMm}mm` : `bottom:${part.offsetMm}mm`;
      const pageLabel = 'Page <span class="hr-pg">1</span> of <span class="hr-pgs">1</span>';
      return {
        reserve: this.hfReserveMm(part),
        html:
          `<div class="page-hf page-hf--${kind}" style="${pos};padding:0 ${padX};` +
          `text-align:${part.align};font-size:${part.fontSize};font-weight:${part.bold ? 700 : 400};">` +
          `${this.hfPartHtml(part, pageLabel)}</div>`,
      };
    };
    return { pages: hf.pages, header: one('header'), footer: one('footer') };
  }

  /** Editor overlay (continuous page): header on top, footer at document end. */
  hfEditorVisible(kind: 'header' | 'footer'): boolean {
    if (!this.hfPartActive(this.form?.headerFooter?.[kind])) return false;
    return this.hfShowsOnPage(kind === 'header' ? 0 : Math.max(0, this.autoPageCount - 1));
  }

  hfEditorHtml(kind: 'header' | 'footer'): string {
    const n = this.autoPageCount || 1;
    return this.hfPartHtml(this.form.headerFooter[kind], `Page ${n} of ${n}`);
  }

  /** Editor top padding: user Top space, raised if needed so text clears the header. */
  get editorTopPadMm(): number {
    if (!this.hfShowsOnPage(0)) return this.effectiveTopPadMm;
    const lh = this.letterheadMode === 'image' && this.pageBackground ? this.effectiveLhHeaderMm : 0;
    return Math.max(this.effectiveTopPadMm, this.hfReserveMm(this.form.headerFooter.header) - lh);
  }

  get editorTopPadCss(): string {
    return `${this.editorTopPadMm}mm`;
  }

  get allVariables(): { key: string; label: string }[] {
    return ['employee', 'salary', 'company'].flatMap((g) => this.catalog?.[g] || []);
  }

  setHfAlign(kind: 'header' | 'footer', align: 'left' | 'center' | 'right'): void {
    this.form.headerFooter[kind].align = align;
    this.onHeaderFooterChange();
  }

  nudgeHfOffset(kind: 'header' | 'footer', delta: number): void {
    const part = this.form.headerFooter[kind];
    part.offsetMm = Math.min(60, Math.max(0, (Number(part.offsetMm) || 0) + delta));
    this.onHeaderFooterChange();
  }

  /** Insert {{Variable}} at the caret of the header/footer text box. */
  insertHfVariable(kind: 'header' | 'footer', key: string, select?: HTMLSelectElement): void {
    if (select) select.value = '';
    if (!key) return;
    const part = this.form.headerFooter[kind];
    const token = `{{${key}}}`;
    const box = document.getElementById(`dt-hf-${kind}-text`) as HTMLTextAreaElement | null;
    const text = String(part.text || '');
    const at = box && document.activeElement === box ? box.selectionStart : text.length;
    part.text = text.slice(0, at) + token + text.slice(at);
    part.enabled = true;
    this.onHeaderFooterChange();
    setTimeout(() => {
      box?.focus();
      box?.setSelectionRange(at + token.length, at + token.length);
    }, 0);
  }

  /** Click on the header/footer shown on the page → jump to its text box in the left panel. */
  focusHfText(kind: 'header' | 'footer'): void {
    const box = document.getElementById(`dt-hf-${kind}-text`) as HTMLTextAreaElement | null;
    box?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    box?.focus();
  }

  onHeaderFooterChange(): void {
    this.cdr.detectChanges();
    this.refreshPrintPreview();
  }

  onLhBandChange(): void {
    this.form.letterheadHeaderMm = this.effectiveLhHeaderMm;
    this.form.letterheadFooterMm = this.effectiveLhFooterMm;
    // Keep select options in sync if value was nudged to a non-listed step
    if (!this.lhBandOptions.includes(this.form.letterheadHeaderMm)) {
      this.lhBandOptions = [...this.lhBandOptions, this.form.letterheadHeaderMm].sort(
        (a, b) => a - b,
      );
    }
    if (!this.lhBandOptions.includes(this.form.letterheadFooterMm)) {
      this.lhBandOptions = [...this.lhBandOptions, this.form.letterheadFooterMm].sort(
        (a, b) => a - b,
      );
    }
    this.cdr.detectChanges();
    this.refreshPrintPreview(true);
  }

  /** − / + buttons — 1mm steps for header or footer band */
  nudgeLhBand(which: 'header' | 'footer', delta: number): void {
    if (which === 'header') {
      this.form.letterheadHeaderMm = this.normalizeLhBandMm(
        this.effectiveLhHeaderMm + delta,
        DocumentTemplateComponent.LH_HEADER_MM_DEFAULT,
      );
    } else {
      this.form.letterheadFooterMm = this.normalizeLhBandMm(
        this.effectiveLhFooterMm + delta,
        DocumentTemplateComponent.LH_FOOTER_MM_DEFAULT,
      );
    }
    this.onLhBandChange();
  }

  onLetterheadPagesChange(): void {
    this.form.letterheadPages = this.normalizeLetterheadPages(this.form.letterheadPages);
    this.cdr.detectChanges();
    this.refreshPrintPreview(true);
  }

  onPageSizeChange(): void {
    this.form.pageSize = this.normalizePageSize(this.form.pageSize);
    this.applyEditorChromeDefaults();
    this.cdr.detectChanges();
    this.refreshPrintPreview(true);
  }

  onDefaultFontChange(): void {
    this.form.defaultFontFamily = this.normalizeFontFamily(this.form.defaultFontFamily) || 'Times New Roman';
    this.form.defaultFontSize = this.normalizeFontSizeToken(this.form.defaultFontSize) || '12pt';
    this.applyEditorChromeDefaults();
    this.cdr.detectChanges();
    this.refreshPrintPreview(true);
  }

  /** Current paper size in mm (editor frame + print + letterhead fit). */
  get pageDims(): { wMm: number; hMm: number; id: string } {
    const id = this.normalizePageSize(this.form?.pageSize);
    const hit = this.pageSizeOptions.find((p) => p.id === id) || this.pageSizeOptions[0];
    return { wMm: hit.wMm, hMm: hit.hMm, id: hit.id };
  }

  get pageWidthCss(): string {
    return `${this.pageDims.wMm}mm`;
  }

  get pageHeightCss(): string {
    return `${this.pageDims.hMm}mm`;
  }

  /** Normalize saved/UI value to '1' | '2' | 'all'. */
  private normalizeLetterheadPages(v: unknown): '1' | '2' | 'all' {
    const s = String(v || 'all').toLowerCase();
    if (s === '1' || s === 'one' || s === 'first') return '1';
    if (s === '2' || s === 'two') return '2';
    return 'all';
  }

  private normalizePageSize(v: unknown): 'A4' | 'Letter' | 'Legal' | 'A5' {
    const s = String(v || 'A4').trim().toLowerCase();
    if (s === 'letter') return 'Letter';
    if (s === 'legal') return 'Legal';
    if (s === 'a5') return 'A5';
    return 'A4';
  }

  private normalizeFontSizeToken(v: unknown): string {
    const s = String(v || '').trim().toLowerCase();
    if (!s) return '12pt';
    if (/^\d+(\.\d+)?pt$/i.test(s)) return s;
    if (/^\d+(\.\d+)?px$/i.test(s)) return `${Math.round(parseFloat(s) * 0.75)}pt`;
    if (/^\d+(\.\d+)?$/.test(s)) return `${s}pt`;
    const hit = QUILL_SIZE_WHITELIST.find((x) => x.toLowerCase() === s);
    return hit || '12pt';
  }

  /** Apply saved page size + default font to editor DOM (Quill / rich). */
  private applyEditorChromeDefaults(): void {
    const fam = this.form?.defaultFontFamily || 'Times New Roman';
    const size = this.normalizeFontSizeToken(this.form?.defaultFontSize);
    const w = this.pageWidthCss;
    const h = this.pageHeightCss;

    const frame = document.querySelector(
      'app-document-template .editor-frame',
    ) as HTMLElement | null;
    if (frame) {
      frame.style.setProperty('--dt-page-w', w);
      frame.style.setProperty('--dt-page-h', h);
      frame.style.width = w;
    }

    const ql = document.querySelector(
      'app-document-template .dt-quill-wrap .ql-editor',
    ) as HTMLElement | null;
    if (ql) {
      ql.style.fontFamily = fam;
      ql.style.fontSize = size;
    }
    const rich = this.richHost?.nativeElement;
    if (rich) {
      rich.style.fontFamily = fam;
      rich.style.fontSize = size;
    }
    if (this.quill?.root) {
      this.quill.root.style.fontFamily = fam;
      this.quill.root.style.fontSize = size;
    }
  }

  /** Max page index count that should show letterhead (Infinity = all). */
  private letterheadPageLimit(): number {
    if (this.letterheadMode !== 'image' || !this.pageBackground) return 0;
    const mode = this.normalizeLetterheadPages(this.form?.letterheadPages);
    if (mode === '1') return 1;
    if (mode === '2') return 2;
    return Number.POSITIVE_INFINITY;
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
      topPaddingMm: 0,
      letterheadPages: 'all',
      letterheadHeaderMm: DocumentTemplateComponent.LH_HEADER_MM_DEFAULT,
      letterheadFooterMm: DocumentTemplateComponent.LH_FOOTER_MM_DEFAULT,
      pageSize: 'A4',
      defaultFontFamily: 'Times New Roman',
      defaultFontSize: '12pt',
      includeSalaryAnnexure: false,
      status: 'active',
      branchIds: [],
      assignAllBranches: true,
      headerFooter: this.normalizeHeaderFooter(null),
    };
    this.letterheadMode = this.form.letterheadBlank ? 'blank' : 'image';
    setTimeout(() => {
      this.initEditor(this.sampleBody);
      this.applyEditorChromeDefaults();
      this.scheduleAutoPageBreaks();
    }, 0);
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
      let topPad =
        data.topPaddingMm != null && data.topPaddingMm !== ''
          ? Number(data.topPaddingMm)
          : null;
      if (topPad != null && Number.isNaN(topPad)) topPad = null;
      const blankLh = this.coerceLetterheadBlank(data.letterheadBlank);
      // Default / blank letterhead → 0 mm top (user can raise via Top space)
      if (topPad == null || blankLh) {
        topPad = 0;
      }
      this.form = {
        id: data.id,
        name: data.name,
        category: data.category || 'custom',
        bodyHtml: html,
        letterheadBlank: blankLh,
        topPaddingMm: topPad,
        letterheadPages: this.normalizeLetterheadPages(data.letterheadPages),
        letterheadHeaderMm: this.normalizeLhBandMm(
          data.letterheadHeaderMm,
          DocumentTemplateComponent.LH_HEADER_MM_DEFAULT,
        ),
        letterheadFooterMm: this.normalizeLhBandMm(
          data.letterheadFooterMm,
          DocumentTemplateComponent.LH_FOOTER_MM_DEFAULT,
        ),
        pageSize: this.normalizePageSize(data.pageSize),
        defaultFontFamily:
          this.normalizeFontFamily(data.defaultFontFamily) || 'Times New Roman',
        defaultFontSize: this.normalizeFontSizeToken(data.defaultFontSize) || '12pt',
        includeSalaryAnnexure: !!data.includeSalaryAnnexure,
        status: data.status || 'active',
        branchIds: ids,
        assignAllBranches: !ids.length,
        headerFooter: this.normalizeHeaderFooter(data.headerFooter),
      };
      // Restore saved letterhead choice (image vs blank) before editor paints
      this.letterheadMode = blankLh ? 'blank' : 'image';

      const startEditor = () => {
        // If template uses letterhead and image is ready, keep bands visible
        if (!blankLh && (this.letterheadBase64 || this.letterheadUrl)) {
          this.form.letterheadBlank = false;
          this.letterheadMode = 'image';
        }
        this.cdr.detectChanges();
        setTimeout(() => {
          this.initEditor(html);
          this.applyEditorChromeDefaults();
          this.scheduleAutoPageBreaks();
        }, 0);
      };

      // Always refresh company letterhead so edit shows logo/footer when saved with it
      this.loadLetterhead(startEditor);
    };

    // Fetch fresh row so update always has latest body + id + letterhead flags
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
    this.clearAutoPageBreaks(true);
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
    // Ensure no leftover toolbar/container from a previous Quill before re-init
    const wrap = host.closest('.dt-quill-wrap') || host.parentElement;
    wrap?.querySelectorAll('.ql-toolbar').forEach((n) => n.remove());
    const tbSlot = this.quillToolbarHost?.nativeElement;
    if (tbSlot) tbSlot.innerHTML = '';
    host.innerHTML = '';
    host.className = 'dt-quill-host';
    const self = this;
    this.quill = new Quill(host, {
      theme: 'snow',
      placeholder: 'Type your letter like in Word… Paste from Word keeps formatting.',
      modules: {
        table: true,
        toolbar: {
          container: [
          [{ header: [1, 2, 3, false] }],
            [{ font: QUILL_FONT_WHITELIST }],
            [{ size: QUILL_SIZE_WHITELIST }],
            [{ lineheight: QUILL_LINEHEIGHT_WHITELIST }],
            [{ paragraphspacing: QUILL_PARASPACING_WHITELIST }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ script: 'sub' }, { script: 'super' }],
            ['uppercase', 'lowercase', 'titlecase'],
            [{ color: [] }, { background: [] }],
            [{ align: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ indent: '-1' }, { indent: '+1' }],
            ['blockquote', 'link', 'image', 'table'],
            ['pagebreak'],
            ['clean'],
          ],
          handlers: {
            pagebreak() {
              self.insertQuillPageBreak();
            },
            table() {
              self.insertQuillTable();
            },
            lineheight(value: string) {
              const q = self.quill;
              if (!q) return;
              q.format('lineheight', value || false, 'user');
              self.form.bodyHtml = q.root.innerHTML;
              self.refreshPrintPreview(false);
            },
            paragraphspacing(value: string) {
              const q = self.quill;
              if (!q) return;
              q.format('paragraphspacing', value || false, 'user');
              self.form.bodyHtml = q.root.innerHTML;
              self.refreshPrintPreview(false);
            },
            uppercase() {
              self.applyTextCase('upper');
            },
            lowercase() {
              self.applyTextCase('lower');
            },
            titlecase() {
              self.applyTextCase('title');
            },
          },
        },
        clipboard: {
          matchVisual: false,
        },
      },
    });

    // Keep toolbar above the A4 page (never overlapping letterhead / body)
    this.mountQuillToolbarOutsidePage(host);
    this.enhanceFontPickerSearch();

    this.registerClipboardMatchers();
    this.bindWordPasteHandler();
    this.setEditorHtml(html || '<p><br></p>');
    this.applyEditorChromeDefaults();

    this.quill.on('text-change', () => {
      // Keep raw HTML so imported tables/images/styles survive edits as much as possible
      this.form.bodyHtml = this.quill?.root.innerHTML || '';
      this.refreshPrintPreview(false);
    });
  }

  /** Move Quill's .ql-toolbar into the sticky header slot above .a4-stage. */
  private mountQuillToolbarOutsidePage(host: HTMLElement): void {
    const slot = this.quillToolbarHost?.nativeElement;
    if (!slot) return;
    const wrap = host.closest('.dt-quill-wrap') || host.parentElement;
    const bar =
      (wrap?.querySelector('.ql-toolbar') as HTMLElement | null) ||
      (host.previousElementSibling?.classList?.contains('ql-toolbar')
        ? (host.previousElementSibling as HTMLElement)
        : null);
    if (!bar) return;
    slot.innerHTML = '';
    slot.appendChild(bar);
  }

  /**
   * Font dropdown: scrollable list + search box (type name → matching fonts).
   * Wired after toolbar is mounted into the sticky slot.
   */
  private enhanceFontPickerSearch(): void {
    const root =
      this.quillToolbarHost?.nativeElement ||
      (document.querySelector('app-document-template .ql-toolbar') as HTMLElement | null);
    if (!root) return;
    const fontPicker = root.querySelector('.ql-picker.ql-font') as HTMLElement | null;
    if (!fontPicker) return;
    const options = fontPicker.querySelector('.ql-picker-options') as HTMLElement | null;
    if (!options || options.querySelector('.dt-font-search')) return;

    const wrap = document.createElement('div');
    wrap.className = 'dt-font-search';
    wrap.setAttribute('contenteditable', 'false');
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Search font…';
    input.autocomplete = 'off';
    input.spellcheck = false;
    wrap.appendChild(input);

    const stop = (e: Event) => e.stopPropagation();
    ['mousedown', 'mouseup', 'click', 'pointerdown', 'touchstart'].forEach((evt) => {
      wrap.addEventListener(evt, stop);
      input.addEventListener(evt, stop);
    });
    // Keep typing in the search box (don't let Quill/toolbar steal keys)
    input.addEventListener('keydown', stop);
    input.addEventListener('keyup', stop);
    input.addEventListener('keypress', stop);

    const applyFilter = () => {
      const q = String(input.value || '')
        .trim()
        .toLowerCase();
      options.querySelectorAll('.ql-picker-item').forEach((node) => {
        const el = node as HTMLElement;
        const name = String(el.getAttribute('data-value') || el.textContent || '').toLowerCase();
        el.style.display = !q || name.includes(q) ? '' : 'none';
      });
    };
    input.addEventListener('input', applyFilter);

    const resetAndFocus = () => {
      input.value = '';
      applyFilter();
      setTimeout(() => {
        try {
          input.focus();
        } catch (_) {}
      }, 30);
    };
    fontPicker.querySelector('.ql-picker-label')?.addEventListener('mousedown', () => {
      // Slight delay so Quill opens the panel first
      setTimeout(resetAndFocus, 0);
    });

    options.insertBefore(wrap, options.firstChild);
  }

  /** Apply font-family from Format bar select (Quill mode). Also remembers template default. */
  applyQuillFontFamily(value: string): void {
    if (!value) return;
    const fam = this.normalizeFontFamily(value) || value;
    this.form.defaultFontFamily = fam;
    if (!this.quill) {
      this.onDefaultFontChange();
      return;
    }
    let range = this.quill.getSelection(true);
    if (!range) {
      const idx = Math.max(0, this.quill.getLength() - 1);
      this.quill.setSelection(idx, 0, 'silent');
      range = this.quill.getSelection(true);
    }
    // No selection length → set document default; with selection → format selected text
    if (!range || range.length === 0) {
      this.applyEditorChromeDefaults();
    } else {
      this.quill.format('font', fam, 'user');
      this.form.bodyHtml = this.quill.root.innerHTML;
    }
    this.refreshPrintPreview(false);
  }

  /** Apply font-size from Format bar select (Quill mode). Also remembers template default. */
  applyQuillFontSize(value: string): void {
    if (!value) return;
    const size = this.normalizeFontSizeToken(value);
    this.form.defaultFontSize = size;
    if (!this.quill) {
      this.onDefaultFontChange();
      return;
    }
    let range = this.quill.getSelection(true);
    if (!range) {
      const idx = Math.max(0, this.quill.getLength() - 1);
      this.quill.setSelection(idx, 0, 'silent');
      range = this.quill.getSelection(true);
    }
    if (!range || range.length === 0) {
      this.applyEditorChromeDefaults();
    } else {
      this.quill.format('size', size, 'user');
      this.form.bodyHtml = this.quill.root.innerHTML;
    }
    this.refreshPrintPreview(false);
  }

  /** Apply line-height from toolbar / Format bar select (Quill mode). */
  applyQuillLineHeight(value: string): void {
    if (!this.quill || !value) return;
    const range = this.quill.getSelection(true);
    if (!range) {
      const idx = Math.max(0, this.quill.getLength() - 1);
      this.quill.setSelection(idx, 0, 'silent');
    }
    this.quill.format('lineheight', value, 'user');
    this.form.bodyHtml = this.quill.root.innerHTML;
    this.refreshPrintPreview(false);
  }

  /** Apply paragraph spacing (margin-bottom) — Quill mode. Values like "5pt". */
  applyQuillParagraphSpacing(value: string): void {
    if (!this.quill || !value) return;
    const range = this.quill.getSelection(true);
    if (!range) {
      const idx = Math.max(0, this.quill.getLength() - 1);
      this.quill.setSelection(idx, 0, 'silent');
    }
    this.quill.format('paragraphspacing', value, 'user');
    this.form.bodyHtml = this.quill.root.innerHTML;
    this.refreshPrintPreview(false);
  }

  /**
   * ABC tools: change selected text case.
   * upper → ABC, lower → abc, title → Abc (each word).
   */
  applyTextCase(mode: 'upper' | 'lower' | 'title'): void {
    if (this.useRichEditor) {
      this.applyRichTextCase(mode);
      return;
    }
    if (!this.quill) return;
    const range = this.quill.getSelection(true);
    if (!range || range.length === 0) {
      this.notyf.error('Select some text first');
      return;
    }
    const raw = this.quill.getText(range.index, range.length);
    // Quill getText often includes trailing newline in block selections
    const hadTrailNl = /\n$/.test(raw);
    const core = hadTrailNl ? raw.slice(0, -1) : raw;
    if (!core) {
      this.notyf.error('Select some text first');
      return;
    }
    const next = this.transformTextCase(core, mode) + (hadTrailNl ? '\n' : '');
    if (next === raw) return;

    const formats = this.quill.getFormat(range.index, Math.max(1, range.length - (hadTrailNl ? 1 : 0)));
    this.quill.deleteText(range.index, range.length, 'user');
    this.quill.insertText(range.index, next, formats as any, 'user');
    this.quill.setSelection(range.index, next.length - (hadTrailNl ? 1 : 0), 'user');
    this.form.bodyHtml = this.quill.root.innerHTML;
    this.refreshPrintPreview(false);
  }

  private transformTextCase(text: string, mode: 'upper' | 'lower' | 'title'): string {
    if (mode === 'upper') return text.toLocaleUpperCase('en-US');
    if (mode === 'lower') return text.toLocaleLowerCase('en-US');
    // Title Case: capitalize first letter of each word
    return text.toLocaleLowerCase('en-US').replace(/\b([a-zA-Z])/g, (ch) => ch.toUpperCase());
  }

  /** Rich-editor ABC case tools (contenteditable selection). */
  private applyRichTextCase(mode: 'upper' | 'lower' | 'title'): void {
    const el = this.getRichEl();
    if (!el) return;
    this.restoreRichSelection();
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      this.notyf.error('Select some text first');
      return;
    }
    const range = sel.getRangeAt(0);
    const text = range.toString();
    if (!text) {
      this.notyf.error('Select some text first');
      return;
    }
    const next = this.transformTextCase(text, mode);
    range.deleteContents();
    range.insertNode(document.createTextNode(next));
    // Reselect inserted text
    sel.removeAllRanges();
    const nr = document.createRange();
    const node = range.startContainer.childNodes[range.startOffset - 1] || range.startContainer;
    try {
      if (node.nodeType === Node.TEXT_NODE) {
        nr.setStart(node, 0);
        nr.setEnd(node, (node.textContent || '').length);
        sel.addRange(nr);
      }
    } catch (_) {}
    this.saveRichSelection();
    this.syncBodyAndPreview();
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
        if (tag === 'DIV') {
          if (node?.classList?.contains('page-break') || node?.getAttribute?.('data-page-break')) {
            return new Delta().insert({ pagebreak: true });
          }
          if (node?.classList?.contains('ql-spacer') || node?.getAttribute?.('data-vspace')) {
            const em =
              parseFloat(node.getAttribute('data-vspace') || '') ||
              parseFloat(String(node.style?.height || '').replace(/em$/i, '')) ||
              1.85;
            return new Delta().insert({ vspace: em });
          }
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
      return this.stripDefaultTabIndent(doc.body.innerHTML);
    } catch (_) {
      return this.stripDefaultTabIndent(h);
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
      // Intentionally omit margin-left / text-indent — Word "1 tab" indent
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
   * Load HTML into Quill. Never assign quill.root.innerHTML directly —
   * that desyncs Quill's Delta and the toolbar/caret stop working.
   */
  private setEditorHtml(html: string, _preserveLayout = false): void {
    // Keep accidental tab-indent out; with letterhead also drop leading blank lines under logo
    let safe = this.stripDefaultTabIndent(html && html.trim() ? html : '<p><br></p>');
    if (this.letterheadMode === 'image' && this.pageBackground) {
      safe = this.stripLeadingBlankBlocks(safe, 16);
    }
    this.form.bodyHtml = safe;
    if (!this.quill) return;

    try {
      this.quill.setText('', 'silent');
      this.quill.clipboard.dangerouslyPasteHTML(0, safe, 'silent');
      this.quill.root.classList.remove('ql-blank');
      this.form.bodyHtml = this.stripDefaultTabIndent(
        this.quill.root.innerHTML || safe,
      );
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
        (this.quill as any).off?.('text-change');
      } catch (_) {}
      this.quill = null;
    }

    const host = this.editorHost?.nativeElement;
    if (host) {
      // Quill snow inserts .ql-toolbar as a SIBLING of the host — must remove or import doubles it
      const wrap = host.closest('.dt-quill-wrap') || host.parentElement;
      if (wrap) {
        wrap.querySelectorAll('.ql-toolbar').forEach((n) => n.remove());
      }
      host.innerHTML = '';
      host.className = 'dt-quill-host';
      host.removeAttribute('data-gramm');
    }

    // External sticky toolbar slot + any orphans
    const tbSlot = this.quillToolbarHost?.nativeElement;
    if (tbSlot) tbSlot.innerHTML = '';
    try {
      document
        .querySelectorAll(
          'app-document-template .editor-frame > .ql-toolbar, app-document-template .dt-quill-wrap > .ql-toolbar, app-document-template .dt-editor-toolbar-slot > .ql-toolbar',
        )
        .forEach((n) => n.remove());
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
   * Soft collapse for DOCX — keep up to `maxKeep` consecutive blank lines (Word spacing).
   */
  private softCollapseBlankParagraphs(html: string, maxKeep = 3): string {
    let out = String(html || '');
    const emptyBlock =
      /<(p|div)\b([^>]*)>(?:\s|&nbsp;|\u00a0|<br\s*\/?>|<span\b[^>]*>\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*<\/span>)*<\/\1>/gi;
    out = out.replace(emptyBlock, '<!--HR_BLANK-->');
    out = out.replace(/(?:<!--HR_BLANK-->\s*)+/g, (block) => {
      const n = Math.min(maxKeep, Math.max(1, (block.match(/<!--HR_BLANK-->/g) || []).length));
      return Array.from({ length: n }, () => '<p class="hr-imported-doc"><br></p>').join('');
    });
    return out;
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
          this.notyf.success('Letterhead uploaded — now showing on template');
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
      // DOCX: keep Word blank lines (up to 3). Aggressive collapse only for HTML/TXT paste noise.
      html = isDocx
        ? this.softCollapseBlankParagraphs(html, 3)
        : this.collapseBlankParagraphs(html);

      // Mammoth ignores Word headers — pull header images ONLY if body has no top logo yet
      if (isDocx) {
        const bodyAlreadyHasLogo = /<img\b/i.test(html.slice(0, 5000));
        if (!bodyAlreadyHasLogo) {
          const headerHtml = await this.extractDocxHeaderHtml(await file.arrayBuffer());
          if (headerHtml) {
            html = this.sanitizeOverlappingLayoutHtml(headerHtml + html);
          }
        }
        // Apply Word page margins (top) when available
        try {
          const margins = await this.extractDocxPageMarginsMm(await file.arrayBuffer());
          if (margins?.top != null) {
            this.form.topPaddingMm = Math.min(80, Math.max(0, Math.round(margins.top)));
          }
        } catch (_) {}
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
      // Keep Word top margin if already applied; otherwise default 0 (user can raise via Top space)
      if (this.form.topPaddingMm == null || this.form.topPaddingMm === '') {
        this.form.topPaddingMm = 0;
      }

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
      // Company letterhead replaces Word header space — drop leading blanks so title sits under logo
      if (this.letterheadMode === 'image' && (this.letterheadBase64 || this.letterheadUrl)) {
        html = this.stripLeadingBlankBlocks(html, 16);
      }
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

    // Word stores 1,2,3… in numbering.xml (not as visible text). Inject labels so they survive.
    arrayBuffer = await this.injectDocxNumberingLabels(arrayBuffer);
    // Ensure explicit page breaks survive mammoth → Quill PageBreakBlot
    arrayBuffer = await this.injectDocxPageBreakParagraphs(arrayBuffer);

    // Alignment + spacing + indent from Word OOXML (twips)
    const paraStyles = await this.extractDocxParagraphStyles(arrayBuffer);
    const paraFonts = await this.extractDocxParagraphFonts(arrayBuffer);
    const docDefaults = await this.extractDocxDocumentDefaults(arrayBuffer);

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
          "br[type='page'] => div.page-break[data-page-break='1']:fresh",
        ],
        includeDefaultStyleMap: true,
      },
    );

    if (result.messages?.length) {
      console.warn('mammoth messages', result.messages);
    }

    let html = this.applyAlignmentInlineStyles(String(result.value || '').trim());
    html = this.applyDocxParagraphStyles(html, paraStyles);
    html = this.applyDocxParagraphFonts(html, paraFonts, docDefaults);
    // Fallback: turn <ol><li> into "1. …" text so numbers always show in editor/print
    html = this.flattenOrderedListsToNumberedText(html);
    // Normalize page-break divs for Quill blot
    html = html.replace(
      /<div\b([^>]*\bpage-break\b[^>]*)>/gi,
      (_m, attrs: string) => {
        let a = String(attrs || '');
        if (!/data-page-break/i.test(a)) a += ' data-page-break="1"';
        if (!/page-break-before/i.test(a)) {
          if (/style=/i.test(a)) {
            a = a.replace(/style\s*=\s*(["'])/i, `style=$1page-break-before:always;break-before:page;`);
          } else {
            a += ' style="page-break-before:always;break-before:page;"';
          }
        }
        return `<div${a}>`;
      },
    );
    return html;
  }

  /** Twips → mm (Word page margins). */
  private twipsToMm(twips: number): number {
    return (twips * 25.4) / 1440;
  }

  /** Read w:pgMar from document.xml sectPr. */
  private async extractDocxPageMarginsMm(
    arrayBuffer: ArrayBuffer,
  ): Promise<{ top: number; right: number; bottom: number; left: number } | null> {
    try {
      const JSZipMod: any = await import('jszip');
      const JSZip = JSZipMod.default ?? JSZipMod;
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docFile = zip.file('word/document.xml');
      if (!docFile) return null;
      const docXml: string = await docFile.async('string');
      const m = docXml.match(/<w:pgMar\b([^>]*)\/?>/i);
      if (!m) return null;
      const attrs = m[1];
      const read = (name: string) => {
        const hit = attrs.match(new RegExp(`w:${name}="(\\d+)"`, 'i'));
        return hit ? this.twipsToMm(parseInt(hit[1], 10)) : 0;
      };
      return {
        top: read('top'),
        right: read('right'),
        bottom: read('bottom'),
        left: read('left'),
      };
    } catch {
      return null;
    }
  }

  /** Document default font/size from styles.xml (rFonts / sz). */
  private async extractDocxDocumentDefaults(
    arrayBuffer: ArrayBuffer,
  ): Promise<{ font?: string; sizePt?: number }> {
    try {
      const JSZipMod: any = await import('jszip');
      const JSZip = JSZipMod.default ?? JSZipMod;
      const zip = await JSZip.loadAsync(arrayBuffer);
      const stylesFile = zip.file('word/styles.xml');
      if (!stylesFile) return {};
      const xml: string = await stylesFile.async('string');
      const rPr =
        xml.match(/<w:docDefaults>[\s\S]*?<w:rPrDefault>[\s\S]*?<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/i)?.[1] ||
        xml.match(/<w:rPrDefault>[\s\S]*?<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/i)?.[1] ||
        '';
      const font =
        rPr.match(/<w:rFonts\b[^>]*w:ascii="([^"]+)"/i)?.[1] ||
        rPr.match(/<w:rFonts\b[^>]*w:hAnsi="([^"]+)"/i)?.[1];
      const sz = rPr.match(/<w:sz\b[^>]*w:val="(\d+)"/i)?.[1];
      const sizePt = sz ? parseInt(sz, 10) / 2 : undefined;
      return { font: font || undefined, sizePt };
    } catch {
      return {};
    }
  }

  /**
   * Per-paragraph font/size from first text run (mammoth drops these).
   * Half-points (w:sz) → pt.
   */
  private async extractDocxParagraphFonts(
    arrayBuffer: ArrayBuffer,
  ): Promise<Array<{ font?: string; sizePt?: number }>> {
    try {
      const JSZipMod: any = await import('jszip');
      const JSZip = JSZipMod.default ?? JSZipMod;
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docFile = zip.file('word/document.xml');
      if (!docFile) return [];
      const docXml: string = await docFile.async('string');
      const paras = docXml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
      return paras.map((pXml) => {
        // Prefer first run that has visible text
        const runs = pXml.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g) || [];
        for (const run of runs) {
          if (!/<w:t\b/i.test(run)) continue;
          const rPr = run.match(/<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/)?.[1] || '';
          const font =
            rPr.match(/<w:rFonts\b[^>]*w:ascii="([^"]+)"/i)?.[1] ||
            rPr.match(/<w:rFonts\b[^>]*w:hAnsi="([^"]+)"/i)?.[1];
          const sz = rPr.match(/<w:sz\b[^>]*w:val="(\d+)"/i)?.[1];
          const sizePt = sz ? parseInt(sz, 10) / 2 : undefined;
          if (font || sizePt) return { font, sizePt };
        }
        // Fall back to paragraph mark rPr
        const pRpr = pXml.match(/<w:pPr\b[\s\S]*?<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/)?.[1] || '';
        const font =
          pRpr.match(/<w:rFonts\b[^>]*w:ascii="([^"]+)"/i)?.[1] ||
          pRpr.match(/<w:rFonts\b[^>]*w:hAnsi="([^"]+)"/i)?.[1];
        const sz = pRpr.match(/<w:sz\b[^>]*w:val="(\d+)"/i)?.[1];
        return { font, sizePt: sz ? parseInt(sz, 10) / 2 : undefined };
      });
    } catch (err) {
      console.warn('extractDocxParagraphFonts failed', err);
      return [];
    }
  }

  /** Apply OOXML fonts onto mammoth blocks (inline styles Quill SizeStyle/FontStyle keep). */
  private applyDocxParagraphFonts(
    html: string,
    paraFonts: Array<{ font?: string; sizePt?: number }>,
    defaults: { font?: string; sizePt?: number },
  ): string {
    if (!html) return html;
    let idx = 0;
    return html.replace(/<(p|h1|h2|h3|h4|h5|h6)(\b[^>]*)>/gi, (full, tag: string, attrs: string) => {
      const meta = paraFonts[idx++] || {};
      const font = meta.font || defaults.font;
      const sizePt = meta.sizePt || defaults.sizePt;
      const bits: string[] = [];
      if (font && !/font-family\s*:/i.test(attrs)) bits.push(`font-family:${font}`);
      if (sizePt && sizePt > 0 && !/font-size\s*:/i.test(attrs)) {
        const pt = Math.min(72, Math.max(8, sizePt));
        bits.push(`font-size:${pt}pt`);
      }
      if (!bits.length) return full;
      const extra = bits.join(';');
      if (/style\s*=/i.test(attrs)) {
        return `<${tag}${attrs.replace(/style\s*=\s*(["'])(.*?)\1/i, (_m, q, style) => {
          return `style=${q}${String(style).replace(/;?\s*$/, '')};${extra};${q}`;
        })}>`;
      }
      return `<${tag}${attrs} style="${extra};">`;
    });
  }

  /**
   * Convert bare &lt;w:br w:type="page"/&gt; into a paragraph mammoth maps to .page-break,
   * so Quill PageBreakBlot + print sheet split work after import.
   */
  private async injectDocxPageBreakParagraphs(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      const JSZipMod: any = await import('jszip');
      const JSZip = JSZipMod.default ?? JSZipMod;
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docFile = zip.file('word/document.xml');
      if (!docFile) return arrayBuffer;
      let docXml: string = await docFile.async('string');
      const before = docXml;
      // Standalone page break runs → own paragraph (mammoth br[type=page])
      docXml = docXml.replace(
        /<w:r\b[^>]*>\s*(?:<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>\s*)?<w:br\b[^>]*w:type="page"[^>]*\/>\s*<\/w:r>/gi,
        '<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
      );
      // lastRenderedPageBreak often marks Word pagination — keep as soft visual only via CSS;
      // explicit page breaks above are enough for manual breaks.
      if (docXml === before) return arrayBuffer;
      zip.file('word/document.xml', docXml);
      return await zip.generateAsync({ type: 'arraybuffer' });
    } catch (err) {
      console.warn('injectDocxPageBreakParagraphs failed', err);
      return arrayBuffer;
    }
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
          // Skip firstLine / hanging / small left — they show as unwanted "1 tab" gap
          if (left) {
            const pt = parseInt(left[1], 10) / 20;
            if (pt > 36) {
              styles.push(`margin-left:${Math.min(pt, 72).toFixed(1)}pt`);
            }
          }
          if (right) {
            const pt = parseInt(right[1], 10) / 20;
            if (pt > 0) styles.push(`margin-right:${Math.min(pt, 72).toFixed(1)}pt`);
          }
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
        .replace(/text-indent\s*:\s*-?\d[\d.]*(?:px|pt|em|rem|mm)?;?/gi, '')
        .replace(/margin-left\s*:\s*-?\d[\d.]*(?:px|pt|em|rem|mm)?;?/gi, '')
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

    return this.stripDefaultTabIndent(out);
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
    // Lock signature blank-line gaps + left/right layout into saved HTML
    this.form.bodyHtml = this.preserveSpacingInHtml(this.form.bodyHtml || '');

    if (!String(this.form.name || '').trim()) {
      this.notyf.error('Template name is required');
      return;
    }
    const plain = String(this.form.bodyHtml || '')
      .replace(/<div\b[^>]*\bql-spacer\b[^>]*>[\s\S]*?<\/div>/gi, ' ')
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

    const topPad =
      this.form.topPaddingMm == null || this.form.topPaddingMm === ''
        ? null
        : Math.min(80, Math.max(0, parseInt(String(this.form.topPaddingMm), 10) || 0));

    // Persist letterhead mode explicitly (image → letterheadBlank:false so edit shows it)
    const blankLh =
      this.letterheadMode === 'blank' || this.coerceLetterheadBlank(this.form.letterheadBlank);
    this.form.letterheadBlank = blankLh;

    const payload: any = {
      id: this.form.id,
      name: String(this.form.name).trim(),
      category: this.form.category || 'custom',
      bodyHtml: this.form.bodyHtml,
      letterheadBlank: blankLh,
      topPaddingMm: topPad,
      letterheadPages: this.normalizeLetterheadPages(this.form.letterheadPages),
      letterheadHeaderMm: this.effectiveLhHeaderMm,
      letterheadFooterMm: this.effectiveLhFooterMm,
      pageSize: this.normalizePageSize(this.form.pageSize),
      defaultFontFamily:
        this.normalizeFontFamily(this.form.defaultFontFamily) || 'Times New Roman',
      defaultFontSize: this.normalizeFontSizeToken(this.form.defaultFontSize) || '12pt',
      includeSalaryAnnexure: !!this.form.includeSalaryAnnexure,
      headerFooter: this.normalizeHeaderFooter(this.form.headerFooter),
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
    if (this.coerceLetterheadBlank(row.letterheadBlank)) return 'Blank top';
    const pages = this.normalizeLetterheadPages(row.letterheadPages);
    if (pages === '1') return 'Letterhead (page 1)';
    if (pages === '2') return 'Letterhead (2 pages)';
    return 'Letterhead (all pages)';
  }
}
