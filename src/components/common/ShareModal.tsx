// Share Modal Component
// Phase 7 Feature - Share recipes and cookbooks

import { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import {
  createShareLink,
  canNativeShare,
  nativeShare,
  generateShareText,
  shareToTwitter,
  shareToFacebook,
  shareViaEmail,
  canEncodeAsQRCode,
  generateQRCodeDataUrl,
  SHARE_EXPORT_OPTIONS,
} from '../../services/sharing';
import { exportRecipe, copyToClipboard, downloadAsFile } from '../../services/export';
import type { Recipe } from '../../types';

interface ShareModalProps {
  recipe: Recipe;
  onClose: () => void;
}

type ShareTab = 'link' | 'social' | 'export';
type ExportFormat = 'json' | 'markdown' | 'text';

type LinkState =
  | { status: 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'error' };

type QRCodeState =
  | { status: 'loading' }
  | { status: 'ready'; dataUrl: string }
  | { status: 'error' };

interface CopyFeedback {
  target: 'link' | 'export';
  ok: boolean;
}

// Neutral button colors that read well in both light and dark themes
const secondaryActionStyle = {
  background: 'var(--btn-secondary-bg)',
  color: 'var(--btn-secondary-text)',
  border: '1px solid var(--border-secondary)',
};

const errorBoxStyle = {
  padding: '0.75rem',
  background: 'var(--error-bg)',
  border: '1px solid var(--error-border)',
  borderRadius: '0.375rem',
  color: 'var(--error-text)',
  fontSize: '0.875rem',
};

export function ShareModal({ recipe, onClose }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<ShareTab>('link');
  const [link, setLink] = useState<LinkState>({ status: 'loading' });
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState<QRCodeState | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const shareUrl = link.status === 'ready' ? link.url : null;

  // The link carries the whole recipe (no server), so it can be built as soon
  // as the modal opens and the social buttons work straight away.
  useEffect(() => {
    let cancelled = false;
    createShareLink(recipe)
      .then((url) => {
        if (!cancelled) setLink({ status: 'ready', url });
      })
      .catch((error) => {
        console.error('Failed to create share link:', error);
        if (!cancelled) setLink({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [recipe]);

  useEffect(() => {
    return () => clearTimeout(feedbackTimer.current);
  }, []);

  function showCopyFeedback(target: CopyFeedback['target'], ok: boolean) {
    clearTimeout(feedbackTimer.current);
    setCopyFeedback({ target, ok });
    // Failures stay up longer since they tell the user what to do instead
    feedbackTimer.current = setTimeout(() => setCopyFeedback(null), ok ? 2000 : 5000);
  }

  async function handleCopyLink() {
    if (!shareUrl) return;
    try {
      await copyToClipboard(shareUrl);
      showCopyFeedback('link', true);
    } catch {
      showCopyFeedback('link', false);
    }
  }

  async function handleNativeShare() {
    const text = generateShareText(recipe);
    const success = await nativeShare({
      title: recipe.name,
      text,
      url: shareUrl ?? undefined,
    });

    if (!success) {
      // Fallback to copy
      await handleCopyLink();
    }
  }

  async function handleToggleQR() {
    const next = !showQR;
    setShowQR(next);
    if (!next || !shareUrl || qrCode) return;

    setQrCode({ status: 'loading' });
    try {
      setQrCode({ status: 'ready', dataUrl: await generateQRCodeDataUrl(shareUrl) });
    } catch (error) {
      // The qrcode library throws when the data doesn't fit in a QR code
      console.error('Failed to generate QR code:', error);
      setQrCode({ status: 'error' });
    }
  }

  function handleExport(format: ExportFormat) {
    const content = exportRecipe(recipe, { format, ...SHARE_EXPORT_OPTIONS });
    const extensions = { json: 'json', markdown: 'md', text: 'txt' };
    const filename = `${recipe.name.toLowerCase().replace(/\s+/g, '-')}.${extensions[format]}`;
    downloadAsFile(content, filename, format === 'json' ? 'application/json' : 'text/plain');
  }

  async function handleCopyExport(format: ExportFormat) {
    try {
      await copyToClipboard(exportRecipe(recipe, { format, ...SHARE_EXPORT_OPTIONS }));
      showCopyFeedback('export', true);
    } catch {
      showCopyFeedback('export', false);
    }
  }

  const linkCopied = copyFeedback?.target === 'link' && copyFeedback.ok;
  const linkCopyFailed = copyFeedback?.target === 'link' && !copyFeedback.ok;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-bg)',
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
          background: 'var(--card-bg)',
          borderRadius: '0.75rem',
          width: '100%',
          maxWidth: '450px',
          maxHeight: '100%',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-primary)',
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
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
            }}
          >
            x
          </button>
        </div>

        {/* Recipe Preview */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-primary)',
          }}
        >
          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{recipe.name}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
            {recipe.yield} | {recipe.total_time}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-primary)',
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
                borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-tertiary)',
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
              <p style={{ color: 'var(--text-tertiary)', margin: '0 0 1rem', fontSize: '0.875rem' }}>
                Anyone with this link can view the recipe and save a copy. The recipe is packed
                into the link itself, so nothing is uploaded and later edits won't change it.
                Your cook history is not included.
              </p>

              {link.status === 'loading' && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                  Creating link...
                </div>
              )}

              {link.status === 'error' && (
                <div role="alert" style={errorBoxStyle}>
                  Couldn't create a share link for this recipe. You can still send it by email or
                  export it from the other tabs.
                </div>
              )}

              {shareUrl && (
                <>
                  <div
                    style={{
                      padding: '0.75rem',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      borderRadius: '0.375rem',
                      marginBottom: '1rem',
                      wordBreak: 'break-all',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      // Links hold the full recipe; keep long ones from taking over the modal
                      maxHeight: '5.5rem',
                      overflowY: 'auto',
                      userSelect: 'all',
                    }}
                  >
                    {shareUrl}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Button
                      variant="primary"
                      onClick={handleCopyLink}
                      style={{ flex: 1 }}
                    >
                      {linkCopied ? 'Copied!' : 'Copy Link'}
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

                  {linkCopyFailed && (
                    <div role="alert" style={{ ...errorBoxStyle, marginBottom: '1rem' }}>
                      Couldn't copy automatically. Select the link above and copy it manually.
                    </div>
                  )}

                  {canEncodeAsQRCode(shareUrl) ? (
                    <>
                      <button
                        onClick={handleToggleQR}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'none',
                          border: '1px solid var(--border-secondary)',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          color: 'var(--text-tertiary)',
                          fontSize: '0.875rem',
                        }}
                      >
                        {showQR ? 'Hide QR Code' : 'Show QR Code'}
                      </button>

                      {showQR && (
                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                          {qrCode?.status === 'ready' ? (
                            <>
                              <img
                                src={qrCode.dataUrl}
                                alt="QR code for the share link"
                                style={{
                                  width: '260px',
                                  maxWidth: '100%',
                                  height: 'auto',
                                  border: '1px solid var(--border-primary)',
                                  borderRadius: '0.375rem',
                                }}
                              />
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                                Scan to view recipe
                              </p>
                            </>
                          ) : qrCode?.status === 'error' ? (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0 }}>
                              Couldn't make a QR code for this link. Copy or share the link instead.
                            </p>
                          ) : (
                            <div style={{ padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                              Generating QR code...
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0, textAlign: 'center' }}>
                      This recipe is too long to fit in a scannable QR code. Copy or share the link instead.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'social' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ color: 'var(--text-tertiary)', margin: '0 0 0.5rem', fontSize: '0.875rem' }}>
                Share this recipe on social media
              </p>

              <button
                onClick={() => shareToTwitter(generateShareText(recipe), shareUrl ?? undefined)}
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
                onClick={() => shareUrl && shareToFacebook(shareUrl)}
                disabled={!shareUrl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: shareUrl ? '#1877f2' : 'var(--border-secondary)',
                  color: shareUrl ? 'white' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: shareUrl ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>f</span>
                Share on Facebook
                {!shareUrl && (
                  <span style={{ fontSize: '0.75rem' }}>
                    {link.status === 'loading' ? '(preparing link...)' : '(link unavailable)'}
                  </span>
                )}
              </button>

              <button
                onClick={() => shareViaEmail(recipe)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  ...secondaryActionStyle,
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
                    ...secondaryActionStyle,
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
              <p style={{ color: 'var(--text-tertiary)', margin: '0 0 1rem', fontSize: '0.875rem' }}>
                Download or copy recipe in different formats
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* JSON */}
                <div
                  style={{
                    padding: '1rem',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '0.375rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>JSON Format</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
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
                    border: '1px solid var(--border-primary)',
                    borderRadius: '0.375rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>Markdown</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
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
                    border: '1px solid var(--border-primary)',
                    borderRadius: '0.375rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>Plain Text</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
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

              {copyFeedback?.target === 'export' && (
                copyFeedback.ok ? (
                  <div
                    style={{
                      marginTop: '1rem',
                      padding: '0.5rem',
                      background: 'var(--success-bg)',
                      borderRadius: '0.375rem',
                      textAlign: 'center',
                      color: 'var(--success-text)',
                      fontSize: '0.875rem',
                    }}
                  >
                    Copied to clipboard!
                  </div>
                ) : (
                  <div role="alert" style={{ ...errorBoxStyle, marginTop: '1rem', textAlign: 'center' }}>
                    Couldn't copy to clipboard. Use Download instead.
                  </div>
                )
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
