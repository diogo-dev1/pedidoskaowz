import { icons } from 'lucide-react';

// Curated list of icons suitable for product categories
export const AVAILABLE_ICONS = [
  'Sword', 'Shield', 'ChefHat', 'Trees', 'Flame', 'Package', 'Wrench',
  'Shirt', 'Coffee', 'Star', 'Heart', 'Gem', 'Crown', 'Target',
  'Zap', 'Award', 'Gift', 'ShoppingBag', 'Briefcase', 'Hammer',
  'Axe', 'Scissors', 'Pocket', 'Box', 'Tag', 'Bookmark',
  'Circle', 'Square', 'Triangle', 'Hexagon', 'Diamond',
  'Sun', 'Moon', 'Mountain', 'Leaf', 'Droplet', 'Wind',
  'Fish', 'Bug', 'Utensils', 'Wine', 'Beer', 'Cake',
  'Home', 'Building', 'Tent', 'Compass', 'Map', 'Navigation',
  'Music', 'Camera', 'Paintbrush', 'Palette', 'Pen', 'Ruler',
] as const;

export type IconName = typeof AVAILABLE_ICONS[number];

export function getIconComponent(name: string) {
  return (icons as Record<string, any>)[name] || icons['Sword'];
}
