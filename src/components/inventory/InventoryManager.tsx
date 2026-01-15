// Inventory Manager Component
// Phase 7 Feature - Manage pantry inventory

import { useState, useEffect, useMemo } from 'react';
import { Button, Card } from '../common';
import {
  type InventoryItem,
  getAllInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  removeInventoryItem,
  getLowStockItems,
  getExpiringItems,
  getInventoryStats,
  addCommonPantryItems,
  COMMON_PANTRY_ITEMS,
} from '../../services/inventory';
import { type PantryCategory, detectCategory } from '../../services/pantry';

interface InventoryManagerProps {
  onBack: () => void;
  onViewShoppingList?: () => void;
}

type ViewMode = 'all' | 'low-stock' | 'expiring' | 'by-location';
type SortMode = 'name' | 'quantity' | 'category' | 'expiration';

const CATEGORY_LABELS: Record<PantryCategory, string> = {
  spices: 'Spices & Seasonings',
  oils: 'Oils & Fats',
  condiments: 'Condiments & Sauces',
  baking: 'Baking Supplies',
  grains: 'Grains & Pasta',
  canned: 'Canned Goods',
  dairy: 'Dairy & Eggs',
  produce: 'Fresh Produce',
  proteins: 'Proteins',
  other: 'Other',
};

const LOCATION_LABELS: Record<string, string> = {
  pantry: 'Pantry',
  fridge: 'Refrigerator',
  freezer: 'Freezer',
};

