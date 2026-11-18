import { SITE_CONFIG } from '@/config/site';

export type InquiryType =
  | 'GENERAL'
  | 'DEMO'
  | 'TECH_SERVICES'
  | 'INSTITUTIONAL_LICENSING'
  | 'SUPPORT'
  | 'OTHER';

export interface ContactPayload {
  full_name: string;
  email: string;
  organization: string;
  inquiry_type: InquiryType;
  subject: string;
  message: string;
  privacy_accepted: boolean;
  source_page: string;
  website?: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    inquiry_type: string;
    created_at: string;
    email_dispatched: boolean;
  };
}

export type SupportCategory =
  | 'ACCESS'
  | 'VISUAL_EDITOR'
  | 'INFERENCE_ENGINE'
  | 'VALIDATION'
  | 'ACTIVITIES'
  | 'LICENSING'
  | 'OTHER';

export type SupportSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SupportTicketPayload {
  full_name: string;
  email: string;
  organization: string;
  category: SupportCategory;
  severity: SupportSeverity;
  subject: string;
  description: string;
  privacy_accepted: boolean;
  website?: string;
}

export interface SupportTicketResponse {
  success: boolean;
  message: string;
  data?: {
    reference_code: string;
    support_level: string;
    support_level_label: string;
    status: string;
    created_at: string;
  };
}

