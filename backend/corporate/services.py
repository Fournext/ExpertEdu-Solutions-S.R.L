"""Notification and privacy-preserving utility services."""

import csv
import hashlib
import io
import json
import logging
import os
import re
import urllib.error
import urllib.request
from html.parser import HTMLParser

from django.conf import settings
from django.core.mail import send_mail
from django.utils.html import escape

from .models import (
    ChatbotKnowledgeEntry,
    ContactInquiry,
    CustomerProductMembership,
    SupportTicket,
)

logger = logging.getLogger(__name__)


def hash_client_ip(request) -> str:
    """Hash client IP for privacy-respecting audit/anti-abuse checks."""
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    raw_ip = (
        forwarded_for.split(",")[0].strip()
        if forwarded_for
        else request.META.get("REMOTE_ADDR", "")
    )
    if not raw_ip:
        return ""
    return hashlib.sha256(
        f"{raw_ip}:{settings.SECRET_KEY[:16]}".encode("utf-8")
    ).hexdigest()


def send_contact_notification(inquiry: ContactInquiry) -> bool:
    """Send an internal email notification when SMTP/console backend is active."""
    recipient = settings.CONTACT_NOTIFICATION_EMAIL
    if not recipient:
        return False

    subject = (
        f"[ExpertEdu Web] {inquiry.get_inquiry_type_display()}: {inquiry.subject}"
    )
    body = (
        f"Nueva consulta recibida desde {inquiry.source_page}\n\n"
        f"Nombre: {inquiry.full_name}\n"
        f"Correo: {inquiry.email}\n"
        f"Organización: {inquiry.organization or 'No especificada'}\n"
        f"Tipo: {inquiry.get_inquiry_type_display()}\n"
        f"Asunto: {inquiry.subject}\n\n"
        f"Mensaje:\n{inquiry.message}\n"
    )
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception(
            "Failed to send contact notification for inquiry %s", inquiry.id
        )
        return False


def send_support_notification(ticket: SupportTicket) -> bool:
    """Send an internal email notification for a newly registered support ticket."""
    recipient = settings.SUPPORT_NOTIFICATION_EMAIL
    if not recipient:
        return False

    subject = (
        f"[ExpertEdu Soporte] {ticket.reference_code} "
        f"[{ticket.get_severity_display()}] {ticket.subject}"
    )
    body = (
        f"Nuevo ticket de soporte registrado\n\n"
        f"Referencia: {ticket.reference_code}\n"
        f"Nivel asignado: {ticket.get_support_level_display()}\n"
        f"Categoría: {ticket.get_category_display()}\n"
        f"Severidad: {ticket.get_severity_display()}\n"
        f"Solicitante: {ticket.full_name} ({ticket.email})\n"
        f"Organización: {ticket.organization or 'No especificada'}\n\n"
        f"Descripción:\n{ticket.description}\n"
    )
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception(
            "Failed to send support notification for ticket %s",
            ticket.reference_code,
        )
        return False


def send_verification_code_email(email: str, code: str) -> bool:
    """Send a temporary 6-digit verification code to a registering customer."""
    minutes = getattr(settings, "OTP_EXPIRY_MINUTES", 10)
    subject = "[ExpertEdu] Código temporal de verificación de correo"
    body = (
        f"Hola,\n\n"
        f"Tu código temporal de verificación para registrarte en ExpertEdu es:\n\n"
        f"    {code}\n\n"
        f"Este código expira en {minutes} minutos. "
        f"Si no solicitaste este registro, puedes ignorar este correo.\n"
    )
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("Failed to send OTP verification code to %s", email)
        return False


def send_password_reset_code_email(email: str, code: str) -> bool:
    """Send a temporary 6-digit password reset code to an existing customer."""
    minutes = getattr(settings, "OTP_EXPIRY_MINUTES", 10)
    subject = "[ExpertEdu] Código para restablecer tu contraseña"
    body = (
        f"Hola,\n\n"
        f"Recibimos una solicitud para restablecer la contraseña de tu cuenta en ExpertEdu.\n"
        f"Tu código temporal de recuperación es:\n\n"
        f"    {code}\n\n"
        f"Este código expira en {minutes} minutos. "
        f"Si no solicitaste este cambio, ignora este correo.\n"
    )
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("Failed to send password reset code to %s", email)
        return False


