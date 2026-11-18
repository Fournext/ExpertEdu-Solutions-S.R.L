import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Filter,
  Inbox,
  Loader2,
  Mail,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import {
  createChatbotKnowledge,
  fetchChatbotKnowledge,
  fetchSuperAdminInbox,
  fetchSuperAdminOverview,
  getStoredSession,
  saveStoredSession,
  updateChatbotKnowledge,
  updateInboxItemStatus,
  type ApiErrorResult,
  type ChatbotKnowledgeItem,
  type InboxMessageItem,
  type KnowledgeCategory,
  type SuperAdminInboxData,
  type SuperAdminOverviewData,
} from '@/services/api';
import { SITE_CONFIG } from '@/config/site';

const PLAN_LABELS: Record<string, string> = {
  ESTUDIANTE: 'Plan Estudiante',
  DOCENTE_INDIVIDUAL: 'Plan Docente Individual',
  INSTITUCIONAL: 'Licencia Institucional',
};

const ROLE_LABELS: Record<string, string> = {
  DOCENTE: 'Docente',
  ESTUDIANTE: 'Estudiante',
};

const PRODUCT_LABELS: Record<string, string> = {
  EXPERTEDU_STUDIO: 'ExpertEdu Studio',
};

const CONTACT_STATUSES = [
  { value: 'NEW', label: 'Nueva' },
  { value: 'IN_REVIEW', label: 'En revisión' },
  { value: 'RESPONDED', label: 'Respondida' },
  { value: 'ARCHIVED', label: 'Archivada' },
];

const SUPPORT_STATUSES = [
  { value: 'OPEN', label: 'Abierto' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'RESOLVED', label: 'Resuelto' },
  { value: 'CLOSED', label: 'Cerrado' },
];

const KNOWLEDGE_CATEGORIES: Array<{ value: KnowledgeCategory; label: string }> = [
  { value: 'EMPRESA', label: 'Empresa (ExpertEdu)' },
  { value: 'PRODUCTO', label: 'Producto (ExpertEdu Studio)' },
  { value: 'PRECIOS', label: 'Planes y precios' },
  { value: 'SOPORTE', label: 'Soporte y contacto' },
  { value: 'OTRO', label: 'Información adicional' },
];

interface ChartBarItem {
  label: string;
  value: number;
  colorClass: string;
}

