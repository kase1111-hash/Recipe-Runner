// Document Parsing Service
// Phase 9 Feature - PDF and Image/OCR Import Support

// Lazy-loaded module caches
let pdfjsModule: typeof import('pdfjs-dist') | null = null;
let tesseractModule: typeof import('tesseract.js') | null = null;

async function ensurePdfJs(): Promise<typeof import('pdfjs-dist')> {
  if (pdfjsModule) {
    return pdfjsModule;
  }

  const mod = await import('pdfjs-dist');
  pdfjsModule = mod;

  // Configure the worker using CDN sources with fallback
  const version = mod.version;
  const workerSources = [
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`,
    `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`,
    `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`,
  ];

  for (const src of workerSources) {
    try {
      const response = await fetch(src, { method: 'HEAD', mode: 'cors' });
      if (response.ok) {
        mod.GlobalWorkerOptions.workerSrc = src;
        return mod;
      }
    } catch {
      // Try next source
      continue;
    }
  }

  // Fallback to first source even if we couldn't verify
  mod.GlobalWorkerOptions.workerSrc = workerSources[0];
  return mod;
}

async function ensureTesseract(): Promise<typeof import('tesseract.js')> {
  if (tesseractModule) {
    return tesseractModule;
  }

  const mod = await import('tesseract.js');
  tesseractModule = mod;
  return mod;
}

// ============================================
// Types
// ============================================

export interface DocumentParseProgress {
  stage: 'loading' | 'processing' | 'extracting' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
  currentPage?: number;
  totalPages?: number;
}

export interface DocumentParseResult {
  text: string;
  pageCount: number;
  source: 'pdf' | 'image';
  confidence?: number; // For OCR results
}

// ============================================
// PDF Parsing
// ============================================

export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: DocumentParseProgress) => void
): Promise<DocumentParseResult> {
  onProgress?.({
    stage: 'loading',
    message: 'Loading PDF document...',
    progress: 5,
  });

  const pdfjsLib = await ensurePdfJs();

  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    onProgress?.({
      stage: 'processing',
      message: 'Processing PDF...',
      progress: 10,
    });

    // Load PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    onProgress?.({
      stage: 'extracting',
      message: `Extracting text from ${numPages} pages...`,
      progress: 15,
      currentPage: 0,
      totalPages: numPages,
    });

    // Extract text from each page
    const textParts: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items with proper spacing
      const pageText = textContent.items
        .map((item) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .join(' ');

      textParts.push(pageText);

      const progressPercent = 15 + Math.round((pageNum / numPages) * 80);
      onProgress?.({
        stage: 'extracting',
        message: `Extracting page ${pageNum} of ${numPages}...`,
        progress: progressPercent,
        currentPage: pageNum,
        totalPages: numPages,
      });
    }

    // Combine all pages
    const fullText = textParts.join('\n\n').trim();

    // Clean up excessive whitespace
    const cleanedText = fullText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    onProgress?.({
      stage: 'complete',
      message: 'PDF text extraction complete!',
      progress: 100,
    });

    return {
      text: cleanedText,
      pageCount: numPages,
      source: 'pdf',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    onProgress?.({
      stage: 'error',
      message: `Failed to parse PDF: ${errorMessage}`,
      progress: 0,
    });
    throw new Error(`PDF parsing failed: ${errorMessage}`);
  }
}

// ============================================
// OCR / Image Processing
// ============================================

export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: DocumentParseProgress) => void
): Promise<DocumentParseResult> {
  onProgress?.({
    stage: 'loading',
    message: 'Loading image...',
    progress: 5,
  });

  try {
    // Convert file to data URL for Tesseract
    const imageUrl = await fileToDataUrl(file);

    onProgress?.({
      stage: 'processing',
      message: 'Initializing OCR engine...',
      progress: 10,
    });

    const Tesseract = await ensureTesseract();

    // Perform OCR using Tesseract.js
    const result = await Tesseract.recognize(imageUrl, 'eng', {
      logger: (info: { status: string; progress: number }) => {
        if (info.status === 'recognizing text') {
          const progressPercent = 10 + Math.round(info.progress * 85);
          onProgress?.({
            stage: 'extracting',
            message: `Recognizing text... ${Math.round(info.progress * 100)}%`,
            progress: progressPercent,
          });
        } else if (info.status === 'loading tesseract core') {
          onProgress?.({
            stage: 'processing',
            message: 'Loading OCR engine...',
            progress: 15,
          });
        } else if (info.status === 'initializing tesseract') {
          onProgress?.({
            stage: 'processing',
            message: 'Initializing OCR...',
            progress: 20,
          });
        } else if (info.status === 'loading language traineddata') {
          onProgress?.({
            stage: 'processing',
            message: 'Loading language data...',
            progress: 25,
          });
        }
      },
    });

    const text = result.data.text.trim();
    const confidence = result.data.confidence / 100;

    // Clean up OCR artifacts
    const cleanedText = cleanOCRText(text);

    onProgress?.({
      stage: 'complete',
      message: `OCR complete (${Math.round(confidence * 100)}% confidence)`,
      progress: 100,
    });

    return {
      text: cleanedText,
      pageCount: 1,
      source: 'image',
      confidence,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    onProgress?.({
      stage: 'error',
      message: `OCR failed: ${errorMessage}`,
      progress: 0,
    });
    throw new Error(`OCR processing failed: ${errorMessage}`);
  }
}

// ============================================
// Utilities
// ============================================

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function cleanOCRText(text: string): string {
  return text
    // Fix common OCR mistakes
    .replace(/\|/g, 'I') // Pipe often misread as I
    .replace(/0(?=[a-zA-Z])/g, 'O') // Zero before letters is often O
    .replace(/l(?=\d)/g, '1') // lowercase L before numbers is often 1
    // Clean up spacing
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    // Fix common recipe-related OCR issues
    .replace(/tablespcon/gi, 'tablespoon')
    .replace(/teaspcon/gi, 'teaspoon')
    .replace(/oup/gi, 'cup')
    .trim();
}

// ============================================
// Combined Parser
// ============================================

export async function parseDocument(
  file: File,
  onProgress?: (progress: DocumentParseProgress) => void
): Promise<DocumentParseResult> {
  const fileType = file.type;

  if (fileType === 'application/pdf') {
    return extractTextFromPDF(file, onProgress);
  } else if (fileType.startsWith('image/')) {
    return extractTextFromImage(file, onProgress);
  } else if (fileType === 'text/plain') {
    // Plain text - just read directly
    const text = await file.text();
    return {
      text,
      pageCount: 1,
      source: 'pdf', // Treating as similar to PDF for source tracking
    };
  } else {
    // Try to read as text for unknown types
    try {
      const text = await file.text();
      return {
        text,
        pageCount: 1,
        source: 'pdf',
      };
    } catch {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }
}

// ============================================
// Supported Format Check
// ============================================

export function isSupportedFileType(file: File): boolean {
  const supportedTypes = [
    'application/pdf',
    'text/plain',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
  ];

  return supportedTypes.includes(file.type) || file.type.startsWith('image/');
}

export function getFileTypeDescription(file: File): string {
  if (file.type === 'application/pdf') {
    return 'PDF Document';
  } else if (file.type === 'text/plain') {
    return 'Text File';
  } else if (file.type.startsWith('image/')) {
    return 'Image (OCR)';
  }
  return 'Unknown';
}
