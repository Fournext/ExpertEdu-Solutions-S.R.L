/**
 * Founding team structured data.
 * Roles are configurable here without inventing formal corporate titles or fake photos.
 */

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  configurableRole: string;
  focusAreas: string[];
  bio: string;
}

export const FOUNDING_TEAM: TeamMember[] = [
  {
    id: 'dalessandro-copa',
    name: "D'alessandro Copa Monzon",
    initials: 'DC',
    configurableRole: 'Socio fundador — Arquitectura, Calidad y Producto',
    focusAreas: [
      'Arquitectura de software',
      'Aseguramiento de calidad (SQA)',
      'Diseño de sistemas educativos',
    ],
    bio: 'Co-fundador de ExpertEdu Solutions S.R.L. Enfocado en la arquitectura de soluciones educativas, estándares de calidad de software y diseño de experiencias claras para docentes y estudiantes.',
  },
  {
    id: 'cesar-zeballos',
    name: 'Cesar Sebastian Zeballos',
    initials: 'CZ',
    configurableRole: 'Socio fundador — Ingeniería de Software e Infraestructura',
    focusAreas: [
      'Desarrollo Full-Stack',
      'Motores simbólicos y lógica',
      'Despliegue e infraestructura cloud',
    ],
    bio: 'Co-fundador de ExpertEdu Solutions S.R.L. Enfocado en la ingeniería de plataformas web interactivas, motores de inferencia deterministas y operación confiable en entornos en la nube.',
  },
];