const HorizontalBarChart: React.FC<{ title: string; items: ChartBarItem[] }> = ({
  title,
  items,
}) => {
  const maxVal = Math.max(1, ...items.map((i) => i.value));
  const totalSum = items.reduce((acc, i) => acc + i.value, 0);

  return (
    <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-brand-graphite">{title}</h3>
        <span className="text-xs font-medium text-brand-muted">Total: {totalSum}</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-6 text-xs text-brand-slate">Sin datos registrados para este filtro.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const widthPct = Math.round((item.value / maxVal) * 100);
            const sharePct = totalSum > 0 ? Math.round((item.value / totalSum) * 100) : 0;
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-brand-graphite">{item.label}</span>
                  <span className="text-brand-slate">
                    <strong className="text-brand-graphite">{item.value}</strong> ({sharePct}%)
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${item.colorClass}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const SuperAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kpis' | 'inbox' | 'chatbot'>('kpis');
  const [mailboxTab, setMailboxTab] = useState<'commercial' | 'support'>('commercial');
  const [productFilter, setProductFilter] = useState<string>('ALL');

  const [overview, setOverview] = useState<SuperAdminOverviewData | null>(null);
  const [inbox, setInbox] = useState<SuperAdminInboxData | null>(null);
  const [knowledge, setKnowledge] = useState<ChatbotKnowledgeItem[]>([]);

  const [kbTitle, setKbTitle] = useState('');
  const [kbCategory, setKbCategory] = useState<KnowledgeCategory>('EMPRESA');
  const [kbContent, setKbContent] = useState('');
  const [kbSaving, setKbSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      window.location.assign('/login?next=/superadmin');
      return;
    }
    if (!stored.user.is_superadmin) {
      setError('Acceso restringido: esta vista es exclusiva para superadministradores.');
      setLoading(false);
      return;
    }

    Promise.all([
      fetchSuperAdminOverview('ALL'),
      fetchSuperAdminInbox(),
      fetchChatbotKnowledge(),
    ])
      .then(([ovRes, inbRes, kbRes]) => {
        setOverview(ovRes.data);
        setInbox(inbRes.data);
        setKnowledge(kbRes.data);
      })
      .catch((err) => {
        const apiErr = err as ApiErrorResult;
        if (apiErr.status === 401) {
          saveStoredSession(null);
          window.location.assign('/login?next=/superadmin');
          return;
        }
        setError(apiErr.message || 'No se pudo cargar el panel de superadministrador.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleFilterChange = async (nextCode: string) => {
    setProductFilter(nextCode);
    try {
      const res = await fetchSuperAdminOverview(nextCode);
      setOverview(res.data);
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setError(apiErr.message || 'No se pudo filtrar los KPIs.');
    }
  };

  const handleStatusChange = async (item: InboxMessageItem, newStatus: string) => {
    try {
      await updateInboxItemStatus(item.item_type, item.id, newStatus);
      const inbRes = await fetchSuperAdminInbox();
      setInbox(inbRes.data);
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setError(apiErr.message || 'No se pudo actualizar el estado del mensaje.');
    }
  };

  const handleCreateKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (kbTitle.trim().length < 3 || kbContent.trim().length < 10) {
      setError('Completa un título (mín. 3 caracteres) y un contenido (mín. 10 caracteres).');
      return;
    }
    setError('');
    setKbSaving(true);
    try {
      const res = await createChatbotKnowledge({
        title: kbTitle.trim(),
        category: kbCategory,
        content: kbContent.trim(),
        is_active: true,
      });
      setKnowledge((prev) => [res.data, ...prev]);
      setKbTitle('');
      setKbContent('');
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setError(apiErr.message || 'No se pudo guardar la información del chatbot.');
    } finally {
      setKbSaving(false);
    }
  };

  const handleToggleKnowledge = async (item: ChatbotKnowledgeItem) => {
    try {
      const res = await updateChatbotKnowledge(item.id, { is_active: !item.is_active });
      setKnowledge((prev) => prev.map((k) => (k.id === item.id ? res.data : k)));
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setError(apiErr.message || 'No se pudo actualizar el estado.');
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    const stored = getStoredSession();
    try {
      await fetch(`${SITE_CONFIG.apiBaseUrl}/superadmin/chatbot-knowledge/${id}/`, {
        method: 'DELETE',
        headers: stored?.token ? { Authorization: `Bearer ${stored.token}` } : {},
      });
      setKnowledge((prev) => prev.filter((k) => k.id !== id));
    } catch {
      setError('No se pudo eliminar el registro.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-brand-slate">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand-primary" aria-hidden="true" />
        Cargando métricas, buzones y base de conocimiento...
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </div>
    );
  }

  const activeMessages: InboxMessageItem[] =
    mailboxTab === 'commercial'
      ? inbox?.commercial_messages || []
      : inbox?.support_messages || [];

  const productChartItems: ChartBarItem[] = (overview?.kpis.by_product || []).map((p) => ({
    label: PRODUCT_LABELS[p.product_code] || p.product_code,
    value: p.total,
    colorClass: 'bg-brand-primary',
  }));

  const planChartItems: ChartBarItem[] = (overview?.kpis.by_plan || []).map((p, idx) => ({
    label: PLAN_LABELS[p.plan_code] || p.plan_code,
    value: p.total,
    colorClass:
      idx === 0 ? 'bg-brand-primary' : idx === 1 ? 'bg-brand-emerald' : 'bg-indigo-500',
  }));

  const roleChartItems: ChartBarItem[] = (overview?.kpis.by_role || []).map((r) => ({
    label: ROLE_LABELS[r.role] || r.role,
    value: r.total,
    colorClass: r.role === 'DOCENTE' ? 'bg-brand-primary' : 'bg-brand-emerald',
  }));

  return (
    <div className="space-y-8">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs principales */}
      <div className="flex flex-wrap gap-3 border-b border-brand-border pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('kpis')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'kpis'
              ? 'bg-brand-primary text-white'
              : 'border border-brand-border bg-white text-brand-slate hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          KPIs, Gráficas y Clientes
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inbox')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'inbox'
              ? 'bg-brand-primary text-white'
              : 'border border-brand-border bg-white text-brand-slate hover:bg-slate-50'
          }`}
        >
          <Inbox className="h-4 w-4" aria-hidden="true" />
          Correos recibidos (2 casillas)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chatbot')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'chatbot'
              ? 'bg-brand-primary text-white'
              : 'border border-brand-border bg-white text-brand-slate hover:bg-slate-50'
          }`}
        >
          <Bot className="h-4 w-4" aria-hidden="true" />
          Base de conocimiento Chatbot ({knowledge.length})
        </button>
      </div>

      {activeTab === 'kpis' && overview && (
        <div className="space-y-8">
          {/* Filtro por servicio */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-border bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-graphite">
              <Filter className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              Filtrar métricas por servicio:
            </div>
            <select
              aria-label="Filtrar KPIs por servicio"
              value={productFilter}
              onChange={(e) => void handleFilterChange(e.target.value)}
              className="rounded-lg border border-brand-border bg-brand-surface px-3.5 py-2 text-sm font-medium text-brand-graphite"
            >
              <option value="ALL">Todos los servicios</option>
              {(overview.available_products || []).map((prod) => (
                <option key={prod.code} value={prod.code}>
                  {prod.label}
                </option>
              ))}
            </select>
          </div>

          {/* KPIs numéricos */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                Clientes registrados
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-brand-graphite">
                {overview.kpis.total_customers}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                Suscripciones activas (filtro)
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-brand-primary">
                {overview.kpis.total_active_subscriptions}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                Docentes activos
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-brand-graphite">
                {overview.kpis.by_role.find((r) => r.role === 'DOCENTE')?.total || 0}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                Estudiantes activos
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-brand-emerald">
                {overview.kpis.by_role.find((r) => r.role === 'ESTUDIANTE')?.total || 0}
              </p>
            </div>
          </div>

          {/* Gráficas de KPIs */}
          <div className="grid gap-6 lg:grid-cols-3">
            <HorizontalBarChart title="Usuarios por servicio" items={productChartItems} />
            <HorizontalBarChart title="Distribución por plan" items={planChartItems} />
            <HorizontalBarChart title="Distribución por rol" items={roleChartItems} />
          </div>

          {/* Tabla de clientes */}
          <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 border-b border-brand-border pb-4">
              <Users className="h-5 w-5 text-brand-primary" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold text-brand-graphite">
                Detalle de clientes y productos asignados
              </h3>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-brand-border text-xs uppercase text-brand-muted">
                  <tr>
                    <th className="py-3 pr-4">Cliente</th>
                    <th className="py-3 pr-4">Correo</th>
                    <th className="py-3 pr-4">Producto</th>
                    <th className="py-3 pr-4">Plan</th>
                    <th className="py-3">Rol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {overview.customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-brand-slate">
                        No hay clientes registrados para este filtro.
                      </td>
                    </tr>
                  ) : (
                    overview.customers.map((c) => {
                      const mem = c.memberships[0];
                      return (
                        <tr key={c.id}>
                          <td className="py-3 pr-4 font-medium text-brand-graphite">
                            {c.full_name}
                            <span className="block text-xs text-brand-muted">@{c.username}</span>
                          </td>
                          <td className="py-3 pr-4 text-brand-slate">{c.email}</td>
                          <td className="py-3 pr-4 text-brand-slate">
                            {mem ? mem.product_name : 'Sin producto'}
                          </td>
                          <td className="py-3 pr-4 text-brand-slate">
                            {mem ? mem.plan_name : '—'}
                          </td>
                          <td className="py-3">
                            {mem ? (
                              <span className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-primary">
                                {mem.role_label}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inbox' && inbox && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setMailboxTab('commercial')}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${
                mailboxTab === 'commercial'
                  ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                  : 'border-brand-border bg-white text-brand-slate'
              }`}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Comercial ({inbox.mailboxes.commercial}) — {inbox.commercial_messages.length}
            </button>

            <button
              type="button"
              onClick={() => setMailboxTab('support')}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${
                mailboxTab === 'support'
                  ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                  : 'border-brand-border bg-white text-brand-slate'
              }`}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Soporte ({inbox.mailboxes.support}) — {inbox.support_messages.length}
            </button>
          </div>

          <div className="space-y-4">
            {activeMessages.length === 0 ? (
              <div className="rounded-2xl border border-brand-border bg-white p-8 text-center text-sm text-brand-slate">
                No hay mensajes recibidos en esta casilla todavía.
              </div>
            ) : (
              activeMessages.map((msg) => {
                const statusOptions =
                  msg.item_type === 'contact' ? CONTACT_STATUSES : SUPPORT_STATUSES;
                return (
                  <div
                    key={`${msg.item_type}-${msg.id}`}
                    className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-brand-muted">
                          {msg.reference_code && (
                            <span className="font-mono font-semibold text-brand-primary">
                              {msg.reference_code}
                            </span>
                          )}
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-brand-graphite">
                            {msg.category_label}
                          </span>
                          <span>Destino: {msg.target_inbox}</span>
                        </div>
                        <h4 className="mt-2 font-display text-base font-bold text-brand-graphite">
                          {msg.subject}
                        </h4>
                        <p className="mt-1 text-xs text-brand-slate">
                          De: <strong>{msg.full_name}</strong> ({msg.email})
                          {msg.organization ? ` · ${msg.organization}` : ''}
                        </p>
                      </div>

                      <select
                        aria-label={`Estado de ${msg.subject}`}
                        value={msg.status}
                        onChange={(e) => handleStatusChange(msg, e.target.value)}
                        className="rounded-lg border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-graphite"
                      >
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <p className="mt-4 whitespace-pre-line rounded-xl bg-brand-surface p-3.5 text-sm text-brand-slate">
                      {msg.body}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'chatbot' && (
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateKnowledge}
              className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                <h3 className="font-display text-lg font-bold text-brand-graphite">
                  Cargar información para el Chatbot
                </h3>
              </div>
              <p className="text-xs text-brand-slate">
                Todo lo que agregues aquí alimentará en tiempo real las respuestas del asistente
                público Gemini en la landing.
              </p>

              <div>
                <label htmlFor="kb-title" className="block text-xs font-semibold text-brand-graphite">
                  Título o tema
                </label>
                <input
                  id="kb-title"
                  type="text"
                  value={kbTitle}
                  onChange={(e) => setKbTitle(e.target.value)}
                  placeholder="Ej. Requisitos para licencia universitaria"
                  className="mt-1 block w-full rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-graphite"
                />
              </div>

              <div>
                <label
                  htmlFor="kb-category"
                  className="block text-xs font-semibold text-brand-graphite"
                >
                  Categoría
                </label>
                <select
                  id="kb-category"
                  value={kbCategory}
                  onChange={(e) => setKbCategory(e.target.value as KnowledgeCategory)}
                  className="mt-1 block w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-graphite"
                >
                  {KNOWLEDGE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="kb-content"
                  className="block text-xs font-semibold text-brand-graphite"
                >
                  Contenido informativo
                </label>
                <textarea
                  id="kb-content"
                  rows={5}
                  value={kbContent}
                  onChange={(e) => setKbContent(e.target.value)}
                  placeholder="Describe detalles, respuestas frecuentes, procesos o beneficios..."
                  className="mt-1 block w-full rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-graphite"
                />
              </div>

              <button
                type="submit"
                disabled={kbSaving}
                className="w-full rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
              >
                {kbSaving ? 'Guardando...' : 'Guardar en base del Chatbot'}
              </button>
            </form>
          </div>

          <div className="space-y-4 lg:col-span-7">
            {knowledge.length === 0 ? (
              <div className="rounded-2xl border border-brand-border bg-white p-8 text-center text-sm text-brand-slate">
                Aún no cargaste entradas personalizadas. El chatbot responde con la información base
                de ExpertEdu y ExpertEdu Studio.
              </div>
            ) : (
              knowledge.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-primary">
                        {item.category_label}
                      </span>
                      <h4 className="mt-2 font-display text-base font-bold text-brand-graphite">
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleToggleKnowledge(item)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          item.is_active
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {item.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteKnowledge(item.id)}
                        aria-label={`Eliminar ${item.title}`}
                        className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm text-brand-slate">
                    {item.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
