import { FormEvent, ReactNode, RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { checkEventConflict, createEvent, EventDto, EventFormOptionsDto, fetchEventFormOptions, fetchEvents } from './services/api/events'
import { AdminRequestDto, AdminRequestStatus, approveRequest, deleteMyRequest, fetchMyRequests, fetchRequests, MyRequestDto, MyRequestStatus, rejectRequest } from './services/api/requests'
import { createUser, deleteUser, fetchUserFormOptions, fetchUsers, UserDto, UserFormOptionsDto } from './services/api/users'
import { EnvironmentDto, EnvironmentOptionsDto, fetchEnvironmentOptions, fetchEnvironments, updateEnvironment } from './services/api/environments'
import { fetchAnnualEvents, fetchReportFilters, ReportEventDto, ReportFiltersDto } from './services/api/reports'
import { fetchSessionUser, SessionUserDto } from './services/api/session'

type Role = 'public' | 'requester' | 'admin'
type View =
  | 'events'
  | 'pending'
  | 'accepted'
  | 'reports'
  | 'request'
  | 'users'
  | 'denied'
  | 'track'
  | 'mine'
  | 'spaces'

type IconName =
  | 'home'
  | 'clock'
  | 'check'
  | 'chart'
  | 'calendar'
  | 'users'
  | 'x'
  | 'search'
  | 'file'
  | 'menu'
  | 'bell'
  | 'chevron'
  | 'location'
  | 'mic'
  | 'arrow'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'grid'
  | 'logout'
  | 'lock'
  | 'mail'
  | 'eye'
  | 'filter'
  | 'info'
  | 'grip'
  | 'download'

function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <><path d="m4 12 5 5L20 6" /></>,
    chart: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    x: <><path d="m6 6 12 12M18 6 6 18" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    chevron: <><path d="m9 18 6-6-6-6" /></>,
    location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    edit: <><path d="M12 20h9" /><path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M15 3h5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-5" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    filter: <><path d="M4 5h16M7 12h10M10 19h4" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    grip: <><circle cx="8" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="8" cy="18" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="18" r="1" fill="currentColor" stroke="none" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></>,
  }
  return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function UnivilleLogo({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className={`logo ${inverse ? 'logo--inverse' : ''}`} role="img" aria-label="Univille — 60 anos">
      <img src={inverse ? '/brand/univille-60-anos-negative.png' : '/brand/univille-60-anos.png'} alt="" width={1920} height={1080} />
    </div>
  )
}

// Shared focus lifecycle for dialogs and the mobile navigation drawer.
function useModalFocus(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const generationRef = useRef(0)
  closeRef.current = onClose
  useLayoutEffect(() => {
    const panel = ref.current
    if (!open || !panel) return
    const generation = ++generationRef.current
    if (document.activeElement instanceof HTMLElement && !panel.contains(document.activeElement)) {
      returnFocusRef.current = document.activeElement
    }
    const previousFocus = returnFocusRef.current
    const previousOverflow = document.body.style.overflow
    const inertElements = new Map<HTMLElement, boolean>()
    let branch: HTMLElement = panel
    while (branch.parentElement && branch !== document.body) {
      for (const sibling of branch.parentElement.children) {
        if (sibling instanceof HTMLElement && sibling !== branch && !sibling.classList.contains('sidebar-backdrop')) {
          inertElements.set(sibling, sibling.inert)
          sibling.inert = true
        }
      }
      branch = branch.parentElement
    }
    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(element => !element.closest('[inert]') && element.getClientRects().length > 0)
    const focusFirst = () => (focusable()[0] || panel).focus({ preventScroll: true })
    document.body.style.overflow = 'hidden'
    focusFirst()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
      } else if (event.key === 'Tab') {
        const elements = focusable()
        const first = elements[0]
        const last = elements[elements.length - 1]
        if (!first) { event.preventDefault(); panel.focus(); return }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          event.preventDefault(); last.focus()
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) {
          event.preventDefault(); first.focus()
        }
      }
    }
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !panel.contains(event.target)) focusFirst()
    }
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', onFocusIn)
      document.body.style.overflow = previousOverflow
      inertElements.forEach((wasInert, element) => { element.inert = wasInert })
      queueMicrotask(() => {
        if (generation === generationRef.current && previousFocus?.isConnected && !previousFocus.closest('[inert]')) {
          previousFocus.focus({ preventScroll: true })
        }
      })
    }
  }, [open, ref])
}