def _build_corporate_email_html(
    title: str,
    subtitle: str,
    sections_html: str,
    cta_label: str | None = None,
    cta_url: str | None = None,
) -> str:
    """Builds a clean, responsive HTML email template for ExpertEdu Solutions S.R.L."""
    cta_block = ""
    if cta_label and cta_url:
        cta_block = (
            f'<div style="margin-top:24px;text-align:center;">'
            f'<a href="{escape(cta_url)}" style="display:inline-block;background:#1E40AF;'
            f'color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;'
            f'padding:12px 24px;border-radius:8px;">{escape(cta_label)}</a>'
            f"</div>"
        )

    return (
        '<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;'
        'background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">'
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        'style="padding:24px 12px;"><tr><td align="center">'
        '<table role="presentation" width="600" cellspacing="0" cellpadding="0" '
        'style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;'
        'overflow:hidden;border:1px solid #E2E8F0;">'
        '<tr><td style="background:#1E40AF;padding:24px 28px;color:#FFFFFF;">'
        '<p style="margin:0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;'
        'color:#BFDBFE;font-weight:700;">ExpertEdu Solutions S.R.L.</p>'
        f'<h1 style="margin:6px 0 0;font-size:20px;line-height:1.3;">{escape(title)}</h1>'
        f'<p style="margin:6px 0 0;font-size:13px;color:#DBEAFE;">{escape(subtitle)}</p>'
        '</td></tr>'
        f'<tr><td style="padding:28px;font-size:14px;line-height:1.6;color:#334155;">'
        f"{sections_html}{cta_block}"
        '</td></tr>'
        '<tr><td style="background:#F8FAFC;padding:16px 28px;border-top:1px solid #E2E8F0;'
        'font-size:12px;color:#64748B;">'
        'ExpertEdu Solutions S.R.L. · Santa Cruz de la Sierra, Bolivia<br/>'
        f'Comercial: {escape(settings.CONTACT_NOTIFICATION_EMAIL)} · '
        f'Soporte: {escape(settings.SUPPORT_NOTIFICATION_EMAIL)}'
        '</td></tr></table></td></tr></table></body></html>'
    )


