import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, LifeBuoy, Loader2 } from 'lucide-react';
import {
  submitSupportTicket,
  type ApiErrorResult,
  type SupportCategory,
  type SupportSeverity,
} from '@/services/api';

const CATEGORIES: Array<{ value: SupportCategory; label: string }> = [
  { value: 'ACCESS', label: 'Acceso y cuentas' },
  { value: 'VISUAL_EDITOR', label: 'Editor visual de conocimiento' },
  { value: 'INFERENCE_ENGINE', label: 'Motor de inferencia' },
  { value: 'VALIDATION', label: 'Validación de bases de conocimiento' },
  { value: 'ACTIVITIES', label: 'Actividades y cursos' },
  { value: 'LICENSING', label: 'Licenciamiento institucional' },
  { value: 'OTHER', label: 'Otros' },
];

const SEVERITIES: Array<{ value: SupportSeverity; label: string }> = [
  { value: 'LOW', label: 'Baja — Consulta o duda operativa' },
  { value: 'MEDIUM', label: 'Media — Incidencia funcional parcial' },
  { value: 'HIGH', label: 'Alta — Bloqueo en flujo crítico o motor' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SupportTicketForm: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [category, setCategory] = useState<SupportCategory>('ACCESS');
  const [severity, setSeverity] = useState<SupportSeverity>('MEDIUM');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<{
    reference_code: string;
    support_level_label: string;
  } | null>(null);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (fullName.trim().length < 3) next.full_name = 'Ingrese su nombre completo.';
    if (!EMAIL_REGEX.test(email.trim())) next.email = 'Ingrese un correo válido.';
    if (subject.trim().length < 5) next.subject = 'El asunto debe tener al menos 5 caracteres.';
    if (description.trim().length < 20) {
      next.description = 'Describa la incidencia con al menos 20 caracteres.';
    }
    if (!privacyAccepted) next.privacy_accepted = 'Debe aceptar la política de privacidad.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setServerError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await submitSupportTicket({
        full_name: fullName.trim(),
        email: email.trim(),
        organization: organization.trim(),
        category,
        severity,
        subject: subject.trim(),
        description: description.trim(),
        privacy_accepted: privacyAccepted,
        website: honeypot,
      });

      if (res.data) {
        setCreatedTicket({
          reference_code: res.data.reference_code,
          support_level_label: res.data.support_level_label,
        });
      }
      setFullName('');
      setEmail('');
      setOrganization('');
      setSubject('');
      setDescription('');
      setPrivacyAccepted(false);
      setErrors({});
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setServerError(
        apiErr.message || 'No fue posible registrar el ticket en este momento.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdTicket) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-brand-accent-dark" aria-hidden="true" />
          <div>
            <h3 className="font-display text-lg font-bold text-brand-graphite">
              Incidencia registrada: {createdTicket.reference_code}
            </h3>
            <p className="mt-1.5 text-sm text-brand-slate">
              Su solicitud fue asignada a <strong>{createdTicket.support_level_label}</strong>.
              Conserve el código de referencia para seguimiento.
            </p>
            <button
              type="button"
              onClick={() => setCreatedTicket(null)}
              className="mt-4 rounded-lg border border-brand-border bg-white px-4 py-2 text-xs font-semibold text-brand-graphite hover:bg-slate-50"
            >
              Registrar otra incidencia
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="hidden" aria-hidden="true">
        <label htmlFor="support-website">Sitio web</label>
        <input
          id="support-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sup-name" className="block text-sm font-medium text-brand-graphite">
            Nombre completo <span className="text-rose-600">*</span>
          </label>
          <input
            id="sup-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-brand-border px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
          />
          {errors.full_name && <p className="mt-1 text-xs text-rose-600">{errors.full_name}</p>}
        </div>
        <div>
          <label htmlFor="sup-email" className="block text-sm font-medium text-brand-graphite">
            Correo electrónico <span className="text-rose-600">*</span>
          </label>
          <input
            id="sup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-brand-border px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
          />
          {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="sup-org" className="block text-sm font-medium text-brand-graphite">
            Institución
          </label>
          <input
            id="sup-org"
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-brand-border px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="sup-cat" className="block text-sm font-medium text-brand-graphite">
            Categoría <span className="text-rose-600">*</span>
          </label>
          <select
            id="sup-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportCategory)}
            className="mt-1 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sup-sev" className="block text-sm font-medium text-brand-graphite">
            Severidad <span className="text-rose-600">*</span>
          </label>
          <select
            id="sup-sev"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as SupportSeverity)}
            className="mt-1 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
          >
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="sup-subject" className="block text-sm font-medium text-brand-graphite">
          Asunto <span className="text-rose-600">*</span>
        </label>
        <input
          id="sup-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-brand-border px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
        />
        {errors.subject && <p className="mt-1 text-xs text-rose-600">{errors.subject}</p>}
      </div>

      <div>
        <label htmlFor="sup-desc" className="block text-sm font-medium text-brand-graphite">
          Descripción técnica de la incidencia <span className="text-rose-600">*</span>
        </label>
        <textarea
          id="sup-desc"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Indique los pasos para reproducir la incidencia, el módulo involucrado y el resultado esperado."
          className="mt-1 block w-full rounded-lg border border-brand-border px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
        />
        {errors.description && <p className="mt-1 text-xs text-rose-600">{errors.description}</p>}
      </div>

      <div>
        <label className="flex items-start gap-2.5 text-sm text-brand-slate">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => setPrivacyAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-brand-border text-brand-primary"
          />
          <span>
            Acepto la{' '}
            <a href="/privacidad" className="font-medium text-brand-primary underline">
              Política de Privacidad
            </a>{' '}
            para gestionar este ticket.
          </span>
        </label>
        {errors.privacy_accepted && (
          <p className="mt-1 text-xs text-rose-600">{errors.privacy_accepted}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Registrando ticket...
          </>
        ) : (
          <>
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            Registrar incidencia
          </>
        )}
      </button>
    </form>
  );
};
