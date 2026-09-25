# لوحة مدير النظام (super_admin_web)

إدارة النظام: إحصائيات النظام (التخزين، الأجهزة، الجلسات، المعالجة)، حساب صاحب المعهد، أجهزة
الطلاب (المكان الوحيد لإعادة تعيين الجهاز)، سجل التدقيق (قراءة فقط)، إعدادات النظام، إضافة
إلى كل ما يديره صاحب المعهد.

React 19 · Vite · TypeScript · TanStack Query · React Hook Form + Zod · Tailwind CSS 4 · i18next (عربي/إنجليزي).

## التشغيل

الـ backend يجب أن يعمل (`npm run dev` داخل مجلد backend). ثم داخل هذا المجلد:

```bash
npm install      # مرة واحدة فقط
npm run dev
```

افتح http://localhost:5174 — الدخول: `0900000000` / `Admin12345`.

## ملف `.env`

| المتغير | المعنى |
|---|---|
| `VITE_API_BASE_URL` | عنوان الـ API (محلياً `http://localhost:4000`) |

## أوامر أخرى

| الأمر | ماذا يفعل |
|---|---|
| `npm run build` | نسخة الإنتاج في `dist/` |
| `npm test` · `npm run lint` · `npm run typecheck` | الاختبارات والفحص |

## الرفع على السيرفر

ضع في `.env`: `VITE_API_BASE_URL=https://api.your-domain.com` ثم `npm run build`، وانسخ محتوى
`dist/` إلى `backend/deploy/sites/admin/` على السيرفر (التفاصيل في `backend/docs/deployment.md`).
يُنصح بقصر الوصول لهذه اللوحة على عناوين IP معروفة.

## بنية المشروع

```
src/main.tsx, src/portal.ts   الدخول، القائمة الجانبية، صفحات هذه اللوحة
src/features/                 صفحات المدير فقط: system, owner, devices, audit, settings
src/shared/                   نظام التصميم، الترجمة، عميل الـ API، الشاشات المشتركة
tests/                        الاختبارات
```
