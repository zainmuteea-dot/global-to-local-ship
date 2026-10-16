import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Send, MessageSquare, CheckCircle2, Circle } from "lucide-react";

export const Route = createFileRoute("/admin-chat")({
  component: AdminChatRoute,
});

type Conversation = {
  id: string;
  user_id: string | null;
  status: "open" | "closed";
  created_at: string;
  last_message_at: string;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_type: "visitor" | "bot" | "staff";
  sender_id: string | null;
  body: string;
  created_at: string;
};

const db = supabase as any;

function AdminChatRoute() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    const { data, error: queryError } = await db
      .from("chat_conversations")
      .select("id,user_id,status,created_at,last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(200);

    if (queryError) {
      setError("تعذر تحميل المحادثات. تحقق من تسجيل الدخول وسياسات RLS.");
      setLoading(false);
      console.error("Loading chat conversations failed", queryError);
      return;
    }

    const rows = (data ?? []) as Conversation[];
    setConversations(rows);
    setSelectedId((current) => current ?? rows[0]?.id ?? null);
    setLoading(false);
    setError("");
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error: queryError } = await db
      .from("chat_messages")
      .select("id,conversation_id,sender_type,sender_id,body,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (queryError) {
      setError("تعذر تحميل رسائل هذه المحادثة.");
      console.error("Loading chat messages failed", queryError);
      return;
    }
    setMessages((data ?? []) as ChatMessage[]);
  }, []);

  useEffect(() => {
    void loadConversations();
    const timer = window.setInterval(() => void loadConversations(), 8000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
    const timer = window.setInterval(() => void loadMessages(selectedId), 4000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadMessages]);

  const sendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!selectedId || !body || sending || body.length > 1000) return;

    setSending(true);
    setError("");
    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError || !authData?.user?.id) {
      setError("انتهت جلسة الدخول. سجّل الدخول مجددًا لإرسال الرد.");
      setSending(false);
      return;
    }

    const { error: insertError } = await db.from("chat_messages").insert({
      conversation_id: selectedId,
      sender_type: "staff",
      sender_id: authData.user.id,
      body,
    });

    if (insertError) {
      console.error("Sending staff reply failed", insertError);
      setError("لم يُرسل الرد. تحقق من دور الموظف وسياسة RLS ثم أعد المحاولة.");
      setSending(false);
      return;
    }

    await db
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", selectedId);
    setDraft("");
    await loadMessages(selectedId);
    await loadConversations();
    setSending(false);
  };

  const toggleStatus = async (conversation: Conversation) => {
    const nextStatus = conversation.status === "open" ? "closed" : "open";
    const { error: updateError } = await db
      .from("chat_conversations")
      .update({ status: nextStatus, last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    if (updateError) {
      console.error("Updating chat status failed", updateError);
      setError("تعذر تغيير حالة المحادثة.");
      return;
    }
    await loadConversations();
  };

  const selectedConversation = conversations.find((item) => item.id === selectedId);

  return (
    <AdminRouteGuard allowStaff redirectTo="/admin-chat">
      <main dir="rtl" className="min-h-screen bg-slate-50 p-3 sm:p-6">
        <section className="mx-auto flex max-w-7xl flex-col gap-4">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-black text-slate-900">
                <MessageSquare className="size-5 text-indigo-600" /> صندوق محادثات العملاء
              </h1>
              <p className="mt-1 text-sm text-slate-600">الرسائل تُحفظ في قاعدة البيانات، وتتحدث القائمة تلقائيًا.</p>
            </div>
            <button onClick={() => void loadConversations()} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold hover:bg-slate-50">
              <RefreshCw className="size-4" /> تحديث
            </button>
          </header>

          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          <div className="grid min-h-[70vh] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="border-b p-4 font-bold">المحادثات ({conversations.length})</div>
              <div className="max-h-[70vh] overflow-y-auto">
                {loading ? (
                  <p className="p-4 text-sm text-slate-500">جارٍ تحميل المحادثات…</p>
                ) : conversations.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">لا توجد محادثات حتى الآن. تظهر هنا بعد أن يرسل عميل رسالة من الروبوت.</p>
                ) : conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full border-b p-4 text-right transition hover:bg-slate-50 ${selectedId === conversation.id ? "bg-indigo-50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold">{conversation.user_id ? `عميل مسجل · ${conversation.user_id.slice(0, 8)}` : "زائر"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${conversation.status === "open" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {conversation.status === "open" ? "مفتوحة" : "مغلقة"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">آخر نشاط: {new Date(conversation.last_message_at).toLocaleString("ar-YE")}</div>
                  </button>
                ))}
              </div>
            </aside>

            <section className="flex min-h-[60vh] flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
              {!selectedConversation ? (
                <div className="grid flex-1 place-items-center p-6 text-center text-slate-500">اختر محادثة من القائمة لعرض الرسائل والرد عليها.</div>
              ) : (
                <>
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                    <div>
                      <div className="font-black">{selectedConversation.user_id ? `عميل مسجل · ${selectedConversation.user_id.slice(0, 8)}` : "محادثة زائر"}</div>
                      <div className="mt-1 text-xs text-slate-500">بدأت {new Date(selectedConversation.created_at).toLocaleString("ar-YE")}</div>
                    </div>
                    <button onClick={() => void toggleStatus(selectedConversation)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold hover:bg-slate-50">
                      {selectedConversation.status === "open" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Circle className="size-4" />}
                      {selectedConversation.status === "open" ? "إغلاق المحادثة" : "إعادة فتحها"}
                    </button>
                  </header>
                  <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                    {messages.length === 0 ? <p className="text-center text-sm text-slate-500">لا توجد رسائل محفوظة.</p> : messages.map((message) => {
                      const staff = message.sender_type === "staff";
                      const visitor = message.sender_type === "visitor";
                      return (
                        <div key={message.id} className={`flex ${staff ? "justify-start" : "justify-end"}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${staff ? "bg-indigo-700 text-white" : visitor ? "border bg-white text-slate-900" : "border border-amber-200 bg-amber-50 text-slate-800"}`}>
                            <div className="mb-1 text-[11px] font-bold opacity-75">{staff ? "الموظف" : visitor ? "العميل" : "الروبوت"}</div>
                            <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                            <time className="mt-2 block text-left text-[10px] opacity-70">{new Date(message.created_at).toLocaleString("ar-YE")}</time>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <form onSubmit={(event) => void sendReply(event)} className="flex gap-2 border-t p-3">
                    <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} placeholder="اكتب رد الموظف…" disabled={selectedConversation.status !== "open" || sending} className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-100" />
                    <button type="submit" disabled={!draft.trim() || sending || selectedConversation.status !== "open"} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 font-bold text-white hover:bg-indigo-800 disabled:opacity-50">
                      <Send className="size-4" /> إرسال
                    </button>
                  </form>
                  {selectedConversation.status === "closed" && <p className="px-4 pb-3 text-xs text-slate-500">أعد فتح المحادثة لتتمكن من إرسال رد.</p>}
                </>
              )}
            </section>
          </div>
        </section>
      </main>
    </AdminRouteGuard>
  );
}
