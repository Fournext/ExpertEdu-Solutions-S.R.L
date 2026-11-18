import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Layers,
  Loader2,
  UserCheck,
} from 'lucide-react';
import {
  enrollInStudio,
  fetchCurrentUser,
  getStoredSession,
  launchStudioSso,
  saveStoredSession,
  type ApiErrorResult,
  type CorporateUser,
  type StudioPlanCode,
  type StudioRoleCode,
} from '@/services/api';

const PLAN_OPTIONS: Array<{
  code: StudioPlanCode;
  label: string;
  description: string;
}> = [
  {
    code: 'ESTUDIANTE',
    label: 'Plan Estudiante',
    description: 'Acceso individual para resolver actividades, practicar e inspeccionar inferencias.',
  },
  {
    code: 'DOCENTE_INDIVIDUAL',
    label: 'Plan Docente Individual',
    description: 'Creación de bases de conocimiento, cursos y actividades académicas.',
  },
  {
    code: 'INSTITUCIONAL',
    label: 'Licencia Institucional',
    description: 'Implementación coordinada para carreras, departamentos y facultades.',
  },
];

export const CustomerDashboard: React.FC = () => {
  const [user, setUser] = useState<CorporateUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEnrollForm, setShowEnrollForm] = useState(false);

  const [selectedRole, setSelectedRole] = useState<StudioRoleCode>('DOCENTE');
  const [selectedPlan, setSelectedPlan] = useState<StudioPlanCode>('DOCENTE_INDIVIDUAL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      window.location.assign('/login?next=/mi-cuenta');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const wantsProduct = params.get('producto') === 'expertedu-studio';

    fetchCurrentUser()
      .then((res) => {
        setUser(res.data);
        saveStoredSession({ token: stored.token, user: res.data });
        const studioMem = res.data.memberships.find((m) => m.product_code === 'EXPERTEDU_STUDIO');
        if (studioMem) {
          setSelectedRole(studioMem.role);
          setSelectedPlan(studioMem.plan_code);
        } else if (wantsProduct) {
          setShowEnrollForm(true);
        }
      })
      .catch(() => {
        saveStoredSession(null);
        window.location.assign('/login?next=/mi-cuenta');
      })
      .finally(() => setLoading(false));
  }, []);

  const studioMembership = user?.memberships.find((m) => m.product_code === 'EXPERTEDU_STUDIO');

  const handleEnrollAndLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const res = await enrollInStudio(selectedRole, selectedPlan);
      const stored = getStoredSession();
      if (stored) {
        saveStoredSession({ token: stored.token, user: res.data.user });
      }
      setUser(res.data.user);
      setShowEnrollForm(false);
      setNotice(
        'Usuario sincronizado con ExpertEdu Studio. Abriendo plataforma con tu sesión activa...',
      );
      window.location.assign(res.data.sso_url);
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setError(apiErr.message || 'No se pudo activar el producto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectLaunch = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await launchStudioSso();
      window.location.assign(res.data.sso_url);
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setError(apiErr.message || 'No se pudo abrir ExpertEdu Studio.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-brand-slate">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand-primary" aria-hidden="true" />
        Cargando información de tu cuenta...
      </div>
    );
  }

  if (!user) return null;

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

      {notice && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-emerald" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      {/* Resumen de cuenta */}
      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
              Cuenta corporativa verificada
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-brand-graphite">
              {user.full_name}
            </h2>
            <p className="mt-1 text-sm text-brand-slate">
              @{user.username} · {user.email}
              {user.organization ? ` · ${user.organization}` : ''}
            </p>
          </div>
          {user.is_superadmin && (
            <a
              href="/superadmin"
              className="rounded-lg bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-200"
            >
              Ir al Panel Superadmin
            </a>
          )}
        </div>
      </div>

      {/* Productos contratados / activos */}
      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border pb-4">
          <div className="flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-brand-primary" aria-hidden="true" />
            <h3 className="font-display text-xl font-bold text-brand-graphite">
              Mis productos, planes y roles
            </h3>
          </div>
          {studioMembership && !showEnrollForm && (
            <button
              type="button"
              onClick={() => setShowEnrollForm(true)}
              className="text-xs font-semibold text-brand-primary hover:underline"
            >
              Cambiar rol o plan
            </button>
          )}
        </div>

        {user.is_superadmin ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                  Acceso directo Superadmin
                </span>
                <h4 className="mt-2 font-display text-xl font-bold text-brand-graphite">
                  ExpertEdu Studio — Admin Central
                </h4>
                <p className="mt-1 text-sm text-brand-slate">
                  Como administrador corporativo puedes ingresar directamente a ExpertEdu Studio sin
                  seleccionar plan ni rol de cliente.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDirectLaunch}
                disabled={submitting}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
              >
                {submitting ? 'Abriendo sesión...' : 'Ir directo a ExpertEdu Studio'}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : studioMembership ? (
          <div className="mt-6 rounded-xl border border-brand-primary/25 bg-brand-surface p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Activo
                </span>
                <h4 className="mt-2 font-display text-xl font-bold text-brand-graphite">
                  {studioMembership.product_name}
                </h4>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-brand-slate">
                  <span>
                    <strong className="text-brand-graphite">Rol:</strong>{' '}
                    {studioMembership.role_label}
                  </span>
                  <span>·</span>
                  <span>
                    <strong className="text-brand-graphite">Plan:</strong>{' '}
                    {studioMembership.plan_name}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDirectLaunch}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
              >
                {submitting ? 'Abriendo sesión...' : 'Abrir ExpertEdu Studio'}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-brand-border bg-brand-surface p-6 text-center">
            <p className="text-sm text-brand-slate">
              Todavía no has activado ningún producto con tu cuenta.
            </p>
            {!showEnrollForm && (
              <button
                type="button"
                onClick={() => setShowEnrollForm(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover"
              >
                Activar ExpertEdu Studio
              </button>
            )}
          </div>
        )}

        {/* Selector de Rol (Docente / Estudiante) + Plan */}
        {showEnrollForm && (
          <form
            onSubmit={handleEnrollAndLaunch}
            className="mt-6 space-y-6 rounded-xl border border-brand-border bg-slate-50 p-5"
          >
            <div>
              <h4 className="font-display text-lg font-bold text-brand-graphite">
                ¿Cómo deseas registrar tu usuario en ExpertEdu Studio?
              </h4>
              <p className="mt-1 text-xs text-brand-slate">
                Tu sesión de ExpertEdu se compartirá automáticamente con ExpertEdu Studio usando el
                rol que selecciones.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('DOCENTE');
                    if (selectedPlan === 'ESTUDIANTE') setSelectedPlan('DOCENTE_INDIVIDUAL');
                  }}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                    selectedRole === 'DOCENTE'
                      ? 'border-brand-primary bg-white ring-2 ring-brand-primary/20'
                      : 'border-brand-border bg-white hover:border-slate-300'
                  }`}
                >
                  <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" aria-hidden="true" />
                  <div>
                    <p className="font-display text-sm font-bold text-brand-graphite">Docente</p>
                    <p className="mt-1 text-xs text-brand-slate">
                      Crear sistemas expertos, gestionar cursos, asignar actividades y calificar.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('ESTUDIANTE');
                    setSelectedPlan('ESTUDIANTE');
                  }}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                    selectedRole === 'ESTUDIANTE'
                      ? 'border-brand-primary bg-white ring-2 ring-brand-primary/20'
                      : 'border-brand-border bg-white hover:border-slate-300'
                  }`}
                >
                  <GraduationCap
                    className="mt-0.5 h-5 w-5 shrink-0 text-brand-emerald"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-display text-sm font-bold text-brand-graphite">Estudiante</p>
                    <p className="mt-1 text-xs text-brand-slate">
                      Unirse a cursos, resolver actividades y experimentar con el motor lógico.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="studio-plan-select"
                className="block font-display text-sm font-bold text-brand-graphite"
              >
                Selecciona tu plan
              </label>
              <select
                id="studio-plan-select"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as StudioPlanCode)}
                className="mt-2 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite"
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label} — {p.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEnrollForm(false)}
                className="rounded-lg border border-brand-border bg-white px-4 py-2.5 text-xs font-semibold text-brand-slate hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
              >
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                {submitting
                  ? 'Registrando en ExpertEdu Studio...'
                  : 'Confirmar rol e ingresar a ExpertEdu Studio'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
