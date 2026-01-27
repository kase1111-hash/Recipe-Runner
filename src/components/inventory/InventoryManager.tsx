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
} from '../../services/inventory';
import { type PantryCategory } from '../../services/pantry';
import { InventoryItemRow } from './InventoryItemRow';
import { AddItemModal } from './AddItemModal';
import { EditItemModal } from './EditItemModal';
import { QuickAddModal } from './QuickAddModal';
import { CATEGORY_LABELS, LOCATION_LABELS } from './inventoryConstants';

interface InventoryManagerProps {
  onBack: () => void;
  onViewShoppingList?: () => void;
}

type ViewMode = 'all' | 'low-stock' | 'expiring' | 'by-location';
type SortMode = 'name' | 'quantity' | 'category' | 'expiration';

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