def send_registration_emails(user) -> dict[str, bool]:
    """
    Sends 3 presentable HTML + plain-text emails upon registration:
    1) Welcome message, 2) Accepted Terms & Conditions, 3) Accepted Privacy Policy.
    """
    profile = getattr(user, "customer_profile", None)
    full_name = profile.full_name if profile else user.username
    site_url = getattr(settings, "PUBLIC_SITE_URL", "https://expertedu.bo").rstrip("/")
    accepted_dt = (
        profile.terms_accepted_at.strftime("%Y-%m-%d %H:%M UTC")
        if profile and profile.terms_accepted_at
        else "Registrado"
    )

    # 1. Mensaje de bienvenida
    welcome_text = (
        f"Hola {full_name},\n\n"
        f"¡Bienvenido/a a ExpertEdu Solutions S.R.L.! Tu cuenta (@{user.username}) "
        f"fue creada y verificada correctamente.\n\n"
        f"Desde tu panel de cliente ({site_url}/mi-cuenta) puedes activar ExpertEdu Studio "
        f"como Docente o Estudiante, consultar tu plan activo y acceder con tu misma sesión.\n"
    )
    welcome_html = _build_corporate_email_html(
        title="¡Bienvenido/a a ExpertEdu!",
        subtitle=f"Cuenta verificada para {full_name} (@{user.username})",
        sections_html=(
            f"<p>Hola <strong>{escape(full_name)}</strong>,</p>"
            "<p>Gracias por registrarte en el portal corporativo de "
            "<strong>ExpertEdu Solutions S.R.L.</strong> Tu correo electrónico ha sido "
            "verificado y tu cuenta ya se encuentra activa.</p>"
            '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;'
            'padding:14px 16px;margin:16px 0;">'
            '<p style="margin:0 0 6px;font-weight:700;color:#0F172A;">'
            "¿Qué puedes hacer ahora?</p>"
            '<ul style="margin:0;padding-left:18px;color:#475569;">'
            "<li>Activar <strong>ExpertEdu Studio</strong> eligiendo tu rol "
            "(Docente o Estudiante) y plan.</li>"
            "<li>Ingresar a la plataforma con la misma sesión y contraseña.</li>"
            "<li>Consultar en todo momento tus productos, planes y canales de soporte.</li>"
            "</ul></div>"
        ),
        cta_label="Ir a Mi cuenta",
        cta_url=f"{site_url}/mi-cuenta",
    )

    # 2. Términos y Condiciones aceptados
    terms_items = [
        (
            "1. Objeto y alcance",
            "Regula el uso del sitio corporativo de ExpertEdu Solutions S.R.L. y los "
            "lineamientos académicos de ExpertEdu Studio.",
        ),
        (
            "2. Finalidad pedagógica",
            "ExpertEdu Studio es un recurso de apoyo educativo para Sistemas Expertos; "
            "no sustituye la orientación ni evaluación docente.",
        ),
        (
            "3. Responsabilidades del docente",
            "El docente supervisa contenidos, configura actividades, valida coherencia "
            "de bases de conocimiento y asigna calificaciones.",
        ),
        (
            "4. Uso de inteligencia artificial",
            "Las sugerencias generadas por IA pueden presentar errores o imprecisiones "
            "y requieren revisión y validación humana.",
        ),
        (
            "5. Resultados del motor de inferencia",
            "La validez de las conclusiones depende de la correcta formulación de "
            "reglas e integridad de los hechos iniciales.",
        ),
        (
            "6. Uso responsable e integridad",
            "Se prohíbe la manipulación de evaluaciones, suplantación de identidad y "
            "acciones contra la seguridad del servicio.",
        ),
        (
            "7. Propiedad intelectual",
            "La marca y plataforma pertenecen a ExpertEdu Solutions S.R.L.; las bases "
            "académicas conservan la titularidad de sus autores.",
        ),
        (
            "8. Privacidad y datos académicos",
            "El tratamiento de datos se rige por la Política de Privacidad vigente.",
        ),
        (
            "9. Contacto",
            f"Comercial: {settings.CONTACT_NOTIFICATION_EMAIL} · "
            f"Soporte: {settings.SUPPORT_NOTIFICATION_EMAIL}.",
        ),
    ]
    terms_text = (
        f"Constancia de aceptación de Términos y Condiciones\n"
        f"Titular: {full_name} ({user.email}) · Fecha: {accepted_dt}\n\n"
        + "\n".join(f"- {t}: {d}" for t, d in terms_items)
        + f"\n\nDocumento completo: {site_url}/terminos\n"
    )
    terms_rows = "".join(
        f'<li style="margin-bottom:8px;"><strong>{escape(t)}:</strong> {escape(d)}</li>'
        for t, d in terms_items
    )
    terms_html = _build_corporate_email_html(
        title="Términos y Condiciones aceptados",
        subtitle=f"Constancia de aceptación · {accepted_dt}",
        sections_html=(
            f"<p>Hola <strong>{escape(full_name)}</strong>, adjuntamos el resumen de los "
            "<strong>Términos y Condiciones de Uso</strong> aceptados al crear tu cuenta:</p>"
            f'<ul style="padding-left:18px;margin:14px 0;">{terms_rows}</ul>'
        ),
        cta_label="Ver Términos y Condiciones completos",
        cta_url=f"{site_url}/terminos",
    )

    # 3. Política de Privacidad aceptada
    privacy_items = [
        (
            "1. Responsable del tratamiento",
            "ExpertEdu Solutions S.R.L. (Santa Cruz de la Sierra, Bolivia).",
        ),
        (
            "2. Datos recopilados",
            "Nombre, correo, institución y mensajes enviados voluntariamente; cuentas "
            "académicas aisladas en ExpertEdu Studio.",
        ),
        (
            "3. Finalidades y destinatarios",
            "Atender consultas, gestionar soporte, operar herramientas autorizadas y "
            "prevenir abuso. No vendemos datos a terceros.",
        ),
        (
            "4. Servicios externos de IA",
            "El envío se limita al contexto técnico necesario para la asistencia "
            "solicitada; se recomienda evitar datos sensibles.",
        ),
        (
            "5. Conservación",
            "Los datos se conservan únicamente durante el tiempo necesario para la "
            "finalidad autorizada o exigencia legal.",
        ),
        (
            "6. Medidas de seguridad técnica",
            "Validación de entradas, cifrado HTTPS/TLS, aislamiento de bases de datos, "
            "rate limiting y hash SHA-256 de IP.",
        ),
        (
            "7. Derechos y contacto",
            "Puedes solicitar acceso, rectificación o eliminación escribiendo a "
            f"{settings.CONTACT_NOTIFICATION_EMAIL}.",
        ),
    ]
    privacy_text = (
        f"Constancia de aceptación de Política de Privacidad\n"
        f"Titular: {full_name} ({user.email}) · Fecha: {accepted_dt}\n\n"
        + "\n".join(f"- {t}: {d}" for t, d in privacy_items)
        + f"\n\nDocumento completo: {site_url}/privacidad\n"
    )
    privacy_rows = "".join(
        f'<li style="margin-bottom:8px;"><strong>{escape(t)}:</strong> {escape(d)}</li>'
        for t, d in privacy_items
    )
    privacy_html = _build_corporate_email_html(
        title="Política de Privacidad aceptada",
        subtitle=f"Constancia de aceptación · {accepted_dt}",
        sections_html=(
            f"<p>Hola <strong>{escape(full_name)}</strong>, adjuntamos el resumen de la "
            "<strong>Política de Privacidad</strong> aceptada al registrar tu cuenta:</p>"
            f'<ul style="padding-left:18px;margin:14px 0;">{privacy_rows}</ul>'
        ),
        cta_label="Ver Política de Privacidad completa",
        cta_url=f"{site_url}/privacidad",
    )

    results = {}
    dispatches = [
        (
            "welcome",
            "[ExpertEdu] ¡Bienvenido/a a ExpertEdu Solutions S.R.L.!",
            welcome_text,
            welcome_html,
        ),
        (
            "terms",
            "[ExpertEdu] Constancia de Términos y Condiciones aceptados",
            terms_text,
            terms_html,
        ),
        (
            "privacy",
            "[ExpertEdu] Constancia de Política de Privacidad aceptada",
            privacy_text,
            privacy_html,
        ),
    ]
    for key, subject, text_body, html_body in dispatches:
        try:
            send_mail(
                subject=subject,
                message=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_body,
                fail_silently=False,
            )
            results[key] = True
        except Exception:
            logger.exception("Failed to send %s email to %s", key, user.email)
            results[key] = False
    return results


