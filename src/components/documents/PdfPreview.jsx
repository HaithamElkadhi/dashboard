import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;
const button = 'min-h-11 rounded-lg border border-border bg-white px-3 text-xs text-navy disabled:opacity-40';
export default function PdfPreview({ url, name }) {
  const canvas = useRef(null), container = useRef(null);
  const [pdf, setPdf] = useState(null), [pageNumber, setPageNumber] = useState(1), [error, setError] = useState(''), [busy, setBusy] = useState(true);
  const [width, setWidth] = useState(400);
  useEffect(() => { const observer = new ResizeObserver(entries => setWidth(Math.min(1000, Math.max(180, Math.floor(entries[0].contentRect.width - 16))))); if (container.current) observer.observe(container.current); return () => observer.disconnect(); }, []);
  useEffect(() => {
    let active = true; setPdf(null); setError(''); setBusy(true); setPageNumber(1);
    const task = getDocument({ url, isEvalSupported: false });
    task.promise.then(doc => { if (active) setPdf(doc); }).catch(() => { if (active) { setError('PDF preview unavailable. Use Open file or Download below.'); setBusy(false); } });
    return () => { active = false; task.destroy(); };
  }, [url]);
  useEffect(() => {
    if (!pdf) return;
    let active = true, render;
    setBusy(true);
    pdf.getPage(pageNumber).then(page => {
      if (!active || !canvas.current) return;
      const natural = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / natural.width });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.current.width = Math.floor(viewport.width * ratio); canvas.current.height = Math.floor(viewport.height * ratio);
      canvas.current.style.width = viewport.width + 'px'; canvas.current.style.height = viewport.height + 'px';
      render = page.render({ canvasContext: canvas.current.getContext('2d'), viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0] });
      return render.promise;
    }).then(() => { if (active) setBusy(false); }).catch(err => { if (active && err.name !== 'RenderingCancelledException') { setError('This page could not be rendered. Open the file below.'); setBusy(false); } });
    return () => { active = false; render?.cancel(); };
  }, [pdf, pageNumber, width]);
  return <div ref={container} className="min-w-0 space-y-2">
    {pdf && <div className="flex items-center justify-between gap-2"><button className={button} disabled={pageNumber === 1 || busy} onClick={() => setPageNumber(page => page - 1)}>Previous</button><span className="text-xs text-text-muted">Page {pageNumber} / {pdf.numPages}</span><button className={button} disabled={pageNumber === pdf.numPages || busy} onClick={() => setPageNumber(page => page + 1)}>Next</button></div>}
    <div className="relative max-h-[60vh] min-h-32 overflow-auto rounded-lg border border-border bg-canvas p-2">{busy && <p role="status" className="absolute left-2 top-2 rounded bg-white/90 px-3 py-2 text-center text-sm text-text-muted">Loading PDF…</p>}{error && <p role="alert" className="p-4 text-sm text-text-muted">{error}</p>}<canvas ref={canvas} role="img" aria-label={`${name}, page ${pageNumber}`} className={error || !pdf ? 'hidden' : 'mx-auto block max-w-full bg-white'} /></div>
  </div>;
}
