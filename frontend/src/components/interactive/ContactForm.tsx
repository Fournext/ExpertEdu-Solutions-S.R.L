import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Send, Loader2 } from 'lucide-react';
import {
  submitContactInquiry,
  type ApiErrorResult,
  type InquiryType,
} from '@/services/api';

interface ContactFormProps {
  defaultInquiryType?: InquiryType;
  sourcePage?: string;
}

const INQUIRY_OPTIONS: Array<{ value: InquiryType; label: string }> = [
  { value: 'GENERAL', label: 'Información general' },
  { value: 'DEMO', label: 'Solicitud de demostración' },
  { value: 'TECH_SERVICES', label: 'Servicios tecnológicos' },
  { value: 'INSTITUTIONAL_LICENSING', label: 'Licenciamiento institucional' },
  { value: 'SUPPORT', label: 'Soporte' },
  { value: 'OTHER', label: 'Otros' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ContactForm: React.FC<ContactFormProps> = ({
  defaultInquiryType = 'GENERAL',
  sourcePage = '/contacto',
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [inquiryType, setInquiryType] = useState<InquiryType>(defaultInquiryType);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo') as InquiryType | null;
    const plan = params.get('plan');

    if (tipo && INQUIRY_OPTIONS.some((opt) => opt.value === tipo)) {
      setInquiryType(tipo);
    }
    if (plan && !subject) {
      setSubject(`Consulta sobre plan ${plan}`);
    }
  }, []);

  const validateClient = (): boolean => {
    const next: Record<string, string> = {};
    if (fullName.trim().length < 3) {
      next.full_name = 'Ingrese su nombre completo (mínimo 3 caracteres).';
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      next.email = 'Ingrese un correo electrónico válido.';
    }
    if (subject.trim().length < 5) {
      next.subject = 'El asunto debe tener al menos 5 caracteres.';
    }
    if (message.trim().length < 15) {
      next.message = 'El mensaje debe tener al menos 15 caracteres.';
    }
    if (!privacyAccepted) {
      next.privacy_accepted = 'Debe aceptar la política de privacidad para continuar.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setServerError('');
    if (!validateClient()) return;

    setIsSubmitting(true);
    try {
      const result = await submitContactInquiry({
        full_name: fullName.trim(),
        email: email.trim(),
        organization: organization.trim(),
        inquiry_type: inquiryType,
        subject: subject.trim(),
        message: message.trim(),
        privacy_accepted: privacyAccepted,
        source_page: sourcePage,
        website: honeypot,
      });

      setSubmittedId(result.data?.id ?? 'REGISTRADO');
      setFullName('');
      setEmail('');
      setOrganization('');
      setSubject('');
      setMessage('');
      setPrivacyAccepted(false);
      setErrors({});
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      if (apiErr.fieldErrors) {
        const mapped: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(apiErr.fieldErrors)) {
          if (Array.isArray(msgs) && msgs[0]) {
            mapped[key] = msgs[0];
          }
        }
        setErrors(mapped);
      }
      setServerError(
        apiErr.message ||
          'No fue posible enviar la solicitud. Verifique su conexión e inténtelo nuevamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-8"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-brand-accent-dark" aria-hidden="true" />
          <div>
            <h3 className="font-display text-xl font-bold text-brand-graphite">
              Solicitud registrada correctamente
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-brand-slate">
              Gracias por comunicarse con ExpertEdu Solutions S.R.L. Su consulta ha sido almacenada
              y derivada al equipo correspondiente.
            </p>
            <p className="mt-3 text-xs font-mono text-brand-muted">
              Referencia de registro: {submittedId}
            </p>
            <button
              type="button"
              onClick={() => setSubmittedId(null)}
              className="mt-5 inline-flex items-center rounded-lg border border-brand-border bg-white px-4 py-2 text-xs font-semibold text-brand-graphite hover:bg-slate-50"
            >
              Enviar otra consulta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Honeypot anti-spam */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-website">Sitio web</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contact-full-name"
            className="block text-sm font-medium text-brand-graphite"
          >
            Nombre completo <span className="text-rose-600">*</span>
          </label>
          <input
            id="contact-full-name"
            name="full_name"
            type="text"
            required
            maxLength={120}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-invalid={Boolean(errors.full_name)}
            aria-describedby={errors.full_name ? 'err-full-name' : undefined}
            className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
            placeholder="Ej. Ing. María Fernández"
          />
          {errors.full_name && (
            <p id="err-full-name" className="mt-1 text-xs text-rose-600">
              {errors.full_name}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="block text-sm font-medium text-brand-graphite"
          >
            Correo electrónico <span className="text-rose-600">*</span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={180}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'err-email' : undefined}
            className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
            placeholder="nombre@institucion.edu.bo"
          />
          {errors.email && (
            <p id="err-email" className="mt-1 text-xs text-rose-600">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contact-organization"
            className="block text-sm font-medium text-brand-graphite"
          >
            Organización o institución
          </label>
          <input
            id="contact-organization"
            name="organization"
            type="text"
            maxLength={160}
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
            placeholder="Universidad, facultad o empresa"
          />
        </div>

        <div>
          <label
            htmlFor="contact-inquiry-type"
            className="block text-sm font-medium text-brand-graphite"
          >
            Tipo de consulta <span className="text-rose-600">*</span>
          </label>
          <select
            id="contact-inquiry-type"
            name="inquiry_type"
            value={inquiryType}
            onChange={(e) => setInquiryType(e.target.value as InquiryType)}
            className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite focus:border-brand-primary focus:outline-none"
          >
            {INQUIRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className="block text-sm font-medium text-brand-graphite">
          Asunto <span className="text-rose-600">*</span>
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          required
          maxLength={180}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={errors.subject ? 'err-subject' : undefined}
          className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
          placeholder="Ej. Demostración de ExpertEdu Studio para cátedra de IA"
        />
        {errors.subject && (
          <p id="err-subject" className="mt-1 text-xs text-rose-600">
            {errors.subject}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-brand-graphite">
          Mensaje <span className="text-rose-600">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          maxLength={3000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'err-message' : undefined}
          className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
          placeholder="Cuéntenos sobre sus necesidades académicas, cantidad estimada de docentes o estudiantes, o el proyecto que desea evaluar."
        />
        {errors.message && (
          <p id="err-message" className="mt-1 text-xs text-rose-600">
            {errors.message}
          </p>
        )}
      </div>

      <div>
        <label className="flex items-start gap-2.5 text-sm text-brand-slate">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => setPrivacyAccepted(e.target.checked)}
            aria-invalid={Boolean(errors.privacy_accepted)}
            className="mt-1 h-4 w-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary"
          />
          <span>
            He leído y acepto la{' '}
            <a
              href="/privacidad"
              className="font-medium text-brand-primary underline underline-offset-2"
            >
              Política de Privacidad
            </a>{' '}
            para el tratamiento de mi solicitud.
          </span>
        </label>
        {errors.privacy_accepted && (
          <p className="mt-1 text-xs text-rose-600">{errors.privacy_accepted}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Enviando solicitud...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Enviar solicitud
          </>
        )}
      </button>
    </form>
  );
};