DEFAULT_CORPORATE_CONTEXT = (
    "EMPRESA: ExpertEdu Solutions S.R.L. (marca comercial: ExpertEdu).\n"
    "Sector: Tecnología Educativa (EdTech) y desarrollo de software, "
    "ubicada en Santa Cruz de la Sierra, Bolivia.\n"
    "Misión: Desarrollar soluciones tecnológicas innovadoras que contribuyan a "
    "optimizar los procesos de enseñanza y aprendizaje.\n"
    "Visión: Consolidarse como empresa tecnológica de referencia en Bolivia y "
    "Latinoamérica en soluciones educativas innovadoras.\n"
    "Canales oficiales: contacto@expertedu.bo (comercial/demos) y "
    "soporte@expertedu.bo (soporte técnico).\n\n"
    "PRODUCTO PRINCIPAL: ExpertEdu Studio.\n"
    "Descripción: Plataforma educativa interactiva de apoyo docente para la "
    "enseñanza de Sistemas Expertos.\n"
    "Capacidades: bases de conocimiento, editor visual interactivo, hechos y "
    "reglas, motor de inferencia Forward Chaining paso a paso, validación de "
    "bases de conocimiento, actividades educativas y asistencia con IA.\n"
    "Planes referenciales: Plan Estudiante, Plan Docente Individual y "
    "Licencia Institucional.\n"
    "Acceso: Registro en la web corporativa con elección de rol (Docente o "
    "Estudiante) y plan, compartiendo sesión con ExpertEdu Studio."
)