function ModalOverlay({ children, className = 'modal-backdrop', onClose }: {
  children: ReactNode; className?: string; onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(ref, true, onClose)
  return createPortal(<div ref={ref} tabIndex={-1} className={className}
    onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    {children}
  </div>, document.body)
}

function Button({ children, variant = 'primary', icon, type = 'button', onClick, className = '' }: {
  children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName; type?: 'button' | 'submit'; onClick?: () => void; className?: string
}) {
  return <button type={type} onClick={onClick} className={`button button--${variant} ${className}`}>{icon && <Icon name={icon} size={18} />}{children}</button>
}

function Field({ label, children, hint, required }: { label: string; children: ReactNode; hint?: string; required?: boolean }) {
  return <label className="field"><span>{label}{required && <b> *</b>}</span>{children}{hint && <small>{hint}</small>}</label>
}

function PageTitle({ eyebrow, title, description, action, compact = false }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; compact?: boolean }) {
  return <div className={`page-title${compact ? ' page-title--compact' : ''}`}><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

function DataState({ isLoading, error, onRetry, label = 'A carregar dados...' }: { isLoading: boolean; error: string | null; onRetry: () => void; label?: string }) {
  if (isLoading) return <div className="data-state"><i className="loading-spinner" /><strong>{label}</strong><span>A simular comunicação segura com a API.</span></div>
  if (error) return <div className="data-state data-state--error"><Icon name="info" /><strong>Não foi possível carregar os dados</strong><span>{error}</span><button onClick={onRetry}>Tentar novamente</button></div>
  return null
}

const menuByRole: Record<Role, { label: string; icon: IconName; view: View }[]> = {
  public: [{ label: 'Início', icon: 'home', view: 'events' }],
  requester: [
    { label: 'Início', icon: 'home', view: 'events' },
    { label: 'Cadastrar Evento', icon: 'calendar', view: 'request' },
    { label: 'Acompanhar Requisição', icon: 'search', view: 'track' },
    { label: 'Minhas Requisições', icon: 'file', view: 'mine' },
  ],
  admin: [
    { label: 'Início', icon: 'home', view: 'events' },
    { label: 'Requisições Pendentes', icon: 'clock', view: 'pending' },
    { label: 'Requisições Aceitas', icon: 'check', view: 'accepted' },
    { label: 'Requisições Negadas', icon: 'x', view: 'denied' },
    { label: 'Relatórios', icon: 'chart', view: 'reports' },
    { label: 'Cadastrar Evento', icon: 'calendar', view: 'request' },
    { label: 'Cadastrar Utilizador', icon: 'users', view: 'users' },
    { label: 'Ambientes', icon: 'location', view: 'spaces' },
  ],
}

function PublicDashboard({ onRequest, role, globalQuery }: { onRequest: () => void; role: Role; globalQuery: string }) {
  const [events, setEvents] = useState<EventDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventDto | null>(null)
  const loadEvents = async () => {
    setIsLoading(true)
    setError(null)
    try {
      setEvents(await fetchEvents())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro inesperado ao carregar eventos.')
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { void loadEvents() }, [])
  const searchTerms = [query, globalQuery].map((term) => term.trim().toLowerCase()).filter(Boolean)
  const filtered = events.filter((event) => {
    const searchableContent = `${event.title} ${event.theme} ${event.speaker} ${event.location}`.toLowerCase()
    const matchesSearch = searchTerms.every((term) => searchableContent.includes(term))
    return matchesSearch && (selectedDay === null || Number(event.day) === selectedDay)
  })
  const calendarDays = Array.from({ length: 30 }, (_, index) => index + 1)
  const eventDays = [...new Set(events.map((event) => Number(event.day)))]
  const calendarOffset = new Date(2026, 5, 1).getDay()
  const today = new Date()
  return (
    <>
      <PageTitle compact title="Eventos na Univille" description="Descubra palestras, encontros e atividades abertas à comunidade acadêmica." action={role !== 'public' ? <Button icon="plus" onClick={onRequest}>Solicitar evento</Button> : undefined} />
      <DataState isLoading={isLoading} error={error} onRetry={loadEvents} label="A carregar agenda de eventos..." />
      {!isLoading && !error && <>
      <div className="dashboard-grid">
        <section>
          <div className="search-row">
            <div className="search-box"><Icon name="search" size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por evento ou tema..." /></div>
            <Button variant="secondary" icon="filter">Filtros</Button>
          </div>
          <div className="section-heading"><div><h2>Próximos eventos</h2><p>{selectedDay ? `${filtered.length} eventos em ${selectedDay} de junho` : `${filtered.length} eventos encontrados`}</p></div>{selectedDay ? <button className="active-filter-chip" onClick={() => setSelectedDay(null)}><Icon name="calendar" size={14} />Dia {selectedDay}<Icon name="x" size={13} /></button> : <button className="text-button">Ver calendário completo <Icon name="arrow" size={16} /></button>}</div>
          <div className="event-list">
            {filtered.map((event) => <article className={`event-card event-card--${event.color}`} key={event.title}>
              <div className={`date-block date-block--${event.color}`}><strong>{event.day}</strong><span>{event.month}</span><small>{event.weekday}</small></div>
              <div className="event-content"><div className={`tag tag--${event.color}`}>{event.theme}</div><h3>{event.title}</h3><div className="event-meta"><span><Icon name="clock" size={16} />{event.time}</span><span><Icon name="location" size={16} />{event.location}</span><span><Icon name="mic" size={16} />{event.speaker}</span></div></div>
              <button className={`event-details-button ${role === 'admin' ? 'event-details-button--icon' : ''}`} onClick={() => setSelectedEvent(event)} aria-label={`Ver detalhes de ${event.title}`}>{role === 'admin' ? <Icon name="chevron" /> : <><span>Ver detalhes</span><Icon name="arrow" size={15} /></>}</button>
              {today.getFullYear() === 2026 && today.getMonth() === 5 && today.getDate() === Number(event.day) && <span className="today-label">Hoje</span>}
            </article>)}
            {filtered.length === 0 && <div className="dashboard-empty"><Icon name="calendar" /><strong>Nenhum evento encontrado</strong><span>Não existem eventos para os filtros selecionados.</span><button onClick={() => { setSelectedDay(null); setQuery('') }}>Limpar filtros</button></div>}
          </div>
        </section>
        <aside className="calendar-card">
          <div className="calendar-header"><div><span>Calendário</span><h3>Junho 2026</h3></div><div><button aria-label="Mês anterior"><Icon name="chevron" className="rotate-180" size={18} /></button><button aria-label="Mês seguinte"><Icon name="chevron" size={18} /></button></div></div>
          <div className="weekdays">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
          <div className="calendar-days">{Array.from({ length: calendarOffset }, (_, index) => <span key={`offset-${index}`} aria-hidden="true" />)}{calendarDays.map((day) => {
            const hasEvent = eventDays.includes(day)
            return <button disabled={!hasEvent} aria-label={hasEvent ? `Filtrar eventos do dia ${day}` : `Sem eventos no dia ${day}`} className={`${selectedDay === day ? 'selected' : ''} ${hasEvent ? 'has-event' : ''} transition-all duration-300 ease-in-out`} key={day} onClick={() => hasEvent && setSelectedDay(day)}>{day}</button>
          })}</div>
          <div className="calendar-legend"><span><i /> Dia com evento</span><button disabled={selectedDay === null} onClick={() => setSelectedDay(null)}>Limpar filtro</button></div>
          <div className="mini-stat"><Icon name="calendar" /><div><strong>4 eventos</strong><span>programados este mês</span></div></div>
        </aside>
      </div>
      {selectedEvent && <ModalOverlay onClose={() => setSelectedEvent(null)}><section className="details-modal event-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="event-detail-title">
        <div className="details-modal-header"><div><span className={`tag tag--${selectedEvent.color}`}>{selectedEvent.theme}</span><h2 id="event-detail-title">{selectedEvent.title}</h2></div><button onClick={() => setSelectedEvent(null)} aria-label="Fechar detalhes"><Icon name="x" /></button></div>
        <div className="details-grid"><div><span>Data e horário</span><strong>{selectedEvent.day} de junho de 2026 · {selectedEvent.time}</strong></div><div><span>Local</span><strong>{selectedEvent.location}</strong></div><div><span>Palestrante</span><strong>{selectedEvent.speaker}</strong></div><div><span>Participação</span><strong>Aberto à comunidade acadêmica</strong></div></div>
        <div className="form-actions"><Button variant="ghost" onClick={() => setSelectedEvent(null)}>Fechar</Button><Button icon="calendar">Adicionar à agenda</Button></div>
      </section></ModalOverlay>}
      </>}
    </>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return <button type="button" role="switch" aria-checked={value} className={`toggle ${value ? 'is-on' : ''}`} onClick={onChange}><i /><span>{value ? 'Sim' : 'Não'}</span></button>
}

function FloatingControl({ label, icon, children, wide = false }: { label: string; icon: IconName; children: ReactNode; wide?: boolean }) {
  return <label className={`floating-control ${wide ? 'floating-control--wide' : ''}`}><Icon name={icon} size={17} />{children}<span>{label}</span></label>
}

function EventForm({ notify }: { notify: (type: 'success' | 'error', message: string) => void }) {
  const [options, setOptions] = useState<EventFormOptionsDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coordination, setCoordination] = useState('')
  const [accessible, setAccessible] = useState(true)
  const [publicEvent, setPublicEvent] = useState(true)
  const [space, setSpace] = useState('')
  const [date, setDate] = useState('2026-06-18')
  const [start, setStart] = useState('19:00')
  const [end, setEnd] = useState('20:30')
  const loadOptions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchEventFormOptions()
      setOptions(result)
      setSpace((current) => current || result.environments[0]?.name || '')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar opções do formulário.')
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { void loadOptions() }, [])
  const costCenter = options?.coordinations.find((item) => item.name === coordination)?.costCenter || ''
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setIsSubmitting(true)
    try {
      const payload = {
        name: String(form.get('name')),
        theme: String(form.get('theme')),
        coordination,
        speaker: String(form.get('speaker')),
        audienceSize: Number(form.get('audienceSize')),
        description: String(form.get('description')),
        environment: space,
        date,
        startTime: start,
        endTime: end,
        accessible,
        publicEvent,
      }
      const { hasConflict } = await checkEventConflict(payload)
      if (hasConflict) {
        notify('error', `Conflito de agenda: o ${space} já está reservado das 19:00 às 20:30.`)
        return
      }
      const result = await createEvent(payload)
      notify('success', `Solicitação enviada com sucesso. Acompanhe a análise pelo protocolo ${result.protocol}.`)
    } catch (requestError) {
      notify('error', requestError instanceof Error ? requestError.message : 'Não foi possível enviar a solicitação.')
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <>
      <PageTitle eyebrow="Cadastros" title="Cadastrar evento" description="Configure todos os detalhes do evento numa única experiência guiada." />
      <DataState isLoading={isLoading} error={error} onRetry={loadOptions} label="A carregar opções do evento..." />
      {!isLoading && !error && options && 
      <form className="form-card premium-form" onSubmit={submit}>
        <div className="form-section"><div className="form-section-number">01</div><div><h2>Informações gerais</h2><p>Identificação, tema e vínculo acadêmico do evento.</p></div><span className="section-status"><Icon name="check" size={14} /> Dados essenciais</span></div>
        <div className="floating-grid">
          <FloatingControl label="Nome do evento *" icon="file"><input name="name" required minLength={4} placeholder=" " /></FloatingControl>
          <FloatingControl label="Tema *" icon="grid"><input name="theme" required minLength={3} placeholder=" " /></FloatingControl>
          <FloatingControl label="Curso / Coordenação *" icon="users"><select required value={coordination} onChange={(event) => setCoordination(event.target.value)}><option value="" />{options.coordinations.map((item) => <option key={item.name}>{item.name}</option>)}</select></FloatingControl>
          <FloatingControl label="Centro de custo" icon="chart"><input readOnly value={costCenter} placeholder=" " /></FloatingControl>
          <FloatingControl label="Palestrante / responsável *" icon="mic"><input name="speaker" required minLength={3} placeholder=" " /></FloatingControl>
          <FloatingControl label="Público estimado *" icon="users"><input name="audienceSize" required type="number" min="1" placeholder=" " /></FloatingControl>
          <FloatingControl label="Descrição do evento" icon="file" wide><textarea name="description" placeholder=" " rows={3} /></FloatingControl>
        </div>
        <div className="form-divider" />
        <div className="form-section"><div className="form-section-number">02</div><div><h2>Data e local</h2><p>Defina a disponibilidade e o ambiente mais adequado.</p></div></div>
        <div className="floating-grid floating-grid--four">
          <FloatingControl label="Data *" icon="calendar"><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></FloatingControl>
          <FloatingControl label="Horário inicial *" icon="clock"><input required type="time" value={start} onChange={(event) => setStart(event.target.value)} /></FloatingControl>
          <FloatingControl label="Horário final *" icon="clock"><input required type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></FloatingControl>
          <FloatingControl label="Ambiente *" icon="location"><select value={space} onChange={(event) => setSpace(event.target.value)}>{options.environments.map((item) => <option key={item.id}>{item.name}</option>)}</select></FloatingControl>
        </div>
        <div className="switch-row"><div><span>Acessibilidade necessária</span><Toggle value={accessible} onChange={() => setAccessible(!accessible)} /></div><div><span>Evento aberto ao público</span><Toggle value={publicEvent} onChange={() => setPublicEvent(!publicEvent)} /></div></div>
        <div className="conflict-hint"><Icon name="info" /><span>A disponibilidade do ambiente será verificada ao enviar a solicitação.</span></div>
        <div className="form-actions"><Button variant="ghost">Guardar rascunho</Button><Button type="submit" icon="arrow">{isSubmitting ? 'A enviar...' : 'Enviar solicitação'}</Button></div>
      </form>
      }
    </>
  )
}

function RequestsPage({ type, notify }: { type: 'Pendente' | 'Aceita' | 'Negada'; notify: (type: 'success' | 'error', message: string) => void }) {
  const [data, setData] = useState<AdminRequestDto[]>([])
  const [selected, setSelected] = useState<AdminRequestDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [decisionMode, setDecisionMode] = useState<'details' | 'reject'>('details')
  const [reason, setReason] = useState('')
  const [allowReadjustment, setAllowReadjustment] = useState(true)
  const loadRequests = async () => {
    setIsLoading(true)
    setError(null)
    try {
      setData(await fetchRequests(type as AdminRequestStatus))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar solicitações.')
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { void loadRequests() }, [type])
  const closeDrawer = () => {
    setSelected(null)
    setDecisionMode('details')
    setReason('')
    setAllowReadjustment(true)
  }
  const approve = async () => {
    if (!selected) return
    setIsActionLoading(true)
    try {
      await approveRequest(selected.id)
      setData((current) => current.filter((item) => item.id !== selected.id))
      notify('success', `${selected.id} aprovada. O solicitante foi notificado.`)
      closeDrawer()
    } catch (requestError) {
      notify('error', requestError instanceof Error ? requestError.message : 'Não foi possível aprovar a solicitação.')
    } finally {
      setIsActionLoading(false)
    }
  }
  const confirmRejection = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected) return
    setIsActionLoading(true)
    try {
      await rejectRequest(selected.id, { reason, allowReadjustment })
      setData((current) => current.filter((item) => item.id !== selected.id))
      notify('success', `${selected.id} rejeitada e devolvida ao solicitante${allowReadjustment ? ' para reajuste' : ''}.`)
      closeDrawer()
    } catch (requestError) {
      notify('error', requestError instanceof Error ? requestError.message : 'Não foi possível rejeitar a solicitação.')
    } finally {
      setIsActionLoading(false)
    }
  }
  return <>
    <PageTitle eyebrow="Gestão de solicitações" title={`Requisições ${type === 'Pendente' ? 'pendentes' : type === 'Aceita' ? 'aceitas' : 'negadas'}`} description="Consulte e faça a gestão das solicitações de eventos acadêmicos." action={<Button variant="secondary" icon="download">Exportar</Button>} />
    <DataState isLoading={isLoading} error={error} onRetry={loadRequests} label="A carregar solicitações..." />
    {!isLoading && !error &&
    <div className="table-card"><div className="table-toolbar"><div className="search-box"><Icon name="search" size={18} /><input placeholder="Pesquisar requisição..." /></div><Button variant="secondary" icon="filter">Filtrar</Button></div>
      <div className="table-wrap"><table><thead><tr><th>Protocolo</th><th>Evento</th><th>Solicitante</th><th>Data</th><th>Estado</th><th /></tr></thead><tbody>{data.map((row) => <tr key={row.id}><td><strong>{row.id}</strong></td><td><div className="event-name-cell"><strong>{row.event}</strong><span>{row.theme}</span></div></td><td>{row.requester}</td><td>{row.date}</td><td><span className={`status status--${row.status.toLowerCase()}`}>{row.status}</span></td><td><button className="table-action" onClick={() => setSelected(row)}>{type === 'Pendente' ? 'Analisar' : 'Ver detalhes'} <Icon name="chevron" size={15} /></button></td></tr>)}</tbody></table>{data.length === 0 && <div className="processed-empty"><Icon name="check" /><strong>Caixa de análise atualizada</strong><span>Não existem solicitações pendentes neste momento.</span></div>}</div>
    </div>
    }
    {selected && <ModalOverlay className="request-drawer-backdrop" onClose={closeDrawer}>
      <aside role="dialog" aria-modal="true" className="request-drawer" onMouseDown={(event) => event.stopPropagation()} aria-label={`Análise da requisição ${selected.id}`}>
        <header className="request-drawer-header"><div><span className="eyebrow">{decisionMode === 'reject' ? 'Decisão administrativa' : 'Análise de solicitação'}</span><h2>{decisionMode === 'reject' ? 'Rejeitar solicitação' : selected.event}</h2><p>{selected.id} · enviada por {selected.requester}</p></div><button onClick={closeDrawer} aria-label="Fechar painel"><Icon name="x" /></button></header>
        {decisionMode === 'details' ? <div className="request-drawer-content">
          <div className="analysis-status"><span className="status status--pendente">Aguardando análise</span><small>Recebida em {selected.receivedAt}</small></div>
          <section className="drawer-section"><div className="drawer-section-title"><i><Icon name="file" /></i><div><h3>Dados da solicitação</h3><p>Informações fornecidas pelo solicitante.</p></div></div>
            <dl className="request-description-list"><div><dt>Protocolo</dt><dd>{selected.id}</dd></div><div><dt>Nome do evento</dt><dd>{selected.event}</dd></div><div><dt>Tema</dt><dd>{selected.theme}</dd></div><div><dt>Solicitante</dt><dd>{selected.requester}</dd></div></dl>
          </section>
          <section className="drawer-section"><div className="drawer-section-title"><i><Icon name="calendar" /></i><div><h3>Data e local</h3><p>Informações para validação da agenda.</p></div></div>
            <div className="schedule-cards"><div><Icon name="calendar" /><span>Data<strong>{selected.date}</strong></span></div><div><Icon name="clock" /><span>Horário<strong>{selected.time}</strong></span></div><div><Icon name="location" /><span>Local<strong>{selected.location}</strong></span></div></div>
          </section>
          <section className="drawer-section"><div className="drawer-section-title"><i><Icon name="users" /></i><div><h3>Público e justificativa</h3><p>Contexto e impacto esperado.</p></div></div>
            <div className="audience-box"><span>Público-alvo</span><strong>{selected.audience}</strong></div><div className="justification-box"><span>Justificativa</span><p>{selected.justification}</p></div>
          </section>
        </div> : <form className="request-drawer-content rejection-form" onSubmit={confirmRejection}>
          <div className="rejection-alert"><Icon name="info" /><div><strong>Confirme a decisão com atenção</strong><span>A justificativa abaixo será enviada ao solicitante e ficará registada no histórico.</span></div></div>
          <Field label="Justificativa da Rejeição (Enviada ao solicitante)" required><textarea required minLength={10} rows={7} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Descreva claramente o motivo e, se possível, indique como a solicitação pode ser corrigida..." /><small>{reason.length}/500 caracteres</small></Field>
          <div className="readjustment-option"><div><strong>Permitir que o solicitante reajuste e reenvie esta requisição?</strong><p>Se “Sim”, o evento volta como rascunho para o solicitante corrigir datas ou locais. Se “Não”, é cancelado definitivamente.</p></div><Toggle value={allowReadjustment} onChange={() => setAllowReadjustment(!allowReadjustment)} /></div>
        </form>}
        {type === 'Pendente' && <footer className="request-drawer-footer">{decisionMode === 'details' ? <><button className="drawer-reject-button" onClick={() => setDecisionMode('reject')}><Icon name="x" size={17} />Rejeitar</button><Button icon="check" onClick={approve}>{isActionLoading ? 'A aprovar...' : 'Aprovar Solicitação'}</Button></> : <><Button variant="ghost" onClick={() => setDecisionMode('details')}><Icon name="arrow" className="rotate-180" size={16} />Voltar / Cancelar</Button><Button variant="danger" onClick={() => document.querySelector<HTMLFormElement>('.rejection-form')?.requestSubmit()}><Icon name="x" size={17} />{isActionLoading ? 'A rejeitar...' : 'Confirmar Rejeição'}</Button></>}</footer>}
      </aside>
    </ModalOverlay>}
  </>
}

