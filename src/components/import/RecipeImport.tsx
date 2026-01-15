import { useState } from 'react';
import { Card, Button } from '../common';
import {
  parseRecipeFromUrl,
  parseRecipeFromText,
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

export function RecipeImport({ cookbook, onImportComplete, onCancel }: RecipeImportProps) {
  const [method, setMethod] = useState<ImportMethod>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [documentProgress, setDocumentProgress] = useState<DocumentParseProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUrlImport() {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsed = await parseRecipeFromUrl(url.trim(), setProgress);
      onImportComplete(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import recipe');
    } finally {
      setLoading(false);
    }
  }

  async function handleTextImport() {
    if (!text.trim() || text.trim().length < 50) {
      setError('Please paste a complete recipe (at least 50 characters)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsed = await parseRecipeFromText(text.trim(), setProgress);
      onImportComplete(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse recipe');
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isSupportedFileType(file)) {
      setError(`Unsupported file type: ${file.type}. Please use PDF, image, or text files.`);
      return;
    }

    setSelectedFile(file);
    setError(null);
  }

  async function handleFileImport() {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);
    setDocumentProgress(null);
    setProgress(null);

    try {
      // Step 1: Extract text from document
      const documentResult = await parseDocument(selectedFile, setDocumentProgress);

      if (!documentResult.text || documentResult.text.length < 50) {
        throw new Error('Could not extract enough text from the document. Please try a clearer image or different file.');
      }

      // Show confidence warning for OCR
      if (documentResult.source === 'image' && documentResult.confidence && documentResult.confidence < 0.7) {
        console.warn(`OCR confidence is low: ${Math.round(documentResult.confidence * 100)}%`);
      }

      // Step 2: Parse extracted text into recipe structure
      setDocumentProgress(null); // Clear document progress, switch to recipe parsing
      const parsed = await parseRecipeFromText(documentResult.text, setProgress);

      // Add source information
      parsed.source = {
        type: documentResult.source === 'image' ? 'original' : 'original',
        // Could add more metadata here
      };

      onImportComplete(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setLoading(false);
    }
  }

  const methodButtons: { id: ImportMethod; label: string; icon: string }[] = [
    { id: 'url', label: 'From URL', icon: '🔗' },
    { id: 'text', label: 'Paste Text', icon: '📝' },
    { id: 'file', label: 'Upload File', icon: '📄' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" onClick={onCancel} style={{ marginBottom: '1rem' }}>
          ← Cancel
        </Button>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0 }}>
          Import Recipe
        </h1>
        <p style={{ color: '#6b7280', margin: '0.25rem 0 0' }}>
          Add a new recipe to {cookbook.title}
        </p>
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
                border: `2px solid ${method === id ? '#2563eb' : '#e5e7eb'}`,
                borderRadius: '0.5rem',
                background: method === id ? '#eff6ff' : 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
              <div style={{ fontWeight: 500, color: method === id ? '#2563eb' : '#374151' }}>
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
                color: '#374151',
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
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                marginBottom: '1rem',
              }}
            />
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              Paste a URL from any recipe website. We'll extract the recipe data automatically.
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
                color: '#374151',
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
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '1rem',
              }}
            />
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
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
                color: '#374151',
              }}
            >
              Upload Recipe File
            </label>
            <div
              style={{
                border: `2px dashed ${selectedFile ? '#2563eb' : '#d1d5db'}`,
                borderRadius: '0.5rem',
                padding: '2rem',
                textAlign: 'center',
                marginBottom: '1rem',
                background: selectedFile ? '#eff6ff' : 'white',
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
                {selectedFile ? (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                      {selectedFile.type === 'application/pdf' ? '📄' :
                       selectedFile.type.startsWith('image/') ? '🖼️' : '📝'}
                    </div>
                    <div style={{ fontWeight: 500, color: '#2563eb', marginBottom: '0.25rem' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {getFileTypeDescription(selectedFile)} • {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                      Click to select a different file
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
                    <div style={{ fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                      Click to upload or drag and drop
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
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
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              <strong>Supported formats:</strong> PDF documents, images (JPG, PNG - uses OCR), and text files.
              For best OCR results, use clear, well-lit photos of recipe pages.
            </p>
          </div>
        )}
      </Card>

      {/* Progress */}
      {loading && (documentProgress || progress) && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '2rem',
                height: '2rem',
                border: '3px solid #e5e7eb',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div>
              <div style={{ fontWeight: 500, color: '#111827' }}>
                {documentProgress?.message || progress?.message}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
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
          </div>
          {/* Two-phase progress for file imports */}
          {method === 'file' && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
              {documentProgress ? 'Step 1 of 2: Extracting text' : 'Step 2 of 2: Parsing recipe'}
            </div>
          )}
          <div
            style={{
              marginTop: '0.5rem',
              height: '0.5rem',
              background: '#e5e7eb',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${documentProgress?.progress || progress?.progress || 0}%`,
                height: '100%',
                background: '#2563eb',
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
            background: '#fef2f2',
            border: '1px solid #fecaca',
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 500, color: '#dc2626' }}>Import Failed</div>
              <div style={{ fontSize: '0.875rem', color: '#991b1b', marginTop: '0.25rem' }}>
                {error}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tips */}
      <Card style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534', marginBottom: '0.5rem' }}>
          💡 Tips for best results
        </h3>
        <ul style={{ fontSize: '0.875rem', color: '#15803d', margin: 0, paddingLeft: '1.25rem' }}>
          <li>Include both ingredients and step-by-step instructions</li>
          <li>Specify cooking times and temperatures when available</li>
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
