import { Button } from '../common';
import { COMMON_PANTRY_ITEMS } from '../../services/inventory';

interface QuickAddModalProps {
  onClose: () => void;
  onAddCommon: () => void;
  onAddCustom: () => void;
}

export function QuickAddModal({ onClose, onAddCommon, onAddCustom }: QuickAddModalProps) {
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
