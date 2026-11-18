import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Send,
  UserPlus,
} from 'lucide-react';
import {
  confirmPasswordReset,
  loginCustomer,
  registerCustomer,
  saveStoredSession,
  sendPasswordResetCode,
  sendVerificationCode,
  verifyEmailCode,
  type ApiErrorResult,
} from '@/services/api';

export const LoginForm: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Ingresa tu usuario o correo electrónico y tu contraseña.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await loginCustomer(identifier.trim(), password);
      saveStoredSession(res.data);
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      if (next && next.startsWith('/') && !next.startsWith('//')) {
        window.location.assign(next);
        return;
      }
      window.location.assign(res.data.user.is_superadmin ? '/superadmin' : '/mi-cuenta');
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setError(apiErr.message || 'Credenciales inválidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="login-identifier" className="block text-sm font-medium text-brand-graphite">
          Usuario o correo electrónico
        </label>
        <input
          id="login-identifier"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite focus:border-brand-primary focus:outline-none"
          placeholder="usuario o correo@institucion.edu.bo"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-brand-graphite">
          Contraseña
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite focus:border-brand-primary focus:outline-none"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
      >
        {loading ? 'Ingresando...' : 'Iniciar sesión'}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-slate">
        <a href="/recuperar-contrasena" className="font-semibold text-brand-primary hover:underline">
          ¿Olvidaste tu contraseña?
        </a>
        <span>
          ¿Sin cuenta?{' '}
          <a href="/registro" className="font-semibold text-brand-primary hover:underline">
            Regístrate aquí
          </a>
        </span>
      </div>
    </form>
  );
};

