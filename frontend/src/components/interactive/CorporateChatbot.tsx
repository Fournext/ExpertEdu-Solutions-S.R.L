import React, { useState } from 'react';
import { Bot, Loader2, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { askPublicChatbot, type ApiErrorResult } from '@/services/api';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const SUGGESTED_QUESTIONS = [
  '¿Qué es ExpertEdu Solutions S.R.L.?',
  '¿Qué funcionalidades tiene ExpertEdu Studio?',
  '¿Cómo me registro como Docente o Estudiante?',
  '¿Qué planes comerciales existen?',
];

export const CorporateChatbot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: '¡Hola! Soy el asistente virtual de ExpertEdu. Pregúntame sobre nuestra empresa, ExpertEdu Studio, planes o cómo registrarte.',
    },
  ]);

  const sendQuestion = async (rawText: string) => {
    const question = rawText.trim();
    if (!question || loading) return;

    const nextHistory = [...messages, { role: 'user' as const, text: question }];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await askPublicChatbot(question, messages);
      setMessages((prev) => [...prev, { role: 'model', text: res.data.answer }]);
    } catch (err) {
      const apiErr = err as ApiErrorResult;
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text:
            apiErr.message ||
            'No pude consultar la respuesta en este momento. Puedes escribirnos a contacto@expertedu.bo.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuestion(input);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div
          role="dialog"
          aria-label="Asistente virtual ExpertEdu"
          className="mb-3 flex h-[480px] w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-2xl sm:w-[380px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-brand-graphite px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-white">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-sm font-bold leading-tight">
                  Asistente ExpertEdu
                </p>
                <p className="flex items-center gap-1 text-[11px] text-emerald-300">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Consultas de empresa y producto
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente"
              className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-brand-surface p-4 text-sm">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-primary text-white'
                      : 'border border-brand-border bg-white text-brand-graphite shadow-2xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-brand-border bg-white px-3.5 py-2 text-xs text-brand-slate">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-primary" />
                  Pensando respuesta...
                </div>
              </div>
            )}
          </div>

          {/* Suggested questions */}
          {messages.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 border-t border-brand-border bg-white px-3 py-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void sendQuestion(q)}
                  className="rounded-full border border-brand-border bg-brand-surface px-2.5 py-1 text-[11px] font-medium text-brand-slate hover:border-brand-primary hover:text-brand-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-brand-border bg-white p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta sobre ExpertEdu..."
              aria-label="Pregunta para el asistente ExpertEdu"
              className="min-w-0 flex-1 rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs text-brand-graphite focus:border-brand-primary focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Enviar pregunta"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white hover:bg-brand-primary-hover disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Ocultar asistente virtual' : 'Abrir asistente virtual ExpertEdu'}
        className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-primary-hover"
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        <span>{open ? 'Cerrar chat' : 'Asistente IA'}</span>
      </button>
    </div>
  );
};