function UserRegistrationForm({ notify, onCreated }: { notify: (type: 'success' | 'error', message: string) => void; onCreated: (user: UserDto) => void }) {
  const [active, setActive] = useState(true)
  const [options, setOptions] = useState<UserFormOptionsDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadOptions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      setOptions(await fetchUserFormOptions())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar opções de utilizador.')
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { void loadOptions() }, [])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setIsSubmitting(true)
    try {
      const user = await createUser({ name: String(form.get('name')), email: String(form.get('email')), role: String(form.get('role')), coordination: String(form.get('coordination')), active })
      onCreated(user)
      notify('success', 'Utilizador cadastrado e convite enviado por e-mail.')
      formElement.reset()
    } catch (requestError) {
      notify('error', requestError instanceof Error ? requestError.message : 'Não foi possível cadastrar o utilizador.')
    } finally {
      setIsSubmitting(false)
    }
  }
  if (isLoading || error || !options) return <DataState isLoading={isLoading} error={error} onRetry={loadOptions} label="A carregar formulário de utilizador..." />
  return <form className="user-registration card" onSubmit={submit}>
    <div className="registration-intro"><i><Icon name="users" /></i><div><span className="eyebrow">Novo acesso</span><h2>Cadastrar utilizador</h2><p>Crie um perfil e associe-o a uma coordenação.</p></div></div>
    <div className="floating-grid user-grid">
      <FloatingControl label="Nome completo *" icon="users"><input name="name" required minLength={3} placeholder=" " /></FloatingControl>
      <FloatingControl label="E-mail institucional *" icon="mail"><input name="email" required type="email" placeholder=" " /></FloatingControl>
      <FloatingControl label="Perfil de acesso *" icon="lock"><select name="role" required defaultValue=""><option value="" />{options.roles.map((role) => <option key={role}>{role}</option>)}</select></FloatingControl>
      <FloatingControl label="Curso / Coordenação *" icon="grid"><select name="coordination" required defaultValue=""><option value="" />{options.coordinations.map((item) => <option key={item}>{item}</option>)}</select></FloatingControl>
    </div>
    <div className="registration-footer"><div><span>Utilizador ativo</span><Toggle value={active} onChange={() => setActive(!active)} /></div><Button type="submit" icon="plus">{isSubmitting ? 'A cadastrar...' : 'Cadastrar utilizador'}</Button></div>
  </form>
}

