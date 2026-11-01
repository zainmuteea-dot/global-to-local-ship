# هيكل أولي آمن لمزامنة SHEIN

هذه حزمة يدوية للنسخ إلى مشروع **Your Global Shopper**. تجهّز واجهة حالة ودالة خادمية مغلقة افتراضيًا، لكنها **لا تتصل بـSHEIN ولا تقرأ أو تعدّل المنتجات**. لا توجد هنا أسماء endpoints أو مفاتيح أو تخمينات لمخطط قاعدة البيانات.

## الملفات

### 1) `supabase/functions/shein-sync/index.ts`

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonObject = Record<string, unknown>;

function json(status: number, body: JsonObject): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "استخدم POST فقط." });
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(401, { error: "يلزم تسجيل الدخول بحساب إداري." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    console.error("shein-sync: Supabase URL or anon key is missing.");
    return json(500, { error: "إعداد الدالة غير مكتمل على الخادم." });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData.user) {
    return json(401, { error: "جلسة الدخول غير صالحة. سجّل الدخول مجددًا." });
  }

  const { data: isAdmin, error: roleError } = await callerClient.rpc("has_role", {
    _user_id: authData.user.id,
    _role: "admin",
  });
  if (roleError) {
    console.error("shein-sync: admin role verification failed.");
    return json(500, { error: "تعذر التحقق من صلاحية المشرف." });
  }
  if (isAdmin !== true) {
    return json(403, { error: "هذه العملية متاحة للمشرفين فقط." });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "بيانات الطلب غير صالحة." });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json(400, { error: "بيانات الطلب غير صالحة." });
  }

  const action = (body as Record<string, unknown>).action;
  if (action !== "status" && action !== "sync") {
    return json(400, { error: "الإجراء المطلوب غير معروف." });
  }

  // Fail closed: لا توجد مواصفات OpenAPI معتمدة ولا ربط SHEIN في هذه النسخة.
  // لا تضف طلبات شبكة أو كتابة إلى قاعدة البيانات قبل مراجعة وثائق API والمخطط.
  return json(503, {
    code: "SHEIN_API_NOT_READY",
    status: "disabled",
    message: "تكامل SHEIN غير مفعّل. يلزم اعتماد API ومواصفاته قبل المزامنة.",
  });
});
```

### 2) `src/components/admin/SheinSyncPanel.tsx`

```tsx
export function SheinSyncPanel() {
  return (
    <section
      aria-labelledby="shein-sync-title"
      className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">تكامل المتجر</p>
          <h2 id="shein-sync-title" className="mt-1 text-xl font-semibold text-neutral-900">
            مزامنة SHEIN
          </h2>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
          غير مفعّلة
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-neutral-700">
        اتجاه المزامنة المطلوب: ثنائي الاتجاه. التشغيل متوقف حتى اعتماد تطبيق API من SHEIN،
        استلام المواصفات الرسمية، ومراجعة طريقة ربط المنتجات والمخزون والطلبات.
      </p>

      <ul className="mt-4 space-y-2 text-sm text-neutral-600">
        <li>• اتصال SHEIN: غير مربوط</li>
        <li>• آخر مزامنة ناجحة: لا توجد</li>
        <li>• البيانات لم تُرسل أو تُستورد</li>
      </ul>

      <button
        type="button"
        disabled
        aria-describedby="shein-sync-help"
        className="mt-5 cursor-not-allowed rounded-lg bg-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-500"
      >
        ابدأ المزامنة
      </button>
      <p id="shein-sync-help" className="mt-2 text-xs text-neutral-500">
        سيُتاح التشغيل بعد اكتمال اعتماد API ومراجعة الحقول وسياسات التحديث.
      </p>
    </section>
  );
}
```

### 3) إضافة اللوحة إلى صفحة منتجات SHEIN

في `src/routes/admin/logos/$slug.tsx`، أضف الاستيراد:

```tsx
import { SheinSyncPanel } from "@/components/admin/SheinSyncPanel";
```

ثم داخل JSX الخاص بالصفحة، أظهر اللوحة عند فتح SHEIN فقط:

```tsx
{slug === "shein" && <SheinSyncPanel />}
```

ضعها داخل الحاوية المناسبة قرب عنوان الصفحة. لا تستبدل بقية الصفحة بهذا المقطع.

## خطوات إدخال يدوية آمنة

1. أنشئ المجلد `src/components/admin` إن لم يكن موجودًا، ثم أضف الملفين في المسارات أعلاه.
2. أضف استيراد اللوحة ومقطع العرض داخل صفحة SHEIN. لا تلصق كود الدالة في `admin-create-employee` أو `admin-delete-employee`.
3. أنشئ Edge Function جديدة باسم `shein-sync`، مع إبقاء **Verify JWT with legacy secret** مفعّلًا. لا تضع أي مفتاح في المتصفح أو في هذا الملف.
4. اترك الزر معطّلًا والدالة على حالة `SHEIN_API_NOT_READY`. لا توجد أي مزامنة فعلية في هذه النسخة.
5. قبل بناء المزامنة الحقيقية: يلزم اعتماد الوصول إلى SHEIN OpenAPI، الحصول على الوثائق الرسمية والتفويض، ثم مطابقة مخطط جداول المنتجات والمخزون والطلبات في قاعدة Supabase الصحيحة. بعد ذلك فقط تُحدد قواعد التعارض والحذف والتحديث ثنائي الاتجاه، ويُكتب ترحيل جديد إن لزم بعد مراجعة المخطط.
6. اختبر أولًا على بيانات تجريبية/بيئة اختبار، ثم راجع التغييرات قبل النشر. لم تُشغّل هذه الملفات أو تُنشر، ولا تثبت صلاحيتها للبناء في نسخة المشروع الحالية.

## ما لم تتضمنه الحزمة

- لا يوجد ترحيل SQL، لأن مخطط قاعدة البيانات الفعلي لم يُثبت لهذه المزامنة.
- لا توجد مفاتيح SHEIN أو عناوين API أو طلبات HTTP مخمّنة.
- لا يوجد استيراد أو تصدير أو تعديل منتجات أو مخزون أو طلبات.
- لا تغيير على GitHub أو Supabase أو Vercel.
