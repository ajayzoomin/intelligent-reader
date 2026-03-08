import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker — most reliable approach across Vite builds
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface PdfExtractionResult {
  text: string;
  totalPages: number;
  pageTexts: string[];
}

export async function extractTextFromPdf(
  file: File,
  startPage?: number,
  endPage?: number
): Promise<PdfExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPages = pdf.numPages;
  const start = Math.max(1, startPage ?? 1);
  const end = Math.min(totalPages, endPage ?? totalPages);

  const pageTexts: string[] = [];

  for (let pageNum = start; pageNum <= end; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items || [])
        .map((item: unknown) => {
          const typedItem = item as { str?: string };
          return typedItem.str ?? '';
        })
        .join(' ');
      pageTexts.push(pageText.trim());
    } catch {
      pageTexts.push(''); // Blank page or unreadable — skip gracefully
    }
  }

  const text = pageTexts.filter(Boolean).join('\n\n');

  return { text, totalPages, pageTexts };
}

export async function extractTocPages(file: File, pageCount = 15): Promise<string> {
  const result = await extractTextFromPdf(file, 1, pageCount);
  return result.text;
}

/**
 * Render PDF pages to JPEG images and return them as base64 data URLs.
 * Samples evenly across the page range if there are more pages than maxPages.
 */
export async function extractPageImages(
  file: File,
  startPage?: number,
  endPage?: number,
  maxPages = 15,
  scale = 1.5
): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPages = pdf.numPages;
  const start = Math.max(1, startPage ?? 1);
  const end = Math.min(totalPages, endPage ?? totalPages);
  const range = end - start + 1;

  // Build the list of page numbers to render (evenly sampled if needed)
  const pageNums: number[] = [];
  if (range <= maxPages) {
    for (let i = start; i <= end; i++) pageNums.push(i);
  } else {
    for (let i = 0; i < maxPages; i++) {
      pageNums.push(Math.round(start + (i * (range - 1)) / (maxPages - 1)));
    }
  }

  const images: string[] = [];

  for (const pageNum of pageNums) {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      await page.render({ canvasContext: ctx, viewport }).promise;
      images.push(canvas.toDataURL('image/jpeg', 0.75));
    } catch {
      // Skip unrenderable pages silently
    }
  }

  return images;
}