function AdminRegistry({ notify }: { notify: (type: 'success' | 'error', message: string) => void }) {
  const [users, setUsers] = useState<UserDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadUsers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      setUsers(await fetchUsers())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar utilizadores.')
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { void loadUsers() }, [])
  const removeUser = async (id: string) => {
    try {
      await deleteUser(id)
      setUsers((current) => current.filter((user) => user.id !== id))
      notify('success', 'Utilizador removido com sucesso.')
    } catch (requestError) {
      notify('error', requestError instanceof Error ? requestError.message : 'Não foi possível remover o utilizador.')
    }
  }
  return <>
    <PageTitle eyebrow="Cadastros" title="Utilizadores" description="Faça a gestão dos acessos ao sistema." />
    <UserRegistrationForm notify={notify} onCreated={(user) => setUsers((current) => [user, ...current])} />
    <DataState isLoading={isLoading} error={error} onRetry={loadUsers} label="A carregar utilizadores..." />
    {!isLoading && !error &&
    <div className="table-card">
      <div className="table-toolbar"><div className="search-box"><Icon name="search" size={18} /><input placeholder="Pesquisar utilizador..." /></div><span className="table-count">{users.length} registos</span></div>
      <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Perfil</th><th>Estado</th><th>Ações</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><div className="name-cell"><span>{user.name.charAt(0)}</span><strong>{user.name}</strong></div></td><td>{user.role}</td><td><span className={`status ${user.active ? 'status--active' : 'status--rascunho'}`}>{user.active ? 'Ativo' : 'Inativo'}</span></td><td><div className="action-row"><button aria-label="Editar"><Icon name="edit" size={17} /></button><button aria-label="Eliminar" onClick={() => void removeUser(user.id)}><Icon name="trash" size={17} /></button></div></td></tr>)}</tbody></table></div>
    </div>
    }
  </>
}

