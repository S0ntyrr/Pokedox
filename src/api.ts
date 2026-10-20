const API_BASE = (import.meta.env.VITE_API_URL ?? 'https://pokedex-backend-g1ql.onrender.com').replace(/\/$/, '')

export type PokemonSummary = {
  id: number
  name: string
  genus: string
  types: string[]
  sprite: string
  artwork: string
}

export type PokemonDetail = {
  id: number
  name: string
  genus: string
  flavorText: string
  height: number
  weight: number
  baseExperience: number
  captureRate: number
  types: string[]
  abilities: { name: string; isHidden: boolean }[]
  stats: {
    hp: number
    attack: number
    defense: number
    specialAttack: number
    specialDefense: number
    speed: number
  }
  sprites: { front?: string; back?: string; frontShiny?: string; artworkOfficial?: string }
  evolvesFrom: { id: number; name: string } | null
  evolvesTo: { id: number; name: string }[]
}

export type TypeSummary = { name: string; pokemonCount: number }

type ListResponse = { data: PokemonSummary[]; meta: { total: number; limit: number; offset: number } }

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message)
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Reintenta ante fallos de red/5xx: el backend gratuito puede tardar ~50 s en despertar (cold start).
async function request<T>(path: string, params: Record<string, string | number | undefined> = {}, signal?: AbortSignal): Promise<T | null> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v))
  const url = `${API_BASE}${path}${qs.size ? `?${qs}` : ''}`

  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController()
    const onAbort = () => ctrl.abort()
    signal?.addEventListener('abort', onAbort)
    const timer = setTimeout(() => ctrl.abort(), 60_000)
    try {
      const res = await fetch(url, { signal: ctrl.signal })
      if (res.status === 404) return null
      if (res.status >= 500) throw new ApiError(`Error ${res.status}`, res.status)
      if (!res.ok) throw new ApiError(`Error ${res.status}`, res.status)
      return (await res.json()) as T
    } catch (e) {
      if (signal?.aborted) throw e
      const retryable = !(e instanceof ApiError) || (e.status ?? 0) >= 500
      if (!retryable || attempt >= 2) throw e
      await sleep(1000 * 2 ** attempt)
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
  }
}

// Descarga todas las páginas (máx. 100 por petición) usando meta.total.
export async function getAllPokemon(filters: { search?: string; type?: string }, signal?: AbortSignal): Promise<PokemonSummary[]> {
  const all: PokemonSummary[] = []
  let total = Infinity
  while (all.length < total) {
    const res = await request<ListResponse>('/api/pokemon', { limit: 100, offset: all.length, ...filters }, signal)
    if (!res || res.data.length === 0) break
    all.push(...res.data)
    total = res.meta.total
  }
  return all
}

export const getPokemonDetail = (idOrName: string | number, signal?: AbortSignal) =>
  request<PokemonDetail>(`/api/pokemon/${encodeURIComponent(String(idOrName))}`, {}, signal)

export async function getTypes(signal?: AbortSignal): Promise<TypeSummary[]> {
  const res = await request<{ data: TypeSummary[] }>('/api/types', {}, signal)
  return res?.data ?? []
}

export const pingHealth = () => request('/health')
