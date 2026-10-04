# إصلاح خطأ 404 في صفحة «حسابي» (/my-account)

## السبب
ملف `src/routes/my-account.tsx` موجود ويحتوي صفحة الحساب كاملة (641 سطراً)، لكنه يصدّر المكوّن `MyAccountPage` فقط ولا يعرّف مساراً عبر `createFileRoute`. لذلك لم يُسجَّل `/my-account` في شجرة المسارات ويظهر 404 عند فتحه.

## الإصلاح
1. **تسجيل المسار**: إضافة في أعلى الملف:
   ```ts
   import { createFileRoute } from "@tanstack/react-router";
   export const Route = createFileRoute("/my-account")({ component: MyAccountPage });
   ```
2. **ربط أزرار التنقل**: المكوّن يستقبل callbacks اختيارية (`onNavigateToNewOrder`, `onNavigateToTracker`, `onNavigateToDashboard`) — تُربط بـ `useNavigate` لتوجيه المستخدم إلى `/new-order` و`/track` و`/dashboard` بدل البقاء بلا استجابة.
3. **بيانات الملف الشخصي**: استبدال القيم الثابتة (الاسم/الهاتف) ببيانات المستخدم الحقيقية من الجلسة و`profiles` عند توفرها، مع إبقاء القيم الحالية كاحتياط.
4. **التحقق**: تشغيل فحص الأنواع والتأكد من فتح `/my-account` في المعاينة دون 404، وتجربة أزرار الصفحة.

## ملاحظات تقنية
- لا تعديل على `routeTree.gen.ts` (يُولَّد تلقائياً).
- الصفحة عامة العرض لكن أزرارها تتطلب جلسة؛ تُعرض دعوة تسجيل دخول عند غياب الجلسة بدل شاشة فارغة.
