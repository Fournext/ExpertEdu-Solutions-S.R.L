import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FaqAccordion } from '../components/interactive/FaqAccordion';
import { ForwardChainingDemo } from '../components/interactive/ForwardChainingDemo';
import { ResourcesExplorer, type ResourceSummary } from '../components/interactive/ResourcesExplorer';
import { ContactForm } from '../components/interactive/ContactForm';
import { SupportTicketForm } from '../components/interactive/SupportTicketForm';
import { StudioAccessButton } from '../components/ui/StudioAccessButton';
import { RegisterForm } from '../components/interactive/AuthForms';
import * as api from '../services/api';

describe('FaqAccordion', () => {
  it('toggles question answers on click and keeps aria-expanded accurate', () => {
    render(
      <FaqAccordion
        items={[
          { question: '¿Qué es ExpertEdu?', answer: 'Empresa EdTech boliviana.' },
          { question: '¿Qué es ExpertEdu Studio?', answer: 'Plataforma para Sistemas Expertos.' },
        ]}
      />,
    );

    const firstButton = screen.getByRole('button', { name: /¿Qué es ExpertEdu\?/i });
    expect(firstButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Empresa EdTech boliviana.')).toBeInTheDocument();

    const secondButton = screen.getByRole('button', { name: /¿Qué es ExpertEdu Studio\?/i });
    expect(secondButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(secondButton);
    expect(secondButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Plataforma para Sistemas Expertos.')).toBeInTheDocument();
  });
});

describe('ForwardChainingDemo', () => {
  it('marks itself as illustrative and advances reasoning steps', () => {
    render(<ForwardChainingDemo />);
    expect(screen.getByText(/ilustrativ/i)).toBeInTheDocument();
    expect(screen.getByText(/R1:/)).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: /siguiente paso/i });
    fireEvent.click(nextButton);
    expect(screen.getByText(/R2:/)).toBeInTheDocument();

    const resetButton = screen.getByRole('button', { name: /reiniciar/i });
    fireEvent.click(resetButton);
    expect(screen.getByText(/R1:/)).toBeInTheDocument();
  });
});

describe('ResourcesExplorer', () => {
  const sampleResources: ResourceSummary[] = [
    {
      slug: 'forward-chaining-explicado',
      title: 'Motor Forward Chaining explicado paso a paso',
      description: 'Fundamentos del encadenamiento hacia adelante.',
      category: 'Artículos',
      publishedAt: '2026-03-01',
      readingTime: '5 min',
    },
    {
      slug: 'validacion-bases-conocimiento',
      title: 'Validación de bases de conocimiento',
      description: 'Cómo evitar ciclos y contradicciones.',
      category: 'Guías',
      publishedAt: '2026-03-02',
      readingTime: '6 min',
    },
  ];

  it('filters resources by category and search query', () => {
    render(<ResourcesExplorer resources={sampleResources} />);
    expect(screen.getByText('Motor Forward Chaining explicado paso a paso')).toBeInTheDocument();
    expect(screen.getByText('Validación de bases de conocimiento')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Guías' }));
    expect(
      screen.queryByText('Motor Forward Chaining explicado paso a paso'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Validación de bases de conocimiento')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'Forward Chaining' } });
    expect(screen.getByText('Motor Forward Chaining explicado paso a paso')).toBeInTheDocument();
    expect(screen.queryByText('Validación de bases de conocimiento')).not.toBeInTheDocument();
  });
});

describe('StudioAccessButton', () => {
  it('renders a valid fallback CTA to /contacto?tipo=DEMO when no external URL is set', () => {
    render(<StudioAccessButton fallbackLabel="Solicitar demostración" />);
    const link = screen.getByRole('link', { name: /Solicitar demostración/i });
    expect(link).toHaveAttribute('href', '/contacto?tipo=DEMO');
  });
});

describe('ContactForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows client validation errors when submitted empty', async () => {
    render(<ContactForm defaultInquiryType="DEMO" />);
    const submitBtn = screen.getByRole('button', { name: /enviar solicitud/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Ingrese su nombre completo/i),
    ).toBeInTheDocument();
  });

  it('submits valid data to the API and displays confirmation reference', async () => {
    const spy = vi.spyOn(api, 'submitContactInquiry').mockResolvedValue({
      success: true,
      message: 'Solicitud registrada correctamente.',
      data: {
        id: 'INQ-2026-0001',
        inquiry_type: 'DEMO',
        created_at: '2026-03-01T12:00:00Z',
        email_dispatched: true,
      },
    });

    render(<ContactForm defaultInquiryType="DEMO" sourcePage="/contacto" />);

    fireEvent.change(screen.getByLabelText(/nombre completo/i), {
      target: { value: 'María Fernanda Rojas' },
    });
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: 'mrojas@universidad.edu.bo' },
    });
    fireEvent.change(screen.getByLabelText(/asunto/i), {
      target: { value: 'Demostración para Sistemas Expertos' },
    });
    fireEvent.change(screen.getByLabelText(/mensaje/i), {
      target: {
        value: 'Solicitamos una demostración guiada de ExpertEdu Studio para nuestra carrera.',
      },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText(/INQ-2026-0001/)).toBeInTheDocument();
  });
});

describe('SupportTicketForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('submits a support ticket and shows reference code', async () => {
    const spy = vi.spyOn(api, 'submitSupportTicket').mockResolvedValue({
      success: true,
      message: 'Ticket registrado correctamente.',
      data: {
        reference_code: 'EXP-100001',
        status: 'OPEN',
        support_level: 'L2',
        support_level_label: 'Nivel 2 — Mesa de ayuda técnica',
        created_at: '2026-03-01T12:00:00Z',
      },
    });

    render(<SupportTicketForm />);

    fireEvent.change(screen.getByLabelText(/nombre completo/i), {
      target: { value: 'Carlos Mendoza' },
    });
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: 'cmendoza@institucion.edu.bo' },
    });
    fireEvent.change(screen.getByLabelText(/asunto/i), {
      target: { value: 'Duda sobre acceso docente' },
    });
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: {
        value: 'Necesitamos confirmar cómo habilitar el acceso de prácticas para el semestre.',
      },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /registrar incidencia/i }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText(/EXP-100001/)).toBeInTheDocument();
  });
});

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps username and password disabled until OTP verification succeeds and requires 2 legal checkboxes', async () => {
    vi.spyOn(api, 'sendVerificationCode').mockResolvedValue({
      success: true,
      message: 'Código enviado',
      data: { email: 'nuevo@universidad.edu.bo' },
    });
    vi.spyOn(api, 'verifyEmailCode').mockResolvedValue({
      success: true,
      message: 'Correo verificado',
      data: { email: 'nuevo@universidad.edu.bo', verification_token: 'tok-123' },
    });

    render(<RegisterForm />);

    // Bloqueados antes de verificar OTP
    expect(screen.getByLabelText(/nombre de usuario/i)).toBeDisabled();
    expect(screen.getByLabelText(/^contraseña/i)).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
      target: { value: 'nuevo@universidad.edu.bo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar código/i }));

    const otpInput = await screen.findByLabelText(/código temporal/i);
    fireEvent.change(otpInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /verificar código/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/nombre de usuario/i)).toBeEnabled();
    });
    expect(screen.getByLabelText(/^contraseña/i)).toBeEnabled();

    const submitBtn = screen.getByRole('button', { name: /crear cuenta en expertedu/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/política de privacidad/i));
    expect(submitBtn).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/términos y condiciones/i));
    expect(submitBtn).toBeEnabled();
  });
});
