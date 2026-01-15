// FavoriteButton Component
// Phase 10 Feature - Favorites/Bookmarking

import { useState } from 'react';
import { toggleFavorite } from '../../db';

interface FavoriteButtonProps {
  recipeId: string;
  initialFavorite: boolean;
  size?: 'sm' | 'md' | 'lg';
  onToggle?: (newState: boolean) => void;
}

export function FavoriteButton({
  recipeId,
  initialFavorite,
  size = 'md',
  onToggle,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isAnimating, setIsAnimating] = useState(false);

  const sizes = {
    sm: { button: '1.5rem', icon: '1rem' },
    md: { button: '2rem', icon: '1.25rem' },
    lg: { button: '2.5rem', icon: '1.5rem' },
  };

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation(); // Prevent card click

    setIsAnimating(true);

    try {
      const newState = await toggleFavorite(recipeId);
      setIsFavorite(newState);
      onToggle?.(newState);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }

    setTimeout(() => setIsAnimating(false), 300);
  }

  return (
    <button
      onClick={handleClick}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      style={{
        width: sizes[size].button,
        height: sizes[size].button,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: '50%',
        background: isFavorite ? 'var(--error-bg)' : 'var(--bg-tertiary)',
        cursor: 'pointer',
        fontSize: sizes[size].icon,
        transition: 'transform 0.2s, background 0.2s',
        transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
      }}
    >
      {isFavorite ? '❤️' : '🤍'}
    </button>
  );
}
