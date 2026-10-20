import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  getAllPokemon,
  getPokemonDetail,
  getTypes,
  type PokemonDetail,
  type PokemonSummary,
  type TypeSummary,
} from "./api"
import { formatHeight, formatWeight, pad, titleCase, typeEs } from "./format"

const STAT_LABELS: [keyof PokemonDetail["stats"], string][] = [
  ["hp", "PS"],
  ["attack", "ATQ"],
  ["defense", "DEF"],
  ["specialAttack", "ATQ ESP"],
  ["specialDefense", "DEF ESP"],
  ["speed", "VEL"],
]

const artworkUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={direction === "right" ? "rotate-180" : ""}
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])
  return online
}

type Status = "loading" | "ready" | "error"

export default function App() {
  const online = useOnline()
  const [searchText, setSearchText] = useState("")
  const [filters, setFilters] = useState({ search: "", type: "" })
  const [types, setTypes] = useState<TypeSummary[]>([])

  const [list, setList] = useState<PokemonSummary[]>([])
  const [listKey, setListKey] = useState<string | null>(null)
  const [listStatus, setListStatus] = useState<Status>("loading")
  const [slow, setSlow] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<PokemonDetail | null>(null)
  const [detailStatus, setDetailStatus] = useState<Status>("loading")
  const [notFound, setNotFound] = useState(false)
  const detailCache = useRef(new Map<number, PokemonDetail>())

  const filterKey = `${filters.search}|${filters.type}`

  // Debounce de la búsqueda
  useEffect(() => {
    const t = setTimeout(
      () => setFilters((f) => (f.search === searchText.trim().toLowerCase() ? f : { ...f, search: searchText.trim().toLowerCase() })),
      350,
    )
    return () => clearTimeout(t)
  }, [searchText])

  // Tipos para el filtro
  useEffect(() => {
    const ctrl = new AbortController()
    getTypes(ctrl.signal)
      .then((t) => setTypes([...t].sort((a, b) => typeEs(a.name).localeCompare(typeEs(b.name), "es"))))
      .catch(() => {})
    return () => ctrl.abort()
  }, [reloadTick])

  // Lista (todas las páginas) según filtros
  useEffect(() => {
    const ctrl = new AbortController()
    setListStatus("loading")
    setSlow(false)
    const slowTimer = setTimeout(() => setSlow(true), 4000)
    getAllPokemon(filters, ctrl.signal)
      .then((data) => {
        setList(data)
        setListKey(filterKey)
        setListStatus("ready")
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setListStatus("error")
      })
      .finally(() => clearTimeout(slowTimer))
    return () => {
      ctrl.abort()
      clearTimeout(slowTimer)
    }
  }, [filters, filterKey, reloadTick])

  // Mantiene una selección válida cuando llega la lista
  useEffect(() => {
    if (listStatus !== "ready" || listKey !== filterKey) return
    setSelectedId((id) => (id !== null && list.some((p) => p.id === id) ? id : (list[0]?.id ?? null)))
  }, [list, listKey, listStatus, filterKey])

  // Detalle del seleccionado
  useEffect(() => {
    if (selectedId === null) {
      setDetail(null)
      return
    }
    const cached = detailCache.current.get(selectedId)
    if (cached) {
      setDetail(cached)
      setDetailStatus("ready")
      setNotFound(false)
      return
    }
    const ctrl = new AbortController()
    setDetailStatus("loading")
    setNotFound(false)
    getPokemonDetail(selectedId, ctrl.signal)
      .then((d) => {
        if (!d) {
          setNotFound(true)
          setDetail(null)
        } else {
          detailCache.current.set(d.id, d)
          setDetail(d)
        }
        setDetailStatus("ready")
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setDetailStatus("error")
      })
    return () => ctrl.abort()
  }, [selectedId, reloadTick])

  const index = useMemo(() => list.findIndex((p) => p.id === selectedId), [list, selectedId])
  const summary = index >= 0 ? list[index] : undefined

  const step = useCallback(
    (delta: number) => {
      if (!list.length) return
      const from = index >= 0 ? index : 0
      setSelectedId(list[(from + delta + list.length) % list.length].id)
    },
    [list, index],
  )

  const goTo = (id: number) => {
    if (!list.some((p) => p.id === id)) {
      setSearchText("")
      setFilters({ search: "", type: "" })
    }
    setSelectedId(id)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return
      if (e.key === "ArrowLeft") step(-1)
      if (e.key === "ArrowRight") step(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [step])

  const retry = () => setReloadTick((t) => t + 1)

  const displayName = detail?.name ?? summary?.name ?? ""
  const displayId = detail?.id ?? summary?.id ?? selectedId
  const emptyList = listStatus === "ready" && list.length === 0
  const loadingList = listStatus === "loading" && list.length === 0

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {!online && (
        <div className="offline-banner" role="status">
          Estás sin conexión — mostrando datos guardados
        </div>
      )}

      <header className="page-header">
        <div className="eyebrow">
          <span className="eyebrow-line" />
          Archivo regional · Kanto
          <span className="eyebrow-line" />
        </div>
        <h1>POKÉDEX</h1>
        <p>Explora la colección y descubre los datos de cada Pokémon.</p>
      </header>

      <section className="pokedex-wrap" aria-label="Pokédex interactiva">
        <form className="toolbar" role="search" onSubmit={(e) => e.preventDefault()}>
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por nombre…"
            aria-label="Buscar Pokémon por nombre"
          />
          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos los tipos</option>
            {types.map((t) => (
              <option key={t.name} value={t.name}>
                {typeEs(t.name)} ({t.pokemonCount})
              </option>
            ))}
          </select>
        </form>

        <div className="pokedex">
          <div className="top-ridge" />
          <div className="device-header">
            <div className="lens-shell">
              <span className="lens-glint" />
              <span className="lens-core" />
            </div>
            <div className="status-light red-light" />
            <div className="status-light yellow-light" />
            <div className="status-light green-light" />
            <div className="brand-mark">
              <span>PKM</span>
              <small>01</small>
            </div>
          </div>

          <div className="device-body">
            <div className="left-panel">
              <div className="viewer-frame">
                <div className="viewer-lights">
                  <span />
                  <span />
                </div>
                <div className="viewer">
                  <div className="scan-grid" />
                  {displayId !== null && <span className="dex-number">N.º {pad(displayId)}</span>}
                  <div className="target-ring" />
                  {displayId !== null && (
                    <img
                      key={displayId}
                      src={detail?.sprites.artworkOfficial || summary?.artwork || artworkUrl(displayId)}
                      alt={`Ilustración de ${displayName}`}
                    />
                  )}
                  <span className="scan-line" />
                </div>
                <div className="viewer-footer">
                  <span className="speaker-dot" />
                  <div className="speaker-lines">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
              <div className="id-strip">
                <span>REGISTRO ACTUAL</span>
                <strong>{displayName ? displayName.toUpperCase() : "—"}</strong>
              </div>
            </div>

            <div className="hinge" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <div className="right-panel">
              <div className="lcd-screen" aria-live="polite">
                <div className="lcd-topline">
                  <span>DATOS / BIO</span>
                  <span className="signal">•••</span>
                </div>

                {loadingList || (listStatus === "loading" && !summary) ? (
                  <div className="lcd-message">
                    <span className="spinner" />
                    <p>{slow ? "Despertando el servidor… puede tardar hasta 50 s." : "Cargando…"}</p>
                  </div>
                ) : listStatus === "error" && list.length === 0 ? (
                  <div className="lcd-message">
                    <p>No se pudo conectar con el servidor.</p>
                    <button type="button" onClick={retry}>
                      Reintentar
                    </button>
                  </div>
                ) : emptyList ? (
                  <div className="lcd-message">
                    <p>Sin resultados para tu búsqueda.</p>
                  </div>
                ) : notFound ? (
                  <div className="lcd-message">
                    <p>Pokémon no encontrado.</p>
                    <button type="button" onClick={() => setSelectedId(list[0]?.id ?? null)}>
                      Volver al inicio
                    </button>
                  </div>
                ) : detailStatus === "error" && !detail ? (
                  <div className="lcd-message">
                    <p>No se pudo cargar el detalle.</p>
                    <button type="button" onClick={retry}>
                      Reintentar
                    </button>
                  </div>
                ) : !detail ? (
                  <div className="lcd-message">
                    <span className="spinner" />
                    <p>{summary ? `Cargando ${summary.name}…` : "Cargando…"}</p>
                  </div>
                ) : (
                  <>
                    <div className="pokemon-title">
                      <span>#{pad(detail.id)}</span>
                      <h2>{detail.name}</h2>
                    </div>
                    <p className="category">{detail.genus}</p>

                    <div className="type-row">
                      <span className="label">TIPO</span>
                      <div>
                        {detail.types.map((type) => (
                          <span className={`type-pill type-${type}`} key={type}>
                            {typeEs(type)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="stats-grid">
                      <div>
                        <span className="label">ALTURA</span>
                        <strong>{formatHeight(detail.height)}</strong>
                      </div>
                      <div>
                        <span className="label">PESO</span>
                        <strong>{formatWeight(detail.weight)}</strong>
                      </div>
                      <div className="ability">
                        <span className="label">HABILIDADES</span>
                        <strong>
                          {detail.abilities
                            .map((a) => titleCase(a.name) + (a.isHidden ? " (oculta)" : ""))
                            .join(" · ")}
                        </strong>
                      </div>
                    </div>

                    <div className="base-stats" aria-label="Estadísticas base">
                      {STAT_LABELS.map(([key, label]) => (
                        <div className="stat-row" key={key}>
                          <span>{label}</span>
                          <div className="stat-bar">
                            <i style={{ width: `${Math.min(100, (detail.stats[key] / 160) * 100)}%` }} />
                          </div>
                          <b>{detail.stats[key]}</b>
                        </div>
                      ))}
                    </div>

                    <p className="description" lang="en">
                      {detail.flavorText}
                    </p>

                    <div className="evolutions">
                      <span className="label">EVOLUCIÓN</span>
                      {!detail.evolvesFrom && detail.evolvesTo.length === 0 ? (
                        <span className="evo-none">Sin evoluciones</span>
                      ) : (
                        <div>
                          {detail.evolvesFrom && (
                            <button type="button" onClick={() => goTo(detail.evolvesFrom!.id)}>
                              ← #{pad(detail.evolvesFrom.id)} {titleCase(detail.evolvesFrom.name)}
                            </button>
                          )}
                          {detail.evolvesTo.map((e) => (
                            <button type="button" key={e.id} onClick={() => goTo(e.id)}>
                              #{pad(e.id)} {titleCase(e.name)} →
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="lcd-footer">
                  <span>REGIÓN 01</span>
                  <span>
                    {list.length ? `${index >= 0 ? index + 1 : "–"} / ${list.length}` : "0 / 0"}
                  </span>
                </div>
              </div>

              <div className="controls">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  disabled={list.length < 2}
                  aria-label="Pokémon anterior"
                >
                  <ArrowIcon direction="left" />
                  <span>Anterior</span>
                </button>
                <div className="control-leds" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={list.length < 2}
                  aria-label="Pokémon siguiente"
                >
                  <span>Siguiente</span>
                  <ArrowIcon direction="right" />
                </button>
              </div>
            </div>
          </div>
          <div className="bottom-ridge" />
        </div>
        <p className="helper-text">
          Usa los controles o las flechas del teclado para navegar por el archivo
        </p>
      </section>
    </main>
  )
}
