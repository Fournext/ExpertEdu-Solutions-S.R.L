/**
 * Centralized commercial plans configuration (based on SW2 Chapter 10 proposal).
 * Amounts and capacities are referential and subject to institutional confirmation.
 */

export interface PricingPlan {
  id: string;
  name: string;
  audience: string;
  badge?: string;
  monthlyPriceBs: number | null;
  annualPriceBs: number | null;
  priceDisplay: string;
  billingNote: string;
  summary: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
}

export const PRICING_NOTICE =
  'Tarifas referenciales expresadas en Bolivianos (Bs.) conforme a la propuesta comercial de ExpertEdu Solutions S.R.L. Antes de formalizar una contratación o facturación institucional, nuestro equipo valida los requerimientos y disponibilidad de su cátedra o facultad.';

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'comunidad',
    name: 'Comunidad',
    audience: 'Estudiantes y proyectos personales',
    monthlyPriceBs: 0,
    annualPriceBs: 0,
    priceDisplay: 'Bs. 0',
    billingNote: 'Acceso gratuito introductorio',
    summary:
      'Ideal para explorar el editor visual de conocimiento y realizar prácticas individuales.',
    features: [
      'Acceso gratuito sin tarjeta de crédito',
      'Uso introductorio de ExpertEdu Studio',
      'Proyectos personales en la nube',
      'Límite referencial de hasta 25 reglas',
      'Motor de inferencia Forward Chaining',
    ],
    ctaLabel: 'Solicitar información',
    ctaHref: '/contacto?tipo=GENERAL&plan=comunidad',
  },
  {
    id: 'catedra-pro',
    name: 'Cátedra Pro',
    audience: 'Docentes universitarios',
    badge: 'Más solicitado',
    monthlyPriceBs: 120,
    annualPriceBs: 1100,
    priceDisplay: 'Bs. 120 / mes',
    billingNote: 'o Bs. 1.100 anuales (referencial)',
    summary:
      'Pensado para docentes que gestionan cursos activos, asignaciones y seguimiento de estudiantes.',
    features: [
      'Hasta 4 cursos activos por periodo',
      'Hasta 250 estudiantes matriculados',
      'Gestión de actividades y clonación de espacios',
      'Validación estática y trazabilidad paso a paso',
      'Soporte prioritario por mesa de ayuda',
    ],
    ctaLabel: 'Solicitar demostración',
    ctaHref: '/contacto?tipo=DEMO&plan=catedra-pro',
    highlighted: true,
  },
  {
    id: 'carrera-universitaria',
    name: 'Carrera Universitaria',
    audience: 'Direcciones de carrera',
    monthlyPriceBs: null,
    annualPriceBs: 3100,
    priceDisplay: 'Bs. 3.100 / año',
    billingNote: 'Licencia anual departamental referencial',
    summary:
      'Orientado a instituciones que requieren habilitar la plataforma para todos los docentes de una carrera.',
    features: [
      'Cobertura para docentes de una carrera',
      'Cursos y bases de conocimiento sin límite de reglas',
      'Acompañamiento inicial de adopción académica',
      'Facturación institucional coordinada',
      'Soporte técnico escalonado',
    ],
    ctaLabel: 'Consultar licencia institucional',
    ctaHref: '/contacto?tipo=INSTITUTIONAL_LICENSING&plan=carrera',
  },
  {
    id: 'facultad-completa',
    name: 'Facultad Completa',
    audience: 'Facultades y universidades',
    monthlyPriceBs: null,
    annualPriceBs: 8300,
    priceDisplay: 'Bs. 8.300 / año',
    billingNote: 'Licencia institucional amplia referencial',
    summary:
      'Diseñado para facultades con múltiples carreras tecnológicas que buscan estandarizar laboratorios.',
    features: [
      'Cobertura multi-carrera dentro de la facultad',
      'Múltiples docentes y cohortes estudiantiles',
      'Sesiones de capacitación para el cuerpo docente',
      'Reportes de adopción y soporte de ingeniería',
      'Evaluación de integraciones educativas futuras',
    ],
    ctaLabel: 'Consultar licencia institucional',
    ctaHref: '/contacto?tipo=INSTITUTIONAL_LICENSING&plan=facultad',
  },
];

export const PLAN_COMPARISON_ROWS = [
  {
    feature: 'Público principal',
    values: ['Estudiantes / Uso libre', 'Docente individual', 'Dirección de Carrera', 'Facultad / Decanato'],
  },
  {
    feature: 'Límite referencial de reglas',
    values: ['Hasta 25 reglas', 'Sin límite', 'Sin límite', 'Sin límite'],
  },
  {
    feature: 'Cursos activos y asignaciones',
    values: ['Participación como alumno', 'Hasta 4 cursos / 250 est.', 'Todos los cursos de la carrera', 'Multi-carrera en facultad'],
  },
  {
    feature: 'Editor visual + Forward Chaining',
    values: ['Incluido', 'Incluido', 'Incluido', 'Incluido'],
  },
  {
    feature: 'Validación estática y trazabilidad',
    values: ['Básica', 'Completa', 'Completa', 'Completa'],
  },
  {
    feature: 'Soporte y acompañamiento',
    values: ['Autoservicio (Nivel 1)', 'Mesa de ayuda prioritaria', 'Mesa de ayuda + Onboarding', 'Ingeniería + Capacitación'],
  },
];