def ask_corporate_chatbot(question: str, history: list[dict] | None = None) -> dict:
    """
    Answers public questions about ExpertEdu and ExpertEdu Studio using Gemini API,
    grounded with all active ChatbotKnowledgeEntry items loaded by Superadmin.
    """
    active_entries = list(ChatbotKnowledgeEntry.objects.filter(is_active=True))
    q_words = {
        w for w in re.findall(r"[a-zA-ZáéíóúñÁÉÍÓÚÑ0-9]{3,}", question.lower())
    }
    scored_entries: list[tuple[int, ChatbotKnowledgeEntry]] = []
    for entry in active_entries:
        title_l = entry.title.lower()
        content_l = entry.content.lower()
        score = sum(
            (3 if w in title_l else 0) + (1 if w in content_l else 0)
            for w in q_words
        )
        scored_entries.append((score, entry))

    scored_entries.sort(key=lambda pair: (pair[0], pair[1].updated_at), reverse=True)

    selected_entries: list[ChatbotKnowledgeEntry] = []
    char_budget = 45000
    used_chars = 0
    for _, entry in scored_entries:
        if len(selected_entries) >= 12 or used_chars >= char_budget:
            break
        selected_entries.append(entry)
        used_chars += len(entry.content)

    extra_blocks = [
        f"### [{entry.get_category_display()}] {entry.title}\n{entry.content}"
        for entry in selected_entries
    ]
    knowledge_text = DEFAULT_CORPORATE_CONTEXT
    if extra_blocks:
        knowledge_text += "\n\nINFORMACIÓN ADICIONAL CARGADA POR ADMINISTRACIÓN:\n" + "\n\n".join(
            extra_blocks
        )

    api_key = getattr(settings, "GEMINI_API_KEY", "")
    model_name = getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash")

    if api_key:
        system_prompt = (
            "Eres el asistente virtual oficial de ExpertEdu Solutions S.R.L. "
            "Responde en español, de forma clara, profesional y concisa. "
            "Responde únicamente sobre la empresa ExpertEdu, sus servicios, planes "
            "y su producto ExpertEdu Studio utilizando exclusivamente la BASE DE "
            "CONOCIMIENTO proporcionada. "
            "REGLA ESTRICTA: Si la información solicitada no aparece en la BASE DE "
            "CONOCIMIENTO, NO inventes, supongas ni completes datos (ni precios, "
            "teléfonos, direcciones exactas, certificaciones o plazos). Indica "
            "claramente que no dispones de esa información y sugiere escribir a "
            "contacto@expertedu.bo o usar /contacto.\n\n"
            f"BASE DE CONOCIMIENTO:\n{knowledge_text}"
        )
        contents = []
        for msg in (history or [])[-6:]:
            role = "user" if msg.get("role") == "user" else "model"
            text = str(msg.get("text", "")).strip()
            if text:
                contents.append({"role": role, "parts": [{"text": text[:800]}]})
        contents.append({"role": "user", "parts": [{"text": question}]})

        payload = json.dumps(
            {
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 600,
                },
            }
        ).encode("utf-8")

        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent?key={api_key}"
        )
        req = urllib.request.Request(
            endpoint,
            data=payload,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                parsed = json.loads(resp.read().decode("utf-8"))
            candidates = parsed.get("candidates") or []
            if candidates:
                parts = candidates[0].get("content", {}).get("parts") or []
                answer_text = "".join(p.get("text", "") for p in parts).strip()
                if answer_text:
                    return {
                        "answer": answer_text,
                        "provider": "gemini",
                        "sources_count": len(active_entries),
                    }
        except Exception:
            logger.exception("Gemini API call failed; using knowledge base fallback.")

    # Fallback local si no hay GEMINI_API_KEY o si Gemini no respondió
    q_words = {w for w in question.lower().split() if len(w) >= 3}
    best_entry = None
    best_score = 0
    for entry in active_entries:
        haystack = f"{entry.title} {entry.content}".lower()
        score = sum(1 for w in q_words if w in haystack)
        if score > best_score:
            best_score = score
            best_entry = entry

    if best_entry:
        fallback_answer = (
            f"Sobre **{best_entry.title}**: {best_entry.content}\n\n"
            "Si necesitas atención personalizada, contáctanos en contacto@expertedu.bo "
            "o desde la sección /contacto."
        )
    else:
        fallback_answer = (
            "ExpertEdu Solutions S.R.L. desarrolla soluciones tecnológicas educativas, "
            "siendo su producto principal ExpertEdu Studio (plataforma interactiva para "
            "enseñanza de Sistemas Expertos con editor visual, motor Forward Chaining y "
            "validación de bases de conocimiento). Puedes registrarte, elegir tu rol "
            "(Docente o Estudiante) o escribirnos a contacto@expertedu.bo."
        )

    return {
        "answer": fallback_answer,
        "provider": "knowledge_base",
        "sources_count": len(active_entries),
    }


class _HTMLTextExtractor(HTMLParser):
    """Extracts readable text from HTML files without keeping tags."""

    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self._skip = True
        elif tag in ("h1", "h2", "h3"):
            self._parts.append("\n## ")
        elif tag in ("p", "div", "br", "li", "tr"):
            self._parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self._skip = False

    def handle_data(self, data):
        if not self._skip and data.strip():
            self._parts.append(data.strip() + " ")

    def get_markdown(self) -> str:
        raw = "".join(self._parts)
        return re.sub(r"\n{3,}", "\n\n", raw).strip()


ALLOWED_DOC_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".csv", ".html", ".htm", ".json"}
MAX_DOC_SIZE_BYTES = 5 * 1024 * 1024