function SpacesPage({ notify }: { notify: (type: 'success' | 'error', message: string) => void }) {
  const [environments, setEnvironments] = useState<EnvironmentDto[]>([])
  const [options, setOptions] = useState<EnvironmentOptionsDto | null>(null)
  const [selected, setSelected] = useState<EnvironmentDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadEnvironments = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [environmentResult, optionResult] = await Promise.all([fetchEnvironments(), fetchEnvironmentOptions()])
      setEnvironments(environmentResult)
      setOptions(optionResult)
      setSelected(environmentResult[0] || null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar ambientes.')
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { void loadEnvironments() }, [])
  const save = async () => {
    if (!selected) return
    setIsSaving(true)
    try {
      const updated = await updateEnvironment(selected.id, selected)
      setEnvironments((current) => current.map((item) => item.id === updated.id ? updated : item))
      notify('success', 'Configuração do ambiente atualizada com sucesso.')
    } catch (requestError) {
      notify('error', requestError instanceof Error ? requestError.message : 'Não foi possível atualizar o ambiente.')
    } finally {
      setIsSaving(false)
    }
  }
  return <>
    <PageTitle eyebrow="Cadastros" title="Ambientes" description="Configure os espaços disponíveis para a agenda acadêmica." action={<Button icon="plus">Adicionar ambiente</Button>} />
    <DataState isLoading={isLoading} error={error} onRetry={loadEnvironments} label="A carregar ambientes..." />
    {!isLoading && !error && selected && options &&
    <div className="spaces-layout">
      <div className="spaces-list card">
        <div className="panel-title"><div><h2>Ambientes cadastrados</h2><p>{environments.length} ambientes ativos</p></div><Icon name="location" /></div>
        {environments.map((environment) => <button onClick={() => setSelected(environment)} className={`space-item ${selected.id === environment.id ? 'active' : ''}`} key={environment.id}><span><i>{environment.name.slice(0, 2).toUpperCase()}</i><div><strong>{environment.name}</strong><small>{environment.capacity} lugares</small></div></span><Icon name="chevron" size={17} /></button>)}
      </div>
      <div className="environment-editor card">
        <div className="panel-title"><div><span className="eyebrow">{selected.name}</span><h2>Configuração do ambiente</h2><p>Edite os dados de capacidade e disponibilidade do espaço.</p></div><span className={`status ${selected.active ? 'status--active' : 'status--rascunho'}`}>{selected.active ? 'Ativo' : 'Inativo'}</span></div>
        <div className="floating-grid">
          <FloatingControl label="Nome do ambiente" icon="location"><input value={selected.name} onChange={(event) => setSelected({ ...selected, name: event.target.value })} placeholder=" " /></FloatingControl>
          <FloatingControl label="Capacidade máxima" icon="users"><input type="number" value={selected.capacity} onChange={(event) => setSelected({ ...selected, capacity: Number(event.target.value) })} placeholder=" " /></FloatingControl>
          <FloatingControl label="Bloco / localização" icon="grid"><input value={selected.location} onChange={(event) => setSelected({ ...selected, location: event.target.value })} placeholder=" " /></FloatingControl>
          <FloatingControl label="Tipo de ambiente" icon="home"><select value={selected.type} onChange={(event) => setSelected({ ...selected, type: event.target.value })}>{options.types.map((item) => <option key={item}>{item}</option>)}</select></FloatingControl>
        </div>
        <div className="environment-flags"><div><span>Acessível a pessoas com mobilidade reduzida</span><Toggle value={selected.accessible} onChange={() => setSelected({ ...selected, accessible: !selected.accessible })} /></div><div><span>Disponível para eventos externos</span><Toggle value={selected.externalEvents} onChange={() => setSelected({ ...selected, externalEvents: !selected.externalEvents })} /></div></div>
        <div className="form-actions"><Button variant="ghost">Cancelar</Button><Button onClick={save}>{isSaving ? 'A guardar...' : 'Guardar alterações'}</Button></div>
      </div>
    </div>
    }
  </>
}

