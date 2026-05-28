import { favorites } from '@/lib/mock-data';

export function getFavorites() {
  return favorites;
}

export function createFavorite(data: any) {
  const favorite = { id: `fav-${Date.now()}`, ...data };
  favorites.push(favorite);
  return favorite;
}

export function deleteFavorite(id: string) {
  const index = favorites.findIndex((favorite) => favorite.id === id);
  if (index !== -1) {
    return favorites.splice(index, 1)[0];
  }
  return null;
}
