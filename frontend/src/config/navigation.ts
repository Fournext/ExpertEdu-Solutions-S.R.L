export interface NavItem {
  label: string;
  href: string;
}

export const MAIN_NAVIGATION: NavItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Soluciones', href: '/soluciones' },
  { label: 'Universidades', href: '/universidades' },
  { label: 'Precios', href: '/precios' },
  { label: 'Recursos', href: '/recursos' },
  { label: 'Contacto', href: '/contacto' },
];

export const FOOTER_NAVIGATION = {
  empresa: [
    { label: 'Inicio', href: '/' },
    { label: 'Nosotros', href: '/nosotros' },
    { label: 'Soluciones', href: '/soluciones' },
    { label: 'Para Universidades', href: '/universidades' },
  ],
  producto: [
    { label: 'ExpertEdu Studio', href: '/producto' },
    { label: 'Planes y Precios', href: '/precios' },
    { label: 'Recursos Educativos', href: '/recursos' },
    { label: 'Soporte Técnico', href: '/soporte' },
  ],
  legal: [
    { label: 'Política de Privacidad', href: '/privacidad' },
    { label: 'Contacto Comercial', href: '/contacto' },
  ],
} as const;