export const RegisterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'send' | 'verify' | 'register' | null>(null);

  const isEmailVerified = Boolean(verificationToken);

  const handleSendCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Ingresa un correo electrónico válido antes de solicitar el código.');
      return;
    }
    setError('');
    setStatusMessage('');
    setBusy('send');
    try {
      const res = await sendVerificationCode(cleanEmail);
      setCodeSent(true);
      setVerificationToken(null);
      setStatusMessage(res.message);
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setError(apiErr.message || 'No se pudo enviar el código temporal.');
    } finally {
      setBusy(null);
    }
  };

  const handleVerifyCode = async () => {
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('El código temporal debe tener exactamente 6 dígitos numéricos.');
      return;
    }
    setError('');
    setStatusMessage('');
    setBusy('verify');
    try {
      const res = await verifyEmailCode(email.trim().toLowerCase(), otpCode.trim());
      setVerificationToken(res.data.verification_token);
      setStatusMessage(res.message);
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setError(apiErr.message || 'Código inválido o expirado.');
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationToken) {
      setError('Debes verificar tu correo con el código temporal antes de continuar.');
      return;
    }
    if (username.trim().length < 4) {
      setError('El usuario debe tener al menos 4 caracteres.');
      return;
    }
    if (fullName.trim().length < 3) {
      setError('Ingresa tu nombre completo.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!privacyAccepted || !termsAccepted) {
      setError(
        'Debes marcar obligatoriamente la Política de Privacidad y los Términos y Condiciones.',
      );
      return;
    }

    setError('');
    setBusy('register');
    try {
      const res = await registerCustomer({
        email: email.trim().toLowerCase(),
        verification_token: verificationToken,
        username: username.trim(),
        full_name: fullName.trim(),
        organization: organization.trim(),
        password,
        confirm_password: confirmPassword,
        privacy_accepted: privacyAccepted,
        terms_accepted: termsAccepted,
      });
      saveStoredSession(res.data);
      window.location.assign('/mi-cuenta?producto=expertedu-studio');
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setError(apiErr.message || 'No se pudo completar el registro.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {statusMessage && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-emerald" aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Paso 1 y 2: Verificación de correo con OTP */}
      <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-primary">
          <Mail className="h-4 w-4" aria-hidden="true" />
          Paso 1: Verificación de correo electrónico
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="reg-email" className="block text-sm font-medium text-brand-graphite">
              Correo electrónico <span className="text-rose-600">*</span>
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              disabled={isEmailVerified}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@universidad.edu.bo"
              className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite disabled:bg-slate-100"
            />
          </div>
          {!isEmailVerified && (
            <button
              type="button"
              onClick={handleSendCode}
              disabled={busy === 'send'}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-graphite px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {busy === 'send'
                ? 'Enviando...'
                : codeSent
                  ? 'Reenviar código'
                  : 'Enviar código'}
            </button>
          )}
        </div>

        {codeSent && !isEmailVerified && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end border-t border-brand-border pt-4">
            <div className="flex-1">
              <label htmlFor="reg-otp" className="block text-sm font-medium text-brand-graphite">
                Código temporal (6 dígitos)
              </label>
              <input
                id="reg-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Ej. 482910"
                className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm font-mono tracking-widest text-brand-graphite"
              />
            </div>
            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={busy === 'verify'}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {busy === 'verify' ? 'Verificando...' : 'Verificar código'}
            </button>
          </div>
        )}
      </div>

      {/* Paso 3: Credenciales (bloqueadas hasta validar el código) */}
      <fieldset disabled={!isEmailVerified} className="space-y-4 disabled:opacity-60">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-slate">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Paso 2: Usuario, contraseña y aceptación legal
          </span>
          {!isEmailVerified && (
            <span className="text-xs font-medium text-amber-700">
              Verifica el código temporal para desbloquear estos campos
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-username" className="block text-sm font-medium text-brand-graphite">
              Nombre de usuario <span className="text-rose-600">*</span>
            </label>
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej. maria.rojas"
              className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div>
            <label htmlFor="reg-fullname" className="block text-sm font-medium text-brand-graphite">
              Nombre completo <span className="text-rose-600">*</span>
            </label>
            <input
              id="reg-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. María Fernanda Rojas"
              className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg-org" className="block text-sm font-medium text-brand-graphite">
            Institución u organización
          </label>
          <input
            id="reg-org"
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="Universidad, facultad o empresa (opcional)"
            className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-brand-graphite">
              Contraseña (mín. 8 caracteres) <span className="text-rose-600">*</span>
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="reg-confirm-password"
              className="block text-sm font-medium text-brand-graphite"
            >
              Confirmar contraseña <span className="text-rose-600">*</span>
            </label>
            <input
              id="reg-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>
        </div>

        {/* 2 Checkboxes obligatorios */}
        <div className="space-y-3 rounded-xl border border-brand-border bg-white p-4">
          <label className="flex items-start gap-3 text-sm text-brand-slate cursor-pointer">
            <input
              id="reg-privacy"
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-brand-border text-brand-primary"
            />
            <span>
              He leído y acepto la{' '}
              <a
                href="/privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-primary underline"
              >
                Política de Privacidad
              </a>{' '}
              <span className="text-rose-600">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-brand-slate cursor-pointer">
            <input
              id="reg-terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-brand-border text-brand-primary"
            />
            <span>
              He leído y acepto los{' '}
              <a
                href="/terminos"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-primary underline"
              >
                Términos y Condiciones de Uso
              </a>{' '}
              <span className="text-rose-600">*</span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={!isEmailVerified || !privacyAccepted || !termsAccepted || busy === 'register'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {busy === 'register' ? 'Creando cuenta...' : 'Crear cuenta en ExpertEdu'}
        </button>
      </fieldset>
    </form>
  );
};

export const PasswordResetForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState<'send' | 'confirm' | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSend = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setBusy('send');
    try {
      const res = await sendPasswordResetCode(clean);
      setCodeSent(true);
      setSuccessMsg(res.message);
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setError(apiErr.message || 'No se pudo enviar el código de recuperación.');
    } finally {
      setBusy(null);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Ingresa el código de 6 dígitos enviado a tu correo.');
      return;
    }
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setBusy('confirm');
    try {
      const res = await confirmPasswordReset({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccessMsg(res.message);
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setError(apiErr.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <form onSubmit={handleConfirm} className="space-y-5" noValidate>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-emerald" aria-hidden="true" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="reset-email" className="block text-sm font-medium text-brand-graphite">
            Correo electrónico de tu cuenta
          </label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@institucion.edu.bo"
            className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite"
          />
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={busy === 'send'}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-graphite px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {busy === 'send' ? 'Enviando...' : codeSent ? 'Reenviar código' : 'Enviar código'}
        </button>
      </div>

      {codeSent && (
        <div className="space-y-4 border-t border-brand-border pt-4">
          <div>
            <label htmlFor="reset-code" className="block text-sm font-medium text-brand-graphite">
              Código temporal (6 dígitos)
            </label>
            <input
              id="reset-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej. 482910"
              className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm font-mono tracking-widest text-brand-graphite"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="reset-password"
                className="block text-sm font-medium text-brand-graphite"
              >
                Nueva contraseña (mín. 8 caracteres)
              </label>
              <input
                id="reset-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite"
              />
            </div>

            <div>
              <label
                htmlFor="reset-confirm"
                className="block text-sm font-medium text-brand-graphite"
              >
                Confirmar contraseña
              </label>
              <input
                id="reset-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 block w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-graphite"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy === 'confirm'}
            className="w-full rounded-lg bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-60"
          >
            {busy === 'confirm' ? 'Actualizando...' : 'Guardar nueva contraseña'}
          </button>
        </div>
      )}

      <p className="text-center text-xs text-brand-slate">
        <a href="/login" className="font-semibold text-brand-primary hover:underline">
          Volver a iniciar sesión
        </a>
      </p>
    </form>
  );
};
