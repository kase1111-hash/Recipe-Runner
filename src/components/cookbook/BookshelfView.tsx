// Bookshelf View Component
// Organizes cookbooks into customizable shelves for easy browsing

import { useState, useEffect } from 'react';
import { Card, Button } from '../common';
import {
  getAllBookshelves,
  getCookbooksByBookshelf,
  getUnshelvdCookbooks,
  createBookshelf,
  updateBookshelf,
  deleteBookshelf,
  updateCookbook,
} from '../../db';
import type { Bookshelf, Cookbook } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface BookshelfViewProps {
  onSelectCookbook: (cookbook: Cookbook) => void;
  onBack: () => void;
}

interface ShelfWithCookbooks {
  shelf: Bookshelf;
  cookbooks: Cookbook[];
}

const categoryIcons: Record<string, string> = {
  cooking: '🍳',
  baking: '🥧',
  herbalism: '🌿',
  fermentation: '🫙',
  preservation: '🥫',
  craft: '🛠️',
};

export function BookshelfView({ onSelectCookbook, onBack }: BookshelfViewProps) {
  const [shelves, setShelves] = useState<ShelfWithCookbooks[]>([]);
  const [unshelvedCookbooks, setUnshelvedCookbooks] = useState<Cookbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingShelf, setEditingShelf] = useState<Bookshelf | null>(null);
  const [showNewShelfForm, setShowNewShelfForm] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfDescription, setNewShelfDescription] = useState('');
  const [newShelfIcon, setNewShelfIcon] = useState('📚');
  const [newShelfColor, setNewShelfColor] = useState('#6366f1');
  const [draggedCookbook, setDraggedCookbook] = useState<Cookbook | null>(null);
  const [collapsedShelves, setCollapsedShelves] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const allShelves = await getAllBookshelves();
      const shelvesWithCookbooks: ShelfWithCookbooks[] = [];

      for (const shelf of allShelves) {
        const cookbooks = await getCookbooksByBookshelf(shelf.id);
        shelvesWithCookbooks.push({ shelf, cookbooks });
      }

      setShelves(shelvesWithCookbooks);
      setUnshelvedCookbooks(await getUnshelvdCookbooks());
    } catch (error) {
      console.error('Failed to load bookshelves:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateShelf() {
    if (!newShelfName.trim()) return;

    const now = new Date().toISOString();
    const newShelf: Bookshelf = {
      id: uuidv4(),
      name: newShelfName.trim(),
      description: newShelfDescription.trim(),
      icon: newShelfIcon,
      color: newShelfColor,
      sort_order: shelves.length,
      created_at: now,
      modified_at: now,
    };

    await createBookshelf(newShelf);
    setNewShelfName('');
    setNewShelfDescription('');
    setNewShelfIcon('📚');
    setNewShelfColor('#6366f1');
    setShowNewShelfForm(false);
    await loadData();
  }

  async function handleUpdateShelf(shelf: Bookshelf) {
    await updateBookshelf(shelf.id, {
      name: shelf.name,
      description: shelf.description,
      icon: shelf.icon,
      color: shelf.color,
    });
    setEditingShelf(null);
    await loadData();
  }

  async function handleDeleteShelf(shelfId: string) {
    if (window.confirm('Delete this shelf? Cookbooks will be moved to "Unshelved".')) {
      await deleteBookshelf(shelfId);
      await loadData();
    }
  }

  async function handleAssignCookbook(cookbook: Cookbook, shelfId: string | null) {
    await updateCookbook(cookbook.id, { bookshelf_id: shelfId });
    await loadData();
  }

  function toggleShelfCollapse(shelfId: string) {
    setCollapsedShelves(prev => {
      const next = new Set(prev);
      if (next.has(shelfId)) {
        next.delete(shelfId);
      } else {
        next.add(shelfId);
      }
      return next;
    });
  }

  function handleDragStart(cookbook: Cookbook) {
    setDraggedCookbook(cookbook);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(shelfId: string | null) {
    if (draggedCookbook) {
      await handleAssignCookbook(draggedCookbook, shelfId);
      setDraggedCookbook(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        Loading bookshelves...
      </div>
    );
  }

  const iconOptions = ['📚', '❤️', '🌙', '☀️', '🎉', '🏠', '🌍', '⭐', '🔥', '💚', '📖', '🍴'];
  const colorOptions = ['#6366f1', '#ef4444', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#3b82f6', '#6b7280'];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" onClick={onBack} style={{ marginBottom: '1rem' }}>
          ← Back to Library
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Bookshelf
            </h1>
            <p style={{ color: 'var(--text-tertiary)', margin: '0.25rem 0 0' }}>
              Organize your cookbooks into custom collections
            </p>
          </div>
          <Button onClick={() => setShowNewShelfForm(true)}>+ New Shelf</Button>
        </div>
      </header>

      {/* New Shelf Form */}
      {showNewShelfForm && (
        <Card style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)' }}>Create New Shelf</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Name
              </label>
              <input
                type="text"
                value={newShelfName}
                onChange={(e) => setNewShelfName(e.target.value)}
                placeholder="e.g., Quick Weeknight Meals"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--input-border)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Description
              </label>
              <input
                type="text"
                value={newShelfDescription}
                onChange={(e) => setNewShelfDescription(e.target.value)}
                placeholder="A brief description of this collection"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--input-border)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Icon
                </label>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewShelfIcon(icon)}
                      style={{
                        width: '2rem',
                        height: '2rem',
                        border: newShelfIcon === icon ? '2px solid var(--accent-primary)' : '1px solid var(--border-secondary)',
                        borderRadius: '0.25rem',
                        background: newShelfIcon === icon ? 'var(--accent-light)' : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Color
                </label>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewShelfColor(color)}
                      style={{
                        width: '2rem',
                        height: '2rem',
                        border: newShelfColor === color ? '2px solid var(--text-primary)' : '1px solid transparent',
                        borderRadius: '0.25rem',
                        background: color,
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setShowNewShelfForm(false)}>Cancel</Button>
              <Button onClick={handleCreateShelf} disabled={!newShelfName.trim()}>Create Shelf</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Shelves */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {shelves.map(({ shelf, cookbooks }) => (
          <div
            key={shelf.id}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(shelf.id)}
            style={{
              borderLeft: `4px solid ${shelf.color || '#6366f1'}`,
              background: 'var(--card-bg)',
              borderRadius: '0 0.75rem 0.75rem 0',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            {/* Shelf Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                cursor: 'pointer',
                borderBottom: collapsedShelves.has(shelf.id) ? 'none' : '1px solid var(--border-primary)',
              }}
              onClick={() => toggleShelfCollapse(shelf.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{shelf.icon || '📚'}</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {shelf.name}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                    {shelf.description} • {cookbooks.length} cookbook{cookbooks.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingShelf(shelf); }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: 'none',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteShelf(shelf.id); }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: 'none',
                    border: '1px solid var(--error)',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    color: 'var(--error)',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '1.25rem', marginLeft: '0.5rem' }}>
                  {collapsedShelves.has(shelf.id) ? '▶' : '▼'}
                </span>
              </div>
            </div>

            {/* Shelf Content */}
            {!collapsedShelves.has(shelf.id) && (
              <div style={{ padding: '1rem 1.5rem' }}>
                {cookbooks.length === 0 ? (
                  <div
                    style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: 'var(--text-tertiary)',
                      border: '2px dashed var(--border-secondary)',
                      borderRadius: '0.5rem',
                    }}
                  >
                    Drag cookbooks here to add them to this shelf
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                      gap: '1rem',
                    }}
                  >
                    {cookbooks.map((cookbook) => (
                      <CookbookCard
                        key={cookbook.id}
                        cookbook={cookbook}
                        onSelect={() => onSelectCookbook(cookbook)}
                        onDragStart={() => handleDragStart(cookbook)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Unshelved Cookbooks */}
        {unshelvedCookbooks.length > 0 && (
          <div
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(null)}
            style={{
              borderLeft: '4px solid var(--border-secondary)',
              background: 'var(--card-bg)',
              borderRadius: '0 0.75rem 0.75rem 0',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border-primary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📦</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Unshelved
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                    Cookbooks not assigned to any shelf • {unshelvedCookbooks.length} cookbook{unshelvedCookbooks.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '1rem',
                }}
              >
                {unshelvedCookbooks.map((cookbook) => (
                  <CookbookCard
                    key={cookbook.id}
                    cookbook={cookbook}
                    onSelect={() => onSelectCookbook(cookbook)}
                    onDragStart={() => handleDragStart(cookbook)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {shelves.length === 0 && unshelvedCookbooks.length === 0 && (
          <Card style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
              No Bookshelves Yet
            </h2>
            <p style={{ color: 'var(--text-tertiary)', marginBottom: '1.5rem' }}>
              Create shelves to organize your cookbooks into collections
            </p>
            <Button onClick={() => setShowNewShelfForm(true)}>Create Your First Shelf</Button>
          </Card>
        )}
      </div>

      {/* Edit Shelf Modal */}
      {editingShelf && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setEditingShelf(null)}
        >
          <Card
            style={{ width: '100%', maxWidth: '500px', padding: '1.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)' }}>Edit Shelf</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={editingShelf.name}
                  onChange={(e) => setEditingShelf({ ...editingShelf, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid var(--input-border)',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={editingShelf.description}
                  onChange={(e) => setEditingShelf({ ...editingShelf, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid var(--input-border)',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Icon
                  </label>
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {iconOptions.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setEditingShelf({ ...editingShelf, icon })}
                        style={{
                          width: '2rem',
                          height: '2rem',
                          border: editingShelf.icon === icon ? '2px solid var(--accent-primary)' : '1px solid var(--border-secondary)',
                          borderRadius: '0.25rem',
                          background: editingShelf.icon === icon ? 'var(--accent-light)' : 'var(--bg-secondary)',
                          cursor: 'pointer',
                          fontSize: '1rem',
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Color
                  </label>
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditingShelf({ ...editingShelf, color })}
                        style={{
                          width: '2rem',
                          height: '2rem',
                          border: editingShelf.color === color ? '2px solid var(--text-primary)' : '1px solid transparent',
                          borderRadius: '0.25rem',
                          background: color,
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => setEditingShelf(null)}>Cancel</Button>
                <Button onClick={() => handleUpdateShelf(editingShelf)}>Save Changes</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================
// Cookbook Card Sub-component
// ============================================

interface CookbookCardProps {
  cookbook: Cookbook;
  onSelect: () => void;
  onDragStart: () => void;
}

function CookbookCard({ cookbook, onSelect, onDragStart }: CookbookCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem',
        background: 'var(--bg-secondary)',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        border: '1px solid var(--border-primary)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--card-shadow)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div
        style={{
          width: '3rem',
          height: '3rem',
          borderRadius: '0.5rem',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
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
              borderRadius: '0.5rem',
            }}
          />
        ) : (
          categoryIcons[cookbook.category] || '📖'
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4
          style={{
            margin: 0,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {cookbook.title}
        </h4>
        <p
          style={{
            margin: '0.25rem 0 0',
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {cookbook.description}
        </p>
        <span
          style={{
            display: 'inline-block',
            marginTop: '0.5rem',
            fontSize: '0.625rem',
            padding: '0.125rem 0.375rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '9999px',
            color: 'var(--text-tertiary)',
          }}
        >
          {cookbook.category}
        </span>
      </div>
    </div>
  );
}
