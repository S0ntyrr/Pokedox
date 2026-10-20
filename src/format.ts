const TYPES_ES: Record<string, string> = {
  normal: 'Normal',
  fire: 'Fuego',
  water: 'Agua',
  electric: 'Eléctrico',
  grass: 'Planta',
  ice: 'Hielo',
  fighting: 'Lucha',
  poison: 'Veneno',
  ground: 'Tierra',
  flying: 'Volador',
  psychic: 'Psíquico',
  bug: 'Bicho',
  rock: 'Roca',
  ghost: 'Fantasma',
  dragon: 'Dragón',
  steel: 'Acero',
  fairy: 'Hada',
}

export const typeEs = (t: string) => TYPES_ES[t] ?? t

export const titleCase = (s: string) =>
  s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

export const pad = (n: number) => String(n).padStart(3, '0')

// La API devuelve decímetros y hectogramos.
export const formatHeight = (dm: number) => `${(dm / 10).toFixed(1).replace('.', ',')} m`
export const formatWeight = (hg: number) => `${(hg / 10).toFixed(1).replace('.', ',')} kg`