export interface ApiErrorResult {
  status: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

async function postJson<TPayload, TResponse>(
  endpoint: string,
  payload: TPayload,
): Promise<TResponse> {
  const url = `${SITE_CONFIG.apiBaseUrl}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error: ApiErrorResult = {
      status: response.status,
      message:
        typeof data.message === 'string'
          ? data.message
          : 'Revise los campos del formulario e inténtelo nuevamente.',
      fieldErrors:
        typeof data === 'object' && data !== null && !('message' in data)
          ? (data as Record<string, string[]>)
          : undefined,
    };
    throw error;
  }

  return data as TResponse;
}

export function submitContactInquiry(payload: ContactPayload): Promise<ContactResponse> {
  return postJson<ContactPayload, ContactResponse>('/contact/', payload);
}

export function submitSupportTicket(
  payload: SupportTicketPayload,
): Promise<SupportTicketResponse> {
  return postJson<SupportTicketPayload, SupportTicketResponse>(
    '/support/tickets/',
    payload,
  );
}

// ---------------------------------------------------------------------------
// Corporate Auth, OTP Verification, Product Enrollment & Superadmin APIs
// ---------------------------------------------------------------------------

export type StudioRoleCode = 'DOCENTE' | 'ESTUDIANTE';
export type StudioPlanCode = 'ESTUDIANTE' | 'DOCENTE_INDIVIDUAL' | 'INSTITUCIONAL';

export interface ProductMembership {
  id: string;
  product_code: string;
  product_name: string;
  role: StudioRoleCode;
  role_label: string;
  plan_code: StudioPlanCode;
  plan_name: string;
  is_active: boolean;
  enrolled_at: string;
  updated_at: string;
}

export interface CorporateUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  organization: string;
  email_verified: boolean;
  is_superadmin: boolean;
  memberships: ProductMembership[];
}

export interface CorporateAuthSession {
  token: string;
  user: CorporateUser;
}

const SESSION_STORAGE_KEY = 'expertedu_corp_session';

export function getStoredSession(): CorporateAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CorporateAuthSession;
    return parsed?.token && parsed?.user ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: CorporateAuthSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    window.dispatchEvent(new window.CustomEvent('expertedu-auth-change'));
  } catch {
    /* ignore storage errors */
  }
}

async function requestAuthJson<TResponse>(
  endpoint: string,
  options: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown; token?: string | null } = {},
): Promise<TResponse> {
  const token = options.token ?? getStoredSession()?.token ?? null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${SITE_CONFIG.apiBaseUrl}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    let message =
      typeof data.message === 'string'
        ? data.message
        : 'No se pudo completar la operación.';
    if (typeof data === 'object' && data !== null && !('message' in data)) {
      const firstVal = Object.values(data)[0];
      if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') {
        message = firstVal[0];
      }
    }
    const error: ApiErrorResult = {
      status: response.status,
      message,
      fieldErrors:
        typeof data === 'object' && data !== null && !('message' in data)
          ? (data as Record<string, string[]>)
          : undefined,
    };
    throw error;
  }

  return data as TResponse;
}

export function sendVerificationCode(email: string) {
  return requestAuthJson<{ success: boolean; message: string; data: { email: string } }>(
    '/auth/send-code/',
    { method: 'POST', body: { email } },
  );
}

export function verifyEmailCode(email: string, code: string) {
  return requestAuthJson<{
    success: boolean;
    message: string;
    data: { email: string; verification_token: string };
  }>('/auth/verify-code/', { method: 'POST', body: { email, code } });
}

export function registerCustomer(payload: {
  email: string;
  verification_token: string;
  username: string;
  full_name: string;
  organization: string;
  password: string;
  confirm_password: string;
  privacy_accepted: boolean;
  terms_accepted: boolean;
}) {
  return requestAuthJson<{
    success: boolean;
    message: string;
    data: CorporateAuthSession;
  }>('/auth/register/', { method: 'POST', body: payload });
}

export function loginCustomer(identifier: string, password: string) {
  return requestAuthJson<{
    success: boolean;
    message: string;
    data: CorporateAuthSession;
  }>('/auth/login/', { method: 'POST', body: { identifier, password } });
}

export function sendPasswordResetCode(email: string) {
  return requestAuthJson<{ success: boolean; message: string }>(
    '/auth/password-reset/send-code/',
    { method: 'POST', body: { email } },
  );
}

export function confirmPasswordReset(payload: {
  email: string;
  code: string;
  new_password: string;
  confirm_password: string;
}) {
  return requestAuthJson<{ success: boolean; message: string }>(
    '/auth/password-reset/confirm/',
    { method: 'POST', body: payload },
  );
}

export function logoutCustomer() {
  return requestAuthJson<{ success: boolean; message: string }>('/auth/logout/', {
    method: 'POST',
  });
}

export function fetchCurrentUser() {
  return requestAuthJson<{ success: boolean; data: CorporateUser }>('/auth/me/');
}

export function enrollInStudio(role: StudioRoleCode, plan_code: StudioPlanCode) {
  return requestAuthJson<{
    success: boolean;
    message: string;
    data: {
      membership: ProductMembership;
      sso_url: string;
      user: CorporateUser;
    };
  }>('/products/studio/enroll/', {
    method: 'POST',
    body: { role, plan_code },
  });
}

export function launchStudioSso() {
  return requestAuthJson<{
    success: boolean;
    data: {
      sso_url: string;
      membership: ProductMembership;
    };
  }>('/products/studio/launch/', { method: 'POST' });
}

export interface SuperAdminOverviewData {
  selected_product: string;
  available_products: Array<{ code: string; label: string }>;
  kpis: {
    total_customers: number;
    total_active_subscriptions: number;
    by_product: Array<{ product_code: string; total: number }>;
    by_plan: Array<{ plan_code: string; total: number }>;
    by_role: Array<{ role: string; total: number }>;
  };
  customers: Array<{
    id: number;
    username: string;
    email: string;
    full_name: string;
    organization: string;
    date_joined: string;
    memberships: ProductMembership[];
  }>;
}

export interface InboxMessageItem {
  id: string;
  item_type: 'contact' | 'support';
  reference_code?: string;
  full_name: string;
  email: string;
  organization: string;
  category: string;
  category_label: string;
  severity?: string;
  support_level_label?: string;
  subject: string;
  body: string;
  status: string;
  status_label: string;
  target_inbox: string;
  created_at: string;
}

export interface SuperAdminInboxData {
  mailboxes: {
    commercial: string;
    support: string;
  };
  commercial_messages: InboxMessageItem[];
  support_messages: InboxMessageItem[];
}

export function fetchSuperAdminOverview(productCode = 'ALL') {
  const qs =
    productCode && productCode !== 'ALL'
      ? `?product_code=${encodeURIComponent(productCode)}`
      : '';
  return requestAuthJson<{ success: boolean; data: SuperAdminOverviewData }>(
    `/superadmin/overview/${qs}`,
  );
}

export type KnowledgeCategory = 'EMPRESA' | 'PRODUCTO' | 'PRECIOS' | 'SOPORTE' | 'OTRO';

export interface ChatbotKnowledgeItem {
  id: string;
  title: string;
  category: KnowledgeCategory;
  category_label: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function askPublicChatbot(
  question: string,
  history: Array<{ role: 'user' | 'model'; text: string }> = [],
) {
  return requestAuthJson<{
    success: boolean;
    data: { answer: string; provider: string; sources_count: number };
  }>('/chatbot/ask/', {
    method: 'POST',
    body: { question, history },
    token: null,
  });
}

export function fetchChatbotKnowledge() {
  return requestAuthJson<{ success: boolean; data: ChatbotKnowledgeItem[] }>(
    '/superadmin/chatbot-knowledge/',
  );
}

export function createChatbotKnowledge(payload: {
  title: string;
  category: KnowledgeCategory;
  content: string;
  is_active?: boolean;
}) {
  return requestAuthJson<{ success: boolean; data: ChatbotKnowledgeItem }>(
    '/superadmin/chatbot-knowledge/',
    { method: 'POST', body: payload },
  );
}

export function updateChatbotKnowledge(
  id: string,
  payload: Partial<{ title: string; category: KnowledgeCategory; content: string; is_active: boolean }>,
) {
  return requestAuthJson<{ success: boolean; data: ChatbotKnowledgeItem }>(
    `/superadmin/chatbot-knowledge/${id}/`,
    { method: 'PATCH', body: payload },
  );
}

export function deleteChatbotKnowledge(id: string) {
  return requestAuthJson<{ success: boolean }>(`/superadmin/chatbot-knowledge/${id}/`, {
    method: 'PATCH',
    body: undefined,
  }).catch(() => undefined);
}

export function fetchSuperAdminInbox() {
  return requestAuthJson<{ success: boolean; data: SuperAdminInboxData }>(
    '/superadmin/inbox/',
  );
}

export function updateInboxItemStatus(
  itemType: 'contact' | 'support',
  itemId: string,
  newStatus: string,
) {
  return requestAuthJson<{ success: boolean; data: { id: string; status: string } }>(
    `/superadmin/inbox/${itemType}/${itemId}/`,
    { method: 'PATCH', body: { status: newStatus } },
  );
}
