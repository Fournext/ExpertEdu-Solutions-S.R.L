import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Inbox,
  Loader2,
  Mail,
  Users,
} from 'lucide-react';
import {
  fetchSuperAdminInbox,
  fetchSuperAdminOverview,
  getStoredSession,
  saveStoredSession,
  updateInboxItemStatus,
  type ApiErrorResult,
  type InboxMessageItem,
  type SuperAdminInboxData,
  type SuperAdminOverviewData,
} from '@/services/api';

const PLAN_LABELS: Record<string, string> = {
  ESTUDIANTE: 'Plan Estudiante',
  DOCENTE_INDIVIDUAL: 'Plan Docente Individual',
  INSTITUCIONAL: 'Licencia Institucional',
};

const ROLE_LABELS: Record<string, string> = {
  DOCENTE: 'Docente',
  ESTUDIANTE: 'Estudiante',
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

export const SuperAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kpis' | 'inbox'>('kpis');
  const [mailboxTab, setMailboxTab] = useState<'commercial' | 'support'>('commercial');
  const [overview, setOverview] = useState<SuperAdminOverviewData | null>(null);
  const [inbox, setInbox] = useState<SuperAdminInboxData | null>(null);
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

    Promise.all([fetchSuperAdminOverview(), fetchSuperAdminInbox()])
      .then(([ovRes, inbRes]) => {
        setOverview(ovRes.data);
        setInbox(inbRes.data);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-brand-slate">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand-primary" aria-hidden="true" />
        Cargando métricas y buzones corporativos...
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
          KPIs, Productos y Clientes
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
      </div>

      {activeTab === 'kpis' && overview && (
        <div className="space-y-8">
          {/* KPIs principales */}
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
                Usuarios en ExpertEdu Studio
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-brand-primary">
                {overview.kpis.total_active_subscriptions}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                Por rol
              </p>
              <div className="mt-2 space-y-1 text-sm text-brand-slate">
                {overview.kpis.by_role.length === 0 ? (
                  <p>Sin inscripciones aún</p>
                ) : (
                  overview.kpis.by_role.map((r) => (
                    <p key={r.role} className="flex justify-between">
                      <span>{ROLE_LABELS[r.role] || r.role}</span>
                      <strong className="text-brand-graphite">{r.total}</strong>
                    </p>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                Por plan
              </p>
              <div className="mt-2 space-y-1 text-sm text-brand-slate">
                {overview.kpis.by_plan.length === 0 ? (
                  <p>Sin planes aún</p>
                ) : (
                  overview.kpis.by_plan.map((p) => (
                    <p key={p.plan_code} className="flex justify-between">
                      <span>{PLAN_LABELS[p.plan_code] || p.plan_code}</span>
                      <strong className="text-brand-graphite">{p.total}</strong>
                    </p>
                  ))
                )}
              </div>
            </div>
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
                        No hay clientes registrados todavía.
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
    </div>
  );
};
