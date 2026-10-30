/**
 * Export HTML → PDF using html2canvas-pro (supports Chrome `color()` / oklch)
 * + jsPDF. Avoids html2canvas@1.4.1 crash: unsupported color function "color".
 */
export async function downloadHtmlAsPdf(opts: {
  html: string;
  filename: string;
  widthMm?: number;
  heightMm?: number;
  /** Mutate iframe document after write (e.g. pagination). */
  prepare?: (doc: Document) => void;
}): Promise<void> {
  const widthMm = opts.widthMm ?? 210;
  const heightMm = opts.heightMm ?? 297;
  const filename = opts.filename.endsWith('.pdf')
    ? opts.filename
    : `${opts.filename}.pdf`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    `position:fixed;left:-12000px;top:0;width:${widthMm}mm;height:${heightMm}mm;` +
    'border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!idoc) {
    iframe.remove();
    throw new Error('PDF frame failed');
  }

  let html = String(opts.html || '');
  if (!/^\s*<!DOCTYPE html/i.test(html) && !/<html[\s>]/i.test(html)) {
    html =
      `<!DOCTYPE html><html><head><meta charset="utf-8">` +
      `<style>html,body{margin:0;padding:0;background:#fff;}` +
      `*{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }</style>` +
      `</head><body>${html}</body></html>`;
  }
  html = stripUnsupportedCssColors(html);

  idoc.open();
  idoc.write(html);
  idoc.close();

  await new Promise((r) => setTimeout(r, 100));
  await Promise.all(
    Array.from(idoc.images || []).map((img) =>
      img.complete ? Promise.resolve() : img.decode().catch(() => undefined),
    ),
  );

  try {
    opts.prepare?.(idoc);
  } catch (_) {
    /* ignore */
  }

  // Prefer modern canvas that understands color()/oklch from Chrome getComputedStyle
  const html2canvasMod: any = await import('html2canvas-pro');
  const html2canvas = html2canvasMod.default ?? html2canvasMod;
  const jspdfMod: any = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default?.jsPDF ?? jspdfMod.default;

  try {
    const pages = Array.from(
      idoc.querySelectorAll('.page, .sheet, [data-pdf-page]'),
    ) as HTMLElement[];
    const targets = pages.length ? pages : [idoc.body];

    const pdf = new jsPDF({
      unit: 'mm',
      format: [widthMm, heightMm],
      orientation: 'portrait',
      compress: true,
    });

    for (let i = 0; i < targets.length; i++) {
      const el = targets[i];
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: el.scrollWidth || el.offsetWidth,
        windowHeight: el.scrollHeight || el.offsetHeight,
        onclone: (clonedDoc: Document) => {
          // Drop any leaked app stylesheets from the clone
          Array.from(
            clonedDoc.querySelectorAll('link[rel="stylesheet"]'),
          ).forEach((n) => n.remove());
          scrubUnsupportedColorsInDom(clonedDoc);
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) pdf.addPage([widthMm, heightMm], 'portrait');

      // Fit width; crop/split vertically across pages if taller than one sheet
      const imgW = widthMm;
      const imgH = (canvas.height * widthMm) / canvas.width;

      if (imgH <= heightMm + 0.5) {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
      } else {
        // Slice tall canvas across multiple PDF pages
        let yOffsetMm = 0;
        let sliceIndex = 0;
        while (yOffsetMm < imgH - 0.1) {
          if (sliceIndex > 0) pdf.addPage([widthMm, heightMm], 'portrait');
          pdf.addImage(imgData, 'JPEG', 0, -yOffsetMm, imgW, imgH);
          yOffsetMm += heightMm;
          sliceIndex++;
        }
      }
    }

    pdf.save(filename);
  } finally {
    iframe.remove();
  }
}

/** Remove modern CSS color funcs from text (belt-and-suspenders). */
function stripUnsupportedCssColors(html: string): string {
  return String(html || '').replace(
    /(color-mix|oklch|oklab|lab|lch|color)\(\s*[^)]*\)/gi,
    '#000000',
  );
}

function scrubUnsupportedColorsInDom(doc: Document): void {
  doc.querySelectorAll('[style]').forEach((el) => {
    const s = el.getAttribute('style') || '';
    if (/(color-mix|oklch|oklab|lab|lch|color)\s*\(/i.test(s)) {
      el.setAttribute('style', stripUnsupportedCssColors(s));
    }
  });
  doc.querySelectorAll('style').forEach((styleEl) => {
    const css = styleEl.textContent || '';
    if (/(color-mix|oklch|oklab|lab|lch|color)\s*\(/i.test(css)) {
      styleEl.textContent = stripUnsupportedCssColors(css);
    }
  });
}
