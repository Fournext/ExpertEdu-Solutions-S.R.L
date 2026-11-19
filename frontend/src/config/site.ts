/* global process */
/**
 * Centralized corporate configuration for ExpertEdu Solutions S.R.L.
 * All contact channels, product URLs, and institutional metadata live here.
 */

const rawStudioUrl =
  import.meta.env.PUBLIC_EXPERTEDU_STUDIO_URL ||
  (typeof process !== 'undefined' ? process.env.EXPERTEDU_STUDIO_URL : '') ||
  '';

export const EXPERTEDU_STUDIO_URL = rawStudioUrl.trim();

export const hasConfiguredStudioUrl = (): boolean => {
  if (!EXPERTEDU_STUDIO_URL) return false;
  try {
    const parsed = new URL(EXPERTEDU_STUDIO_URL);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const SITE_CONFIG = {
  legalName: 'ExpertEdu Solutions S.R.L.',
  brandName: 'ExpertEdu',
  productName: 'ExpertEdu Studio',
  sector: 'Tecnología Educativa (EdTech) y Desarrollo de Software',
  domain: import.meta.env.PUBLIC_SITE_URL || 'https://expertedu.bo',
  apiBaseUrl:
    import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1',
  location: {
    streetAddress: 'Ave 16 de Noviembre # 36',
    city: 'Santa Cruz de la Sierra',
    country: 'Bolivia',
    addressNote: 'Ave 16 de Noviembre # 36, Santa Cruz de la Sierra, Bolivia',
    mapEmbedUrl:
      'https://maps.google.com/maps?q=Ave%2016%20de%20Noviembre%2036%2C%20Santa%20Cruz%20de%20la%20Sierra%2C%20Bolivia&t=&z=16&ie=UTF8&iwloc=&output=embed',
    mapLinkUrl:
      'https://www.google.com/maps/search/?api=1&query=Ave+16+de+Noviembre+36,+Santa+Cruz+de+la+Sierra,+Bolivia',
  },
  contact: {
    commercialEmail:
      import.meta.env.PUBLIC_COMMERCIAL_EMAIL || 'contacto@expertedu.bo',
    supportEmail:
      import.meta.env.PUBLIC_SUPPORT_EMAIL || 'soporte@expertedu.bo',
    phone: '', // Configurar únicamente cuando exista una línea corporativa habilitada
  },
  social: {
    // Configurar únicamente con perfiles oficiales verificados
    linkedin: '',
    github: '',
    youtube: '',
  },
  mission:
    'Desarrollar soluciones tecnológicas innovadoras que contribuyan a optimizar los procesos de enseñanza y aprendizaje, proporcionando herramientas digitales interactivas, accesibles y adaptadas a las necesidades de docentes, estudiantes e instituciones educativas.',
  vision:
    'Consolidarse como una empresa tecnológica de referencia en Bolivia y Latinoamérica en el desarrollo de soluciones educativas innovadoras, reconocida por su calidad, accesibilidad, capacidad de innovación y contribución a la transformación digital de la educación.',
  values: [
    {
      title: 'Innovación tecnológica',
      description:
        'Aplicamos arquitectura web moderna y técnicas de inteligencia artificial con propósito pedagógico real.',
    },
    {
      title: 'Calidad y excelencia',
      description:
        'Cada producto sigue estándares formales de ingeniería, pruebas automatizadas y trazabilidad.',
    },
    {
      title: 'Compromiso educativo',
      description:
        'Diseñamos herramientas centradas en resolver retos reales de docentes, estudiantes y facultades.',
    },
    {
      title: 'Transparencia',
      description:
        'Promovemos explicabilidad algorítmica en nuestros productos y comunicación clara en nuestra relación comercial.',
    },
    {
      title: 'Accesibilidad',
      description:
        'Construimos interfaces responsivas y accesibles desde navegadores modernos sin requerir instalaciones complejas.',
    },
    {
      title: 'Seguridad de la información',
      description:
        'Protegemos los datos personales y académicos mediante buenas prácticas de cifrado, validación y control de acceso.',
    },
    {
      title: 'Mejora continua',
      description:
        'Iteramos de forma constante a partir de la retroalimentación de cátedras y equipos académicos.',
    },
    {
      title: 'Orientación al usuario',
      description:
        'Priorizamos flujos claros que reduzcan la fricción operativa en el aula y en la gestión académica.',
    },
  ],
} as const;