function ReportsPage({ notify }: { notify: (type: 'success' | 'error', message: string) => void }) {
  const [filters, setFilters] = useState<ReportFiltersDto | null>(null)
  const [data, setData] = useState<ReportEventDto[]>([])
  const [course, setCourse] = useState('')
  const [period, setPeriod] = useState('')
  const [eventStatus, setEventStatus] = useState('Todos os estados')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadFilters = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchReportFilters()
      setFilters(result)
      setCourse(result.courses[0] || '')
      setPeriod(result.periods[0] || '')
      setEventStatus(result.statuses[0] || '')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar filtros do relatório.')
      setIsLoading(false)
    }
  }
  useEffect(() => { void loadFilters() }, [])
  useEffect(() => {
    if (!course || !period) return
    const loadReport = async () => {
      setIsLoading(true)
      setError(null)
      try {
        setData(await fetchAnnualEvents({ course, period, status: eventStatus }))
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar resultados do relatório.')
      } finally {
        setIsLoading(false)
      }
    }
    void loadReport()
  }, [course, period, eventStatus])
  const participants = data.reduce((total, item) => total + item.participants, 0)
  const exportCsv = () => {
    const rows = [['Protocolo', 'Evento', 'Curso', 'Data', 'Estado', 'Participantes'], ...data.map((item) => [item.id, item.event, item.course, item.date, item.status, String(item.participants)])]
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `relatorio-${course.toLowerCase().replace(/ /g, '-')}-2026.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    notify('success', `Relatório de ${course} gerado e transferido em formato CSV.`)
  }
  const stats = [
    { label: 'Eventos no período', value: String(data.length).padStart(2, '0'), detail: period, icon: 'calendar' as IconName },
    { label: 'Participantes', value: participants.toLocaleString('pt-BR'), detail: 'presenças registadas', icon: 'users' as IconName },
    { label: 'Taxa de realização', value: `${Math.round((data.filter((item) => item.status === 'Realizado').length / Math.max(data.length, 1)) * 100)}%`, detail: 'eventos concluídos', icon: 'check' as IconName },
  ]
  return <><PageTitle eyebrow="Inteligência acadêmica" title="Relatórios de eventos" description="Analise o desempenho anual por curso ou coordenação." />
    <DataState isLoading={isLoading} error={error} onRetry={loadFilters} label="A carregar relatório analítico..." />
    {!isLoading && !error && filters &&
    <section className="report-filter-panel card">
      <div className="report-panel-header"><div><span className="eyebrow">Painel analítico</span><h2>Filtros do relatório</h2><p>Escolha obrigatoriamente uma coordenação para gerar os resultados.</p></div><Button icon="download" onClick={exportCsv}>Exportar Relatório (CSV)</Button></div>
      <div className="report-filters">
        <FloatingControl label="Período" icon="calendar"><select value={period} onChange={(event) => setPeriod(event.target.value)}>{filters.periods.map((item) => <option key={item}>{item}</option>)}</select></FloatingControl>
        <FloatingControl label="Curso / Coordenação *" icon="users"><select required value={course} onChange={(event) => setCourse(event.target.value)}>{filters.courses.map((item) => <option key={item}>{item}</option>)}</select></FloatingControl>
        <FloatingControl label="Estado do evento" icon="filter"><select value={eventStatus} onChange={(event) => setEventStatus(event.target.value)}>{filters.statuses.map((item) => <option key={item}>{item}</option>)}</select></FloatingControl>
      </div>
    </section>}
    {!isLoading && !error && filters && <>
    <div className="stats-grid report-stats">{stats.map((stat) => <div className="stat-card" key={stat.label}><div><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.detail}</small></div><i><Icon name={stat.icon} /></i></div>)}</div>
    <div className="table-card report-results"><div className="report-results-header"><div><h2>Eventos de {course}</h2><p>{data.length} resultados encontrados para o período selecionado</p></div><span className="live-indicator"><i /> Dados atualizados</span></div>
      <div className="table-wrap"><table><thead><tr><th>Protocolo</th><th>Evento</th><th>Data</th><th>Estado</th><th>Participantes</th></tr></thead><tbody>{data.map((row) => <tr key={row.id}><td><strong className="protocol">{row.id}</strong></td><td><div className="event-name-cell"><strong>{row.event}</strong><span>{row.course}</span></div></td><td>{row.date}</td><td><span className={`status ${row.status === 'Realizado' ? 'status--aprovado' : 'status--pendente'}`}>{row.status}</span></td><td><strong>{row.participants.toLocaleString('pt-BR')}</strong></td></tr>)}</tbody></table></div>
      <div className="table-footer"><span>A mostrar todos os eventos de {course}</span><strong>Total: {participants.toLocaleString('pt-BR')} participantes</strong></div>
    </div>
    </>}
  </>
}

function GenericTracking({ mine = false }: { mine?: boolean }) {
  return <><PageTitle eyebrow="Solicitações" title={mine ? 'Minhas requisições' : 'Acompanhar requisição'} description={mine ? 'Consulte o estado dos eventos solicitados por si.' : 'Informe o número de protocolo para consultar o andamento.'} />
    {!mine && <div className="tracking-search card"><Icon name="search" /><div><h2>Consultar protocolo</h2><p>O número está disponível no comprovativo da solicitação.</p><div className="protocol-row"><input placeholder="Ex.: EV-2048" /><Button>Consultar</Button></div></div></div>}
  </>
}

function MyRequestsPage({ notify }: { notify: (type: 'success' | 'error', message: string) => void }) {
  const [items, setItems] = useState<MyRequestDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Todos' | MyRequestStatus>('Todos')
  const [selected, setSelected] = useState<MyRequestDto | null>(null)
  const loadMyRequests = async () => {
    setIsLoading(true)
    setError(null)
    try {
      setItems(await fetchMyRequests())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar as suas requisições.')
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => { void loadMyRequests() }, [])
  const filtered = items.filter((item) => {
    const matchesQuery = item.event.toLowerCase().includes(query.toLowerCase()) || item.id.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (status === 'Todos' || item.status === status)
  })
  const statusClass = (value: MyRequestStatus) => ({
    'Aprovado': 'aprovado',
    'Em análise': 'pendente',
    'Rejeitado': 'rejeitado',
    'Rascunho': 'rascunho',
  })[value]
  const remove = async (id: string) => {
    try {
      await deleteMyRequest(id)
      setItems((current) => current.filter((item) => item.id !== id))
      notify('success', `A requisição ${id} foi removida da sua lista.`)
    } catch (requestError) {
      notify('error', requestError instanceof Error ? requestError.message : 'Não foi possível remover a requisição.')
    }
  }
  return <>
    <PageTitle eyebrow="Área do solicitante" title="Minhas requisições" description="Acompanhe, corrija e faça a gestão dos eventos solicitados por si." action={<Button icon="plus">Nova solicitação</Button>} />
    <DataState isLoading={isLoading} error={error} onRetry={loadMyRequests} label="A carregar as suas requisições..." />
    {!isLoading && !error && <>
    <div className="my-requests-summary">
      <span><strong>{items.length}</strong> requisições no total</span>
      <span><i className="summary-dot summary-dot--green" /><strong>{items.filter((item) => item.status === 'Aprovado').length}</strong> aprovadas</span>
      <span><i className="summary-dot summary-dot--amber" /><strong>{items.filter((item) => item.status === 'Em análise').length}</strong> em análise</span>
    </div>
    <div className="table-card my-requests-card">
      <div className="requests-toolbar">
        <div className="search-box"><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por evento ou protocolo..." /><kbd>{filtered.length}</kbd></div>
        <div className="status-filter" aria-label="Filtrar por estado">
          {(['Todos', 'Aprovado', 'Em análise', 'Rejeitado'] as const).map((item) => <button key={item} className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>{item}</button>)}
        </div>
      </div>
      <div className="table-wrap">
        <table className="requests-table">
          <thead><tr><th>Protocolo</th><th>Evento</th><th>Data e local</th><th>Estado</th><th className="actions-heading">Ações</th></tr></thead>
          <tbody>{filtered.map((row) => {
            const editable = row.status === 'Em análise' || row.status === 'Rascunho'
            return <tr key={row.id}>
              <td><strong className="protocol">{row.id}</strong></td>
              <td><div className="event-name-cell"><strong>{row.event}</strong><span>{row.theme}</span></div></td>
              <td><div className="date-location-cell"><strong>{row.date}</strong><span><Icon name="location" size={13} />{row.location}</span></div></td>
              <td><span className={`status status--${statusClass(row.status)}`}>{row.status}</span></td>
              <td><div className="request-actions">
                <button onClick={() => setSelected(row)} aria-label={`Visualizar detalhes de ${row.event}`} data-tooltip="Visualizar detalhes"><Icon name="eye" size={17} /></button>
                <button disabled={!editable} onClick={() => notify('success', `A requisição ${row.id} está pronta para edição.`)} aria-label={`Editar ${row.event}`} data-tooltip={editable ? 'Editar requisição' : 'Edição indisponível'}><Icon name="edit" size={16} /></button>
                <button className="danger-action" onClick={() => void remove(row.id)} aria-label={`Cancelar ou excluir ${row.event}`} data-tooltip="Cancelar ou excluir"><Icon name="trash" size={16} /></button>
              </div></td>
            </tr>
          })}</tbody>
        </table>
        {filtered.length === 0 && <div className="empty-table"><Icon name="search" /><strong>Nenhuma requisição encontrada</strong><span>Tente ajustar a pesquisa ou o filtro selecionado.</span><button onClick={() => { setQuery(''); setStatus('Todos') }}>Limpar filtros</button></div>}
      </div>
      <div className="table-footer"><span>A mostrar {filtered.length} de {items.length} requisições</span><div><button disabled>Anterior</button><button className="active">1</button><button disabled>Seguinte</button></div></div>
    </div>
    {selected && <ModalOverlay onClose={() => setSelected(null)}><section className="details-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="request-title">
      <div className="details-modal-header"><div><span className="eyebrow">{selected.id}</span><h2 id="request-title">{selected.event}</h2></div><button onClick={() => setSelected(null)} aria-label="Fechar detalhes"><Icon name="x" /></button></div>
      <div className="details-grid"><div><span>Tema</span><strong>{selected.theme}</strong></div><div><span>Estado</span><strong><i className={`status status--${statusClass(selected.status)}`}>{selected.status}</i></strong></div><div><span>Data</span><strong>{selected.date}</strong></div><div><span>Ambiente</span><strong>{selected.location}</strong></div></div>
      <div className="details-note"><Icon name="info" /><span>Última atualização em {selected.updatedAt}.</span></div>
      <div className="form-actions"><Button variant="ghost" onClick={() => setSelected(null)}>Fechar</Button>{(selected.status === 'Em análise' || selected.status === 'Rascunho') && <Button icon="edit" onClick={() => notify('success', `A requisição ${selected.id} está pronta para edição.`)}>Editar requisição</Button>}</div>
    </section></ModalOverlay>}
    </>}
  </>
}

function Login({ onLogin }: { onLogin: (role: Role) => void }) {
  const [forgot, setForgot] = useState(false)
  const [sent, setSent] = useState(false)
  const submit = (event: FormEvent) => { event.preventDefault(); if (forgot) setSent(true); else onLogin('requester') }
  return <div className="login-shell"><div className="login-brand"><UnivilleLogo inverse /><div className="brand-message"><span>AGENDA UNIVILLE</span><h1>Conhecimento que acontece em todos os espaços.</h1><p>Organize, acompanhe e descubra os eventos que movimentam a nossa comunidade acadêmica.</p></div></div><div className="login-panel"><button className="back-public" onClick={() => onLogin('public')}><Icon name="arrow" className="rotate-180" size={17} /> Voltar à agenda pública</button><form className="login-form" onSubmit={submit}><div className="login-icon"><Icon name={forgot ? 'mail' : 'lock'} /></div><span className="eyebrow">Portal de eventos</span><h2>{forgot ? 'Recuperar palavra-passe' : 'Bem-vindo de volta'}</h2><p>{forgot ? 'Introduza o seu e-mail institucional para receber as instruções de recuperação.' : 'Aceda com as suas credenciais institucionais.'}</p>
    {sent ? <div className="sent-state"><Icon name="check" /><strong>Verifique o seu e-mail</strong><span>Enviámos as instruções de recuperação para o endereço informado.</span></div> : <>
      <Field label="E-mail institucional"><div className="input-icon"><Icon name="mail" size={18} /><input required type="email" placeholder="nome@univille.br" /></div></Field>
      {!forgot && <Field label="Palavra-passe"><div className="input-icon"><Icon name="lock" size={18} /><input required type="password" placeholder="Introduza a palavra-passe" /><Icon name="eye" size={18} /></div></Field>}
      <Button type="submit" className="full-button">{forgot ? 'Enviar instruções' : 'Entrar no sistema'}<Icon name="arrow" size={18} /></Button>
    </>}
    <button type="button" className="forgot-link" onClick={() => { setForgot(!forgot); setSent(false) }}>{forgot ? 'Voltar ao início de sessão' : 'Esqueceu a palavra-passe?'}</button>
    {!forgot && <div className="login-demo"><span>Acesso de demonstração</span><div><button type="button" onClick={() => onLogin('requester')}>Solicitante</button><button type="button" onClick={() => onLogin('admin')}>Administrador</button></div></div>}
  </form></div></div>
}

function AppShell({ role, setRole, onLogout }: { role: Role; setRole: (role: Role) => void; onLogout: () => void }) {
  const [view, setView] = useState<View>('events')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 820px)').matches)
  const [globalQuery, setGlobalQuery] = useState('')
  const [sessionUser, setSessionUser] = useState<SessionUserDto | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const mobileMenuRef = useRef<HTMLElement>(null)
  useModalFocus(mobileMenuRef, mobileMenu, () => setMobileMenu(false))
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 821px)')
    const closeOnDesktop = () => {
      setIsMobile(!desktop.matches)
      if (desktop.matches) setMobileMenu(false)
    }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])
  const notify = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    window.setTimeout(() => setToast(null), 5000)
  }
  const loadSession = async () => {
    setSessionLoading(true)
    setSessionError(null)
    try {
      setSessionUser(await fetchSessionUser(role))
    } catch (requestError) {
      setSessionError(requestError instanceof Error ? requestError.message : 'Erro ao carregar sessão.')
    } finally {
      setSessionLoading(false)
    }
  }
  useEffect(() => { void loadSession() }, [role])
  const title = useMemo(() => menuByRole[role].find((item) => item.view === view)?.label || 'Agenda', [role, view])
  const changeRole = (newRole: Role) => { setRole(newRole); setView('events') }
  const renderView = () => {
    if (view === 'events') return <PublicDashboard role={role} globalQuery={globalQuery} onRequest={() => role === 'public' ? onLogout() : setView('request')} />
    if (view === 'request') return <EventForm notify={notify} />
    if (view === 'pending') return <RequestsPage type="Pendente" notify={notify} />
    if (view === 'accepted') return <RequestsPage type="Aceita" notify={notify} />
    if (view === 'denied') return <RequestsPage type="Negada" notify={notify} />
    if (view === 'reports') return <ReportsPage notify={notify} />
    if (view === 'spaces') return <SpacesPage notify={notify} />
    if (view === 'users') return <AdminRegistry notify={notify} />
    if (view === 'track') return <GenericTracking />
    if (view === 'mine') return <MyRequestsPage notify={notify} />
    return <PublicDashboard role={role} globalQuery={globalQuery} onRequest={() => setView('request')} />
  }
  return <div className="app-shell">
    <header className="topbar"><button className="mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label={mobileMenu ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileMenu} aria-controls="portal-navigation"><Icon name="menu" /></button><UnivilleLogo /><div className="topbar-global-search"><Icon name="search" size={18} /><input value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="Pesquisar eventos, palestrantes..." aria-label="Pesquisa global" />{globalQuery && <button onClick={() => setGlobalQuery('')} aria-label="Limpar pesquisa"><Icon name="x" size={15} /></button>}</div><div className="topbar-context"><span>Portal de Eventos</span><i /><strong>{title}</strong></div><div className="topbar-actions">
      <div className="role-switch"><span>Visualização</span><select aria-label="Perfil de visualização" value={role} onChange={(event) => changeRole(event.target.value as Role)}><option value="public">Visitante</option><option value="requester">Solicitante</option><option value="admin">Administrador</option></select></div>
      <button className="notification-button" aria-label="Notificações"><Icon name="bell" /><i>3</i></button>
      <div className={`user-chip ${sessionLoading ? 'is-loading' : ''}`} title={sessionError || undefined} onClick={() => sessionError && void loadSession()}><span>{sessionLoading ? '··' : sessionUser?.initials || '!'}</span><div><strong>{sessionLoading ? 'A carregar...' : sessionUser?.name || 'Sessão indisponível'}</strong><small>{sessionLoading ? 'A sincronizar perfil' : sessionUser?.roleLabel || 'Clique para tentar novamente'}</small></div><Icon name="chevron" className="rotate-90" size={16} /></div>
    </div></header>
    <aside inert={isMobile && !mobileMenu} ref={mobileMenuRef} id="portal-navigation" tabIndex={-1} role={mobileMenu ? 'dialog' : undefined} aria-modal={mobileMenu ? true : undefined} aria-label="Navegação do portal" className={`sidebar ${mobileMenu ? 'is-open' : ''}`}><button className="mobile-menu-close" aria-label="Fechar menu" onClick={() => setMobileMenu(false)}><Icon name="x" /></button><div className="sidebar-label">Navegação</div><nav aria-label="Principal">{menuByRole[role].map((item) => <button aria-current={view === item.view ? 'page' : undefined} className={view === item.view ? 'active' : ''} key={item.label} onClick={() => { setView(item.view); setMobileMenu(false) }}><Icon name={item.icon} /><span>{item.label}</span>{view === item.view && <i />}</button>)}</nav><div className="sidebar-bottom"><div className="support-card"><Icon name="info" /><strong>Precisa de ajuda?</strong><span>Fale com a equipa de eventos.</span><button>Central de suporte</button></div><button className="logout-button" onClick={onLogout}><Icon name="logout" /><span>{role === 'public' ? 'Entrar no sistema' : 'Terminar sessão'}</span></button></div></aside>
    {mobileMenu && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}
    <main><div className="view-content" key={`${role}-${view}`}>{renderView()}</div></main>
    {toast && <div className={`toast toast--${toast.type}`} role="alert"><i><Icon name={toast.type === 'error' ? 'x' : 'check'} /></i><div><strong>{toast.type === 'error' ? 'Horário indisponível' : 'Tudo certo'}</strong><span>{toast.message}</span></div><button onClick={() => setToast(null)} aria-label="Fechar"><Icon name="x" size={17} /></button></div>}
  </div>
}

export default function App() {
  const [screen, setScreen] = useState<'app' | 'login'>('app')
  const [role, setRole] = useState<Role>('public')
  if (screen === 'login') return <Login onLogin={(newRole) => { setRole(newRole); setScreen('app') }} />
  return <AppShell role={role} setRole={setRole} onLogout={() => setScreen('login')} />
}
