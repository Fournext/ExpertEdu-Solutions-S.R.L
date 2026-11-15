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
