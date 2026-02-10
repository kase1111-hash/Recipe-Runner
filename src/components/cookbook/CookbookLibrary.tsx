import { useState, useEffect } from 'react';
import { Card, Button } from '../common';
import { GeneralSettings } from '../settings/GeneralSettings';
import { ThemeToggle } from '../../contexts';
import { getAllCookbooks } from '../../db';
import type { Cookbook } from '../../types';

interface CookbookLibraryProps {
  onSelectCookbook: (cookbook: Cookbook) => void;
  onOpenBookshelf?: () => void;
}

const categoryIcons: Record<string, string> = {
  cooking: '🍳',
  baking: '🥧',
  herbalism: '🌿',
  fermentation: '🫙',
  preservation: '🥫',
  craft: '🛠️',
};

export function CookbookLibrary({ onSelectCookbook, onOpenBookshelf }: CookbookLibraryProps) {
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVisualSettings, setShowVisualSettings] = useState(false);

  useEffect(() => {
    loadCookbooks();
  }, []);

  async function loadCookbooks() {
    try {
      const data = await getAllCookbooks();
      setCookbooks(data);
    } catch (error) {
      console.error('Failed to load cookbooks:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ width: '200px', height: '2rem', background: 'var(--border-primary)', borderRadius: '0.5rem', marginBottom: '0.5rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ width: '250px', height: '1rem', background: 'var(--border-primary)', borderRadius: '0.25rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '4rem', height: '4rem', borderRadius: '0.75rem', background: 'var(--border-primary)', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '70%', height: '1.125rem', background: 'var(--border-primary)', borderRadius: '0.25rem', marginBottom: '0.5rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ width: '100%', height: '0.875rem', background: 'var(--border-primary)', borderRadius: '0.25rem', marginBottom: '0.25rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ width: '60%', height: '0.875rem', background: 'var(--border-primary)', borderRadius: '0.25rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Recipe Runner
          </h1>
          <p style={{ color: 'var(--text-tertiary)', margin: '0.25rem 0 0' }}>
            Your personal cookbook library
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <ThemeToggle size="sm" />
          <Button variant="ghost" onClick={() => setShowVisualSettings(true)} title="Visual Settings">
            ⚙️
          </Button>
          {onOpenBookshelf && (
            <Button variant="ghost" onClick={onOpenBookshelf} title="Organize Cookbooks">
              📚 Bookshelf
            </Button>
          )}
          <Button variant="secondary">+ New Cookbook</Button>
        </div>
      </header>

      {cookbooks.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
          <h2 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 0.5rem' }}>
            No Cookbooks Yet
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Create your first cookbook to get started
          </p>
          <Button>Create Cookbook</Button>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {cookbooks.map((cookbook) => (
            <Card
              key={cookbook.id}
              hoverable
              onClick={() => onSelectCookbook(cookbook)}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: '4rem',
                    height: '4rem',
                    borderRadius: '0.75rem',
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    flexShrink: 0,
                  }}
                >
                  {cookbook.cover_image ? (
                    <img
                      src={cookbook.cover_image}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '0.75rem',
                      }}
                    />
                  ) : (
                    categoryIcons[cookbook.category] || '📖'
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: '#111827',
                      margin: '0 0 0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cookbook.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {cookbook.description}
                  </p>
                  <div
                    style={{
                      marginTop: '0.75rem',
                      display: 'flex',
                      gap: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.125rem 0.5rem',
                        background: '#f3f4f6',
                        borderRadius: '9999px',
                        color: '#6b7280',
                      }}
                    >
                      {cookbook.category}
                    </span>
                    {cookbook.author && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#9ca3af',
                        }}
                      >
                        by {cookbook.author}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* General Settings Modal */}
      {showVisualSettings && (
        <GeneralSettings onClose={() => setShowVisualSettings(false)} />
      )}
    </div>
  );
}
