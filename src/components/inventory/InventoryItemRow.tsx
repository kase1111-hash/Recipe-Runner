import { type InventoryItem } from '../../services/inventory';
import { CATEGORY_LABELS, LOCATION_LABELS } from './inventoryConstants';

interface InventoryItemRowProps {
  item: InventoryItem;
  onEdit: () => void;
  onDelete: () => void;
  formatQuantity: (item: InventoryItem) => string;
  formatExpiration: (dateStr?: string) => string | null;
}

export function InventoryItemRow({ item, onEdit, onDelete, formatQuantity, formatExpiration }: InventoryItemRowProps) {
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
