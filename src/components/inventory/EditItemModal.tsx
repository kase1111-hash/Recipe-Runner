import { useState } from 'react';
import { Button } from '../common';
import { type InventoryItem } from '../../services/inventory';

interface EditItemModalProps {
  item: InventoryItem;
  onClose: () => void;
  onSave: (updates: Partial<InventoryItem>) => void;
}

export function EditItemModal({ item, onClose, onSave }: EditItemModalProps) {
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