def convert_uploaded_document_to_markdown(uploaded_file) -> str:
    """
    Internally converts an uploaded document (.pdf, .docx, .txt, .md, .csv, .html, .json)
    into clean Markdown text without forwarding raw binary files to Gemini.
    """
    filename = getattr(uploaded_file, "name", "") or "documento.txt"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_DOC_EXTENSIONS:
        raise ValueError(
            "Formato no soportado. Usa .pdf, .docx, .md, .txt, .csv, .html o .json."
        )

    size = getattr(uploaded_file, "size", 0) or 0
    if size > MAX_DOC_SIZE_BYTES:
        raise ValueError("El archivo supera el tamaño máximo permitido de 5 MB.")

    raw_bytes = uploaded_file.read()
    if not raw_bytes:
        raise ValueError("El documento está vacío.")

    markdown_text = ""

    if ext in {".md", ".txt"}:
        markdown_text = raw_bytes.decode("utf-8", errors="replace").strip()
    elif ext == ".json":
        text = raw_bytes.decode("utf-8", errors="replace").strip()
        try:
            parsed = json.loads(text)
            pretty = json.dumps(parsed, ensure_ascii=False, indent=2)
            markdown_text = f"```json\n{pretty}\n```"
        except Exception:
            markdown_text = text
    elif ext == ".csv":
        text = raw_bytes.decode("utf-8", errors="replace")
        rows = list(csv.reader(io.StringIO(text)))
        if rows:
            header = rows[0]
            lines = [
                "| " + " | ".join(cell.strip() for cell in header) + " |",
                "| " + " | ".join("---" for _ in header) + " |",
            ]
            for row in rows[1:200]:
                padded = row + [""] * max(0, len(header) - len(row))
                lines.append("| " + " | ".join(c.strip() for c in padded[:len(header)]) + " |")
            markdown_text = "\n".join(lines)
    elif ext in {".html", ".htm"}:
        extractor = _HTMLTextExtractor()
        extractor.feed(raw_bytes.decode("utf-8", errors="replace"))
        markdown_text = extractor.get_markdown()
    elif ext == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(raw_bytes))
        pages_md = []
        for idx, page in enumerate(reader.pages, start=1):
            page_text = (page.extract_text() or "").strip()
            if page_text:
                pages_md.append(f"## Página {idx}\n\n{page_text}")
        markdown_text = "\n\n".join(pages_md).strip()
    elif ext == ".docx":
        from docx import Document

        doc = Document(io.BytesIO(raw_bytes))
        blocks: list[str] = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            style_name = (para.style.name or "").lower() if para.style else ""
            if "heading 1" in style_name or "título 1" in style_name:
                blocks.append(f"# {text}")
            elif "heading 2" in style_name or "título 2" in style_name:
                blocks.append(f"## {text}")
            elif "heading 3" in style_name or "título 3" in style_name:
                blocks.append(f"### {text}")
            else:
                blocks.append(text)
        for table in doc.tables:
            table_rows = [
                [cell.text.strip().replace("\n", " ") for cell in row.cells]
                for row in table.rows
            ]
            if table_rows and table_rows[0]:
                blocks.append("| " + " | ".join(table_rows[0]) + " |")
                blocks.append("| " + " | ".join("---" for _ in table_rows[0]) + " |")
                for row in table_rows[1:]:
                    blocks.append("| " + " | ".join(row) + " |")
        markdown_text = "\n\n".join(blocks).strip()

    markdown_text = re.sub(r"\n{3,}", "\n\n", markdown_text).strip()
    if len(markdown_text) < 10:
        raise ValueError(
            "No se pudo extraer texto legible suficiente del documento para convertirlo a Markdown."
        )
    return markdown_text