export function InventoryManager({ onBack, onViewShoppingList }: InventoryManagerProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PantryCategory | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  function loadItems() {
    setItems(getAllInventoryItems());
  }

  const stats = useMemo(() => getInventoryStats(), [items]);
  const lowStockItems = useMemo(() => getLowStockItems(), [items]);
  const expiringItems = useMemo(() => getExpiringItems(7), [items]);

  const filteredItems = useMemo(() => {
    let result = items;

    // Apply view mode filter
    if (viewMode === 'low-stock') {
      result = lowStockItems;
    } else if (viewMode === 'expiring') {
      result = expiringItems;
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(query));
    }

    // Apply sort
    result = [...result].sort((a, b) => {
      switch (sortMode) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'quantity':
          return b.quantity - a.quantity;
        case 'category':
          return a.category.localeCompare(b.category);
        case 'expiration':
          if (!a.expirationDate && !b.expirationDate) return 0;
          if (!a.expirationDate) return 1;
          if (!b.expirationDate) return -1;
          return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [items, viewMode, selectedCategory, searchQuery, sortMode, lowStockItems, expiringItems]);

  const groupedByLocation = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {
      pantry: [],
      fridge: [],
      freezer: [],
    };

    for (const item of filteredItems) {
      const location = item.location || 'pantry';
      groups[location].push(item);
    }

    return groups;
  }, [filteredItems]);

  function handleAddItem(item: Omit<InventoryItem, 'id' | 'lastUpdated'>) {
    addInventoryItem(item);
    loadItems();
    setShowAddModal(false);
  }

  function handleUpdateItem(name: string, updates: Partial<InventoryItem>) {
    updateInventoryItem(name, updates);
    loadItems();
    setEditingItem(null);
  }

  function handleDeleteItem(name: string) {
    if (confirm(`Remove "${name}" from inventory?`)) {
      removeInventoryItem(name);
      loadItems();
    }
  }

  function handleQuickAddCommon() {
    addCommonPantryItems();
    loadItems();
    setShowQuickAdd(false);
  }

  function formatQuantity(item: InventoryItem): string {
    if (item.quantity === Math.floor(item.quantity)) {
      return `${item.quantity} ${item.unit}`;
    }
    return `${item.quantity.toFixed(1)} ${item.unit}`;
  }

  function formatExpiration(dateStr?: string): string | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Expired ${Math.abs(diffDays)} days ago`;
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    if (diffDays <= 7) return `Expires in ${diffDays} days`;
    return `Expires ${date.toLocaleDateString()}`;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <header
        style={{
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Button variant="secondary" onClick={onBack}>
                Back
              </Button>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                Inventory Manager
              </h1>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {onViewShoppingList && (
                <Button variant="secondary" onClick={onViewShoppingList}>
                  Shopping List
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowQuickAdd(true)}>
                Quick Add
              </Button>
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                + Add Item
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div
              style={{
                padding: '0.5rem 1rem',
                background: '#f3f4f6',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              <strong>{stats.totalItems}</strong> items
            </div>
            {lowStockItems.length > 0 && (
              <div
                style={{
                  padding: '0.5rem 1rem',
                  background: '#fef3c7',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#92400e',
                  cursor: 'pointer',
                }}
                onClick={() => setViewMode('low-stock')}
              >
                <strong>{lowStockItems.length}</strong> low stock
              </div>
            )}
            {expiringItems.length > 0 && (
              <div
                style={{
                  padding: '0.5rem 1rem',
                  background: '#fee2e2',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#991b1b',
                  cursor: 'pointer',
                }}
                onClick={() => setViewMode('expiring')}
              >
                <strong>{expiringItems.length}</strong> expiring soon
              </div>
            )}
            {stats.totalValue > 0 && (
              <div
                style={{
                  padding: '0.5rem 1rem',
                  background: '#d1fae5',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#065f46',
                }}
              >
                Est. value: <strong>${stats.totalValue.toFixed(2)}</strong>
              </div>
            )}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                width: '200px',
              }}
            />

            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                background: 'white',
              }}
            >
              <option value="all">All Items</option>
              <option value="low-stock">Low Stock</option>
              <option value="expiring">Expiring Soon</option>
              <option value="by-location">By Location</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as PantryCategory | 'all')}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                background: 'white',
              }}
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                background: 'white',
              }}
            >
              <option value="name">Sort by Name</option>
              <option value="quantity">Sort by Quantity</option>
              <option value="category">Sort by Category</option>
              <option value="expiration">Sort by Expiration</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
        {items.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
            <h2 style={{ fontSize: '1.5rem', color: '#111827', margin: '0 0 0.5rem' }}>
              Your Inventory is Empty
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Start tracking your pantry items to get smart shopping lists
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Button variant="primary" onClick={() => setShowQuickAdd(true)}>
                Add Common Items
              </Button>
              <Button variant="secondary" onClick={() => setShowAddModal(true)}>
                Add Custom Item
              </Button>
            </div>
          </Card>
        ) : viewMode === 'by-location' ? (
          // Location-based view
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {Object.entries(groupedByLocation).map(([location, locationItems]) => (
              locationItems.length > 0 && (
                <Card key={location}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: '0 0 1rem' }}>
                    {LOCATION_LABELS[location]} ({locationItems.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {locationItems.map((item) => (
                      <InventoryItemRow
                        key={item.id}
                        item={item}
                        onEdit={() => setEditingItem(item)}
                        onDelete={() => handleDeleteItem(item.name)}
                        formatQuantity={formatQuantity}
                        formatExpiration={formatExpiration}
                      />
                    ))}
                  </div>
                </Card>
              )
            ))}
          </div>
        ) : (
          // Standard list view
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredItems.map((item) => (
                <InventoryItemRow
                  key={item.id}
                  item={item}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => handleDeleteItem(item.name)}
                  formatQuantity={formatQuantity}
                  formatExpiration={formatExpiration}
                />
              ))}
              {filteredItems.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No items match your filters
                </div>
              )}
            </div>
          </Card>
        )}
      </main>

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddItem}
        />
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(updates) => handleUpdateItem(editingItem.name, updates)}
        />
      )}

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <QuickAddModal
          onClose={() => setShowQuickAdd(false)}
          onAddCommon={handleQuickAddCommon}
          onAddCustom={() => {
            setShowQuickAdd(false);
            setShowAddModal(true);
          }}
        />
      )}
    </div>
  );
}

// Item Row Component
interface InventoryItemRowProps {
  item: InventoryItem;
  onEdit: () => void;
  onDelete: () => void;
  formatQuantity: (item: InventoryItem) => string;
  formatExpiration: (dateStr?: string) => string | null;
}

function InventoryItemRow({ item, onEdit, onDelete, formatQuantity, formatExpiration }: InventoryItemRowProps) {
  const isLowStock = item.quantity <= item.lowThreshold;
  const expiration = formatExpiration(item.expirationDate);
  const isExpiringSoon = item.expirationDate && new Date(item.expirationDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.75rem',
        borderRadius: '0.375rem',
        background: isLowStock ? '#fef3c7' : isExpiringSoon ? '#fee2e2' : '#f9fafb',
        gap: '1rem',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, color: '#111827' }}>{item.name}</div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {CATEGORY_LABELS[item.category]} {item.location && `| ${LOCATION_LABELS[item.location]}`}
        </div>
      </div>

      <div style={{ textAlign: 'right', minWidth: '80px' }}>
        <div style={{ fontWeight: 500, color: isLowStock ? '#92400e' : '#111827' }}>
          {formatQuantity(item)}
        </div>
        {isLowStock && (
          <div style={{ fontSize: '0.75rem', color: '#92400e' }}>Low stock</div>
        )}
      </div>

      {expiration && (
        <div
          style={{
            fontSize: '0.75rem',
            color: isExpiringSoon ? '#991b1b' : '#6b7280',
            minWidth: '100px',
            textAlign: 'right',
          }}
        >
          {expiration}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.25rem' }}>
        <button
          onClick={onEdit}
          style={{
            padding: '0.375rem 0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.25rem',
            background: 'white',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: '0.375rem 0.5rem',
            border: '1px solid #fca5a5',
            borderRadius: '0.25rem',
            background: '#fef2f2',
            color: '#dc2626',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// Add Item Modal
interface AddItemModalProps {
  onClose: () => void;
  onAdd: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
}

function AddItemModal({ onClose, onAdd }: AddItemModalProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<PantryCategory>('other');
  const [location, setLocation] = useState<'pantry' | 'fridge' | 'freezer'>('pantry');
  const [lowThreshold, setLowThreshold] = useState('0');
  const [expirationDate, setExpirationDate] = useState('');

  useEffect(() => {
    if (name) {
      setCategory(detectCategory(name));
    }
  }, [name]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !quantity || !unit) return;

    onAdd({
      name,
      quantity: parseFloat(quantity),
      unit,
      category,
      location,
      lowThreshold: parseFloat(lowThreshold) || 0,
      expirationDate: expirationDate || undefined,
    });
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
          padding: '1.5rem',
          width: '100%',
          maxWidth: '400px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1.5rem' }}>Add Inventory Item</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Item Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Quantity *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                step="0.1"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Unit *
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="oz, lb, cups..."
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PantryCategory)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as 'pantry' | 'fridge' | 'freezer')}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              >
                <option value="pantry">Pantry</option>
                <option value="fridge">Refrigerator</option>
                <option value="freezer">Freezer</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Low Stock Alert
              </label>
              <input
                type="number"
                value={lowThreshold}
                onChange={(e) => setLowThreshold(e.target.value)}
                min="0"
                step="0.1"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Expiration Date
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Add Item
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Item Modal
interface EditItemModalProps {
  item: InventoryItem;
  onClose: () => void;
  onSave: (updates: Partial<InventoryItem>) => void;
}

function EditItemModal({ item, onClose, onSave }: EditItemModalProps) {
  const [quantity, setQuantity] = useState(item.quantity.toString());
  const [unit, setUnit] = useState(item.unit);
  const [location, setLocation] = useState<'pantry' | 'fridge' | 'freezer'>(item.location || 'pantry');
  const [lowThreshold, setLowThreshold] = useState(item.lowThreshold.toString());
  const [expirationDate, setExpirationDate] = useState(item.expirationDate?.split('T')[0] || '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      quantity: parseFloat(quantity),
      unit,
      location,
      lowThreshold: parseFloat(lowThreshold) || 0,
      expirationDate: expirationDate || undefined,
    });
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
          padding: '1.5rem',
          width: '100%',
          maxWidth: '400px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.25rem' }}>Edit Item</h2>
        <p style={{ color: '#6b7280', margin: '0 0 1.5rem' }}>{item.name}</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                step="0.1"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as 'pantry' | 'fridge' | 'freezer')}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            >
              <option value="pantry">Pantry</option>
              <option value="fridge">Refrigerator</option>
              <option value="freezer">Freezer</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Low Stock Alert
              </label>
              <input
                type="number"
                value={lowThreshold}
                onChange={(e) => setLowThreshold(e.target.value)}
                min="0"
                step="0.1"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Expiration Date
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Quick Add Modal
interface QuickAddModalProps {
  onClose: () => void;
  onAddCommon: () => void;
  onAddCustom: () => void;
}

function QuickAddModal({ onClose, onAddCommon, onAddCustom }: QuickAddModalProps) {
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
          padding: '1.5rem',
          width: '100%',
          maxWidth: '450px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem' }}>Quick Add Items</h2>

        <div
          style={{
            padding: '1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            cursor: 'pointer',
          }}
          onClick={onAddCommon}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
            Add Common Pantry Items
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            Quickly add {COMMON_PANTRY_ITEMS.length} common pantry staples like salt, flour, oil, spices, and more.
          </p>
        </div>

        <div
          style={{
            padding: '1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            cursor: 'pointer',
          }}
          onClick={onAddCustom}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
            Add Custom Item
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            Manually add any item with custom quantity, unit, and location.
          </p>
        </div>

        <Button variant="secondary" onClick={onClose} style={{ width: '100%' }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
