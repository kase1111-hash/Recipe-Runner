// Share Modal Component
// Phase 7 Feature - Share recipes and cookbooks

import { useState } from 'react';
import { Button } from './Button';
import {
  shareRecipe,
  canNativeShare,
  nativeShare,
  generateShareText,
  shareToTwitter,
  shareToFacebook,
  shareViaEmail,
  getRecipeQRCode,
  type ShareLink,
} from '../../services/sharing';
import { exportRecipe, copyToClipboard, downloadAsFile } from '../../services/export';
import type { Recipe } from '../../types';

interface ShareModalProps {
  recipe: Recipe;
  onClose: () => void;
}

type ShareTab = 'link' | 'social' | 'export';

export function ShareModal({ recipe, onClose }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<ShareTab>('link');
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  async function handleCreateLink() {
    const link = shareRecipe(recipe, { expiresInDays });
    setShareLink(link);
  }

  async function handleCopyLink() {
    if (!shareLink) return;
    await copyToClipboard(shareLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleNativeShare() {
    const text = generateShareText(recipe);
    const success = await nativeShare({
      title: recipe.name,
      text,
      url: shareLink?.url,
    });

    if (!success) {
      // Fallback to copy
      await handleCopyLink();
    }
  }

  function handleExport(format: 'json' | 'markdown' | 'text') {
    const content = exportRecipe(recipe, { format });
    const extensions = { json: 'json', markdown: 'md', text: 'txt' };
    const filename = `${recipe.name.toLowerCase().replace(/\s+/g, '-')}.${extensions[format]}`;
    downloadAsFile(content, filename, format === 'json' ? 'application/json' : 'text/plain');
  }

  async function handleCopyExport(format: 'json' | 'markdown' | 'text') {
    const content = exportRecipe(recipe, { format });
    await copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '0.75rem',
          width: '100%',
          maxWidth: '450px',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
            Share Recipe
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            x
          </button>
        </div>

        {/* Recipe Preview */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontWeight: 500, color: '#111827' }}>{recipe.name}</div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
            {recipe.yield} | {recipe.total_time}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          {(['link', 'social', 'export'] as ShareTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === tab ? '#2563eb' : '#6b7280',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'link' ? 'Share Link' : tab === 'social' ? 'Social' : 'Export'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '1.5rem' }}>
          {activeTab === 'link' && (
            <div>
              {!shareLink ? (
                <>
                  <p style={{ color: '#6b7280', margin: '0 0 1rem', fontSize: '0.875rem' }}>
                    Create a shareable link to this recipe. Anyone with the link can view it.
                  </p>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Link expires after:
                    </label>
                    <select
                      value={expiresInDays ?? 'never'}
                      onChange={(e) => setExpiresInDays(e.target.value === 'never' ? undefined : parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                      }}
                    >
                      <option value="never">Never</option>
                      <option value="1">1 day</option>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                    </select>
                  </div>

                  <Button variant="primary" onClick={handleCreateLink} style={{ width: '100%' }}>
                    Create Share Link
                  </Button>
                </>
              ) : (
                <>
                  <div
                    style={{
                      padding: '0.75rem',
                      background: '#f3f4f6',
                      borderRadius: '0.375rem',
                      marginBottom: '1rem',
                      wordBreak: 'break-all',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {shareLink.url}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Button
                      variant="primary"
                      onClick={handleCopyLink}
                      style={{ flex: 1 }}
                    >
                      {copied ? 'Copied!' : 'Copy Link'}
                    </Button>
                    {canNativeShare() && (
                      <Button
                        variant="secondary"
                        onClick={handleNativeShare}
                        style={{ flex: 1 }}
                      >
                        Share...
                      </Button>
                    )}
                  </div>

                  <button
                    onClick={() => setShowQR(!showQR)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'none',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      color: '#6b7280',
                      fontSize: '0.875rem',
                    }}
                  >
                    {showQR ? 'Hide QR Code' : 'Show QR Code'}
                  </button>

                  {showQR && (
                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                      <img
                        src={getRecipeQRCode(shareLink.shareCode)}
                        alt="QR Code"
                        style={{
                          width: '150px',
                          height: '150px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                        }}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                        Scan to view recipe
                      </p>
                    </div>
                  )}

                  {shareLink.expiresAt && (
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '1rem', textAlign: 'center' }}>
                      Link expires {new Date(shareLink.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'social' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ color: '#6b7280', margin: '0 0 0.5rem', fontSize: '0.875rem' }}>
                Share this recipe on social media
              </p>

              <button
                onClick={() => shareToTwitter(generateShareText(recipe), shareLink?.url)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: '#1da1f2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>X</span>
                Share on X (Twitter)
              </button>

              <button
                onClick={() => shareLink && shareToFacebook(shareLink.url)}
                disabled={!shareLink}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: shareLink ? '#1877f2' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: shareLink ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>f</span>
                Share on Facebook
                {!shareLink && <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(create link first)</span>}
              </button>

              <button
                onClick={() => shareViaEmail(recipe)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>@</span>
                Send via Email
              </button>

              {canNativeShare() && (
                <button
                  onClick={handleNativeShare}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: '#374151',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>...</span>
                  More Options
                </button>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div>
              <p style={{ color: '#6b7280', margin: '0 0 1rem', fontSize: '0.875rem' }}>
                Download or copy recipe in different formats
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* JSON */}
                <div
                  style={{
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>JSON Format</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Full recipe data, importable
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button variant="secondary" onClick={() => handleCopyExport('json')}>
                        Copy
                      </Button>
                      <Button variant="secondary" onClick={() => handleExport('json')}>
                        Download
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Markdown */}
                <div
                  style={{
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>Markdown</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Formatted for notes apps
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button variant="secondary" onClick={() => handleCopyExport('markdown')}>
                        Copy
                      </Button>
                      <Button variant="secondary" onClick={() => handleExport('markdown')}>
                        Download
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Plain Text */}
                <div
                  style={{
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>Plain Text</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Simple, readable format
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button variant="secondary" onClick={() => handleCopyExport('text')}>
                        Copy
                      </Button>
                      <Button variant="secondary" onClick={() => handleExport('text')}>
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {copied && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem',
                    background: '#d1fae5',
                    borderRadius: '0.375rem',
                    textAlign: 'center',
                    color: '#065f46',
                    fontSize: '0.875rem',
                  }}
                >
                  Copied to clipboard!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple Share Button
interface ShareButtonProps {
  recipe: Recipe;
  variant?: 'primary' | 'secondary';
}

export function ShareButton({ recipe, variant = 'secondary' }: ShareButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button variant={variant} onClick={() => setShowModal(true)}>
        Share
      </Button>
      {showModal && (
        <ShareModal recipe={recipe} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