def split_markdown_into_chunks(
    markdown_text: str,
    max_chars: int = 12000,
    overlap: int = 300,
) -> list[str]:
    """
    Splits large Markdown documents into searchable parts on paragraph boundaries
    so no content is lost and Gemini can retrieve the most relevant sections.
    """
    text = markdown_text.strip()
    if len(text) <= max_chars:
        return [text]

    paragraphs = text.split("\n\n")
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if len(para) > max_chars:
            if current:
                chunks.append(current.strip())
                current = ""
            start = 0
            step = max(1, max_chars - overlap)
            while start < len(para):
                chunks.append(para[start:start + max_chars].strip())
                start += step
            continue

        candidate = f"{current}\n\n{para}".strip() if current else para
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current.strip())
            current = para

    if current:
        chunks.append(current.strip())

    return chunks or [text[:max_chars]]


def provision_user_in_studio(user, role_code: str) -> dict:
    """
    Call ExpertEdu Studio internal provisioning API to create/sync the user
    with the selected role (Docente or Estudiante) and return SSO tokens.
    """
    studio_role = (
        "Docente"
        if role_code == CustomerProductMembership.StudioRole.DOCENTE
        else "Estudiante"
    )
    profile = getattr(user, "customer_profile", None)
    full_name = profile.full_name if profile else (user.get_full_name() or user.username)

    payload = json.dumps(
        {
            "username": user.username,
            "email": user.email,
            "nombre_completo": full_name,
            "rol": studio_role,
            "password_hash": user.password,
        }
    ).encode("utf-8")

    endpoint = f"{settings.STUDIO_API_BASE_URL}/auth/registro-corporativo/"
    req = urllib.request.Request(
        endpoint,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Studio-Service-Key": settings.STUDIO_SERVICE_KEY,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            parsed = json.loads(raw)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        logger.error("Studio provisioning HTTP %s: %s", exc.code, detail)
        raise RuntimeError(
            "ExpertEdu Studio rechazó el aprovisionamiento de usuario."
        ) from exc
    except Exception as exc:
        logger.exception("Failed connecting to ExpertEdu Studio at %s", endpoint)
        raise RuntimeError(
            "No fue posible comunicarse con ExpertEdu Studio en este momento."
        ) from exc

    data = parsed.get("data", parsed)
    access = data.get("access")
    refresh = data.get("refresh")
    studio_user = data.get("user", {})
    if not access or not refresh:
        raise RuntimeError("ExpertEdu Studio no devolvió tokens de sesión válidos.")

    sso_url = (
        f"{settings.STUDIO_PUBLIC_URL}/sso-callback"
        f"#access={access}&refresh={refresh}"
    )
    return {
        "studio_user": studio_user,
        "sso_url": sso_url,
    }
