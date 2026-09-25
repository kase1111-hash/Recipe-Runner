import { useEffect, useRef, useState } from 'react';
import { Card, Button } from '../common';
import {
  parseRecipeFromUrl,
  parseRecipeFromText,
  createBlankRecipe,
  isAbortError,
  type ParsedRecipe,
  type ParseProgress,
} from '../../services/recipeParser';
import {
  parseDocument,
  isSupportedFileType,
  getFileTypeDescription,
  type DocumentParseProgress,
} from '../../services/documentParsing';
import type { Cookbook } from '../../types';

interface RecipeImportProps {
  cookbook: Cookbook;
  onImportComplete: (recipe: ParsedRecipe) => void;
  onCancel: () => void;
}

type ImportMethod = 'url' | 'text' | 'file';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/** Returns the normalized href for an http(s) URL, or null if it isn't one */
function toWebUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

export function RecipeImport({ cookbook, onImportComplete, onCancel }: RecipeImportProps) {
  // Paste Text is the default: the browser can't download most recipe pages,
  // so URL import usually fails (see fetchRecipeUrl in recipeParser)
  const [method, setMethod] = useState<ImportMethod>('text');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [documentProgress, setDocumentProgress] = useState<DocumentParseProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The in-flight import. It is aborted when this screen closes (Cancel/Escape)
  // or the user presses Stop, so a late result can never take over the app.
  const importRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      importRef.current?.abort();
      importRef.current = null;
    };
  }, []);

  // A file dropped anywhere outside the drop zone would make the browser open
  // it in place of the app. Refuse stray file drops while this screen is open.
  useEffect(() => {
    function refuseFileDrop(event: DragEvent) {
      if (event.defaultPrevented || !event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'none';
    }
    window.addEventListener('dragover', refuseFileDrop);
    window.addEventListener('drop', refuseFileDrop);
    return () => {
      window.removeEventListener('dragover', refuseFileDrop);
      window.removeEventListener('drop', refuseFileDrop);
    };
  }, []);

  async function runImport(task: (signal: AbortSignal) => Promise<ParsedRecipe>, fallbackError: string) {
    importRef.current?.abort();
    const controller = new AbortController();
    importRef.current = controller;

    setLoading(true);
    setError(null);
    setProgress(null);
    setDocumentProgress(null);

    try {
      const parsed = await task(controller.signal);
      // Never deliver a result after the screen closed or the user pressed Stop
      if (controller.signal.aborted || !mountedRef.current) return;
      onImportComplete(parsed);
    } catch (err) {
      if (controller.signal.aborted || !mountedRef.current || isAbortError(err)) return;
      setError(err instanceof Error ? err.message : fallbackError);
    } finally {
      if (importRef.current === controller) {
        importRef.current = null;
        if (mountedRef.current) setLoading(false);
      }
    }
  }

  /** Progress callback that goes quiet once its import is stopped */
  function progressFor(signal: AbortSignal) {
    return (next: ParseProgress) => {
      if (!signal.aborted) setProgress(next);
    };
  }

  function handleStop() {
    importRef.current?.abort();
    importRef.current = null;
    setLoading(false);
    setProgress(null);
    setDocumentProgress(null);
  }

  function handleEnterManually() {
    // Abandon any parse in progress; the editor opens with a blank recipe
    importRef.current?.abort();
    importRef.current = null;
    onImportComplete(createBlankRecipe());
  }

  function handleUrlImport() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a URL');
      return;
    }
    const href = toWebUrl(trimmed);
    if (!href) {
      setError('Enter a full web address starting with https://');
      return;
    }

    void runImport(
      (signal) => parseRecipeFromUrl(href, progressFor(signal), signal),
      'Failed to import recipe'
    );
  }

  function handleTextImport() {
    if (!text.trim() || text.trim().length < 50) {
      setError('Please paste a complete recipe (at least 50 characters)');
      return;
    }

    void runImport(
      (signal) => parseRecipeFromText(text.trim(), progressFor(signal), signal),
      'Failed to parse recipe'
    );
  }

  /** Shared by the file picker and drag-and-drop */
  function selectFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      setError(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). ` +
        `Maximum size is 10 MB.`
      );
      return;
    }

    if (!isSupportedFileType(file)) {
      setError(`Unsupported file type: ${file.type || file.name}. Please use PDF, image, or text files.`);
      return;
    }

    setSelectedFile(file);
    setError(null);
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the input so selecting the same file again re-fires onChange
    // (e.g. after a validation error or failed extraction)
    event.target.value = '';
    if (file) selectFile(file);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    // preventDefault marks the zone as a drop target; without it the browser
    // navigates away from the app to open the dropped file
    event.preventDefault();
    event.dataTransfer.dropEffect = loading ? 'none' : 'copy';
    if (!loading) setDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    // Moving between the zone's own children also fires dragleave
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDragActive(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (loading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) selectFile(file);
  }

  function handleFileImport() {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }
    const file = selectedFile;

    void runImport(async (signal) => {
      // Step 1: Extract text from document
      const documentResult = await parseDocument(file, (next) => {
        if (!signal.aborted) setDocumentProgress(next);
      });

      if (!documentResult.text || documentResult.text.length < 50) {
        throw new Error('Could not extract enough text from the document. Please try a clearer image or different file.');
      }

      // Show confidence warning for OCR
      if (documentResult.source === 'image' && documentResult.confidence && documentResult.confidence < 0.7) {
        console.warn(`OCR confidence is low: ${Math.round(documentResult.confidence * 100)}%`);
      }

      // Step 2: Parse extracted text into recipe structure
      if (!signal.aborted) setDocumentProgress(null); // Switch to recipe parsing progress
      const parsed = await parseRecipeFromText(documentResult.text, progressFor(signal), signal);

      // Add source information
      parsed.source = {
        type: documentResult.source === 'image' ? 'ocr' : 'pdf',
      };
      // Poor OCR means the parse deserves a closer review in the editor
      if (documentResult.confidence !== undefined) {
        parsed.confidence = Math.min(parsed.confidence, documentResult.confidence);
      }

      return parsed;
    }, 'Failed to import file');
  }

  const methodButtons: { id: ImportMethod; label: string; icon: string }[] = [
    { id: 'text', label: 'Paste Text', icon: '📝' },
    { id: 'file', label: 'Upload File', icon: '📄' },
    { id: 'url', label: 'From URL', icon: '🔗' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" onClick={onCancel} style={{ marginBottom: '1rem' }}>
          ← Cancel
        </Button>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Import Recipe
            </h1>
            <p style={{ color: 'var(--text-tertiary)', margin: '0.25rem 0 0' }}>
              Add a new recipe to {cookbook.title}
            </p>
          </div>
          <Button variant="secondary" onClick={handleEnterManually}>
            ✍️ Enter Manually
          </Button>
        </div>
      </header>

      {/* Method Selection */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {methodButtons.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => {
                setMethod(id);
                setError(null);
              }}
              disabled={loading}
              style={{
                flex: 1,
                padding: '1rem',
                border: `2px solid ${method === id ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                borderRadius: '0.5rem',
                background: method === id ? 'var(--accent-light)' : 'var(--card-bg)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
              <div style={{ fontWeight: 500, color: method === id ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                {label}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Import Form */}
      <Card style={{ marginBottom: '1.5rem' }}>
        {method === 'url' && (
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              Recipe URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/recipes/delicious-dish"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-secondary)',
                borderRadius: '0.5rem',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                marginBottom: '1rem',
              }}
            />
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
              Most recipe websites don't allow their pages to be downloaded from the browser, so this
              often fails. If it does, open the recipe, copy its text, and use <strong>Paste Text</strong> instead.
            </p>
            <Button onClick={handleUrlImport} disabled={loading || !url.trim()}>
              {loading ? 'Importing...' : 'Import from URL'}
            </Button>
          </div>
        )}

        {method === 'text' && (
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              Recipe Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Paste your recipe here...

Example:
Classic Chocolate Chip Cookies

Ingredients:
- 2 1/4 cups flour
- 1 cup butter, softened
...

Instructions:
1. Preheat oven to 375°F
2. Cream butter and sugars...`}
              disabled={loading}
              style={{
                width: '100%',
                minHeight: '300px',
                padding: '0.75rem',
                border: '1px solid var(--border-secondary)',
                borderRadius: '0.5rem',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '1rem',
              }}
            />
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
              Paste a complete recipe including ingredients and instructions.
            </p>
            <Button onClick={handleTextImport} disabled={loading || text.trim().length < 50}>
              {loading ? 'Parsing...' : 'Parse Recipe'}
            </Button>
          </div>
        )}

        {method === 'file' && (
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              Upload Recipe File
            </label>
            <div
              onDragEnter={handleDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${selectedFile || dragActive ? 'var(--accent-primary)' : 'var(--border-secondary)'}`,
                borderRadius: '0.5rem',
                padding: '2rem',
                textAlign: 'center',
                marginBottom: '1rem',
                background: selectedFile || dragActive ? 'var(--accent-light)' : 'var(--card-bg)',
              }}
            >
              <input
                type="file"
                accept=".txt,.pdf,image/*"
                onChange={handleFileSelect}
                disabled={loading}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                style={{
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'block',
                }}
              >
                {dragActive ? (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📥</div>
                    <div style={{ fontWeight: 500, color: 'var(--accent-primary)' }}>
                      Drop the file to select it
                    </div>
                  </>
                ) : selectedFile ? (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                      {selectedFile.type === 'application/pdf' ? '📄' :
                       selectedFile.type.startsWith('image/') ? '🖼️' : '📝'}
                    </div>
                    <div style={{ fontWeight: 500, color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                      {getFileTypeDescription(selectedFile)} • {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Click or drop to select a different file
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
                    <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Click to upload or drag and drop
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                      PDF, images (with OCR), or text files
                    </div>
                  </>
                )}
              </label>
            </div>
            {selectedFile && (
              <Button
                onClick={handleFileImport}
                disabled={loading}
                style={{ width: '100%', marginBottom: '1rem' }}
              >
                {loading ? 'Processing...' : `Import from ${getFileTypeDescription(selectedFile)}`}
              </Button>
            )}
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
              <strong>Supported formats:</strong> PDF documents, images (JPG, PNG - uses OCR), and text files.
              For best OCR results, use clear, well-lit photos of recipe pages.
            </p>
          </div>
        )}
      </Card>

      {/* Progress */}
      {loading && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '2rem',
                height: '2rem',
                flexShrink: 0,
                border: '3px solid var(--border-primary)',
                borderTopColor: 'var(--accent-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                {documentProgress?.message || progress?.message || 'Starting...'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                {documentProgress ? (
                  documentProgress.currentPage && documentProgress.totalPages ? (
                    `Page ${documentProgress.currentPage} of ${documentProgress.totalPages} • ${documentProgress.progress}%`
                  ) : (
                    `${documentProgress.progress}% complete`
                  )
                ) : (
                  `${progress?.progress || 0}% complete`
                )}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleStop}>
              Stop
            </Button>
          </div>
          {/* Two-phase progress for file imports */}
          {method === 'file' && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              {documentProgress ? 'Step 1 of 2: Extracting text' : 'Step 2 of 2: Parsing recipe'}
            </div>
          )}
          <div
            style={{
              marginTop: '0.5rem',
              height: '0.5rem',
              background: 'var(--progress-track)',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${documentProgress?.progress || progress?.progress || 0}%`,
                height: '100%',
                background: 'var(--accent-primary)',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card
          style={{
            marginBottom: '1.5rem',
            background: 'var(--error-bg)',
            border: '1px solid var(--error-border)',
          }}
        >
          <div role="alert" style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--error)' }}>Import Failed</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--error-text)', marginTop: '0.25rem' }}>
                {error}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {method === 'url' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setMethod('text');
                      setError(null);
                    }}
                  >
                    📝 Paste Text Instead
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={handleEnterManually}>
                  ✍️ Enter Manually
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tips */}
      <Card style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success-text)', marginBottom: '0.5rem' }}>
          💡 Tips for best results
        </h3>
        <ul style={{ fontSize: '0.875rem', color: 'var(--success)', margin: 0, paddingLeft: '1.25rem' }}>
          <li>Include both ingredients and step-by-step instructions</li>
          <li>Specify cooking times and temperatures when available</li>
          <li>Parsing uses your local Ollama model — without it, choose Enter Manually</li>
          <li>The AI will generate visual prompts for each step</li>
          <li>You can edit the parsed recipe before saving</li>
        </ul>
      </Card>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
