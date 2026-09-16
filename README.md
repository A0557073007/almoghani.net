# almoghani.net

موقع ثابت (Static Site) جاهز للنشر على Vercel.

## المتطلبات
- وجود `index.html` في جذر المشروع
- ربط المستودع مع Vercel

## النشر على Vercel
1. ادخل إلى Vercel واختر **New Project**.
2. اربط مستودع GitHub: `A0557073007/almoghani.net`.
3. اضغط **Deploy**.
4. بعد النشر ستحصل على رابط `*.vercel.app`.

## ربط الدومين `almoghani.net`
1. من Vercel: **Project → Settings → Domains**.
2. أضف:
   - `almoghani.net`
   - `www.almoghani.net`
3. في DNS (Cloudflare أو GoDaddy) أضف **السجلات التي يعرضها Vercel داخل صفحة الدومين**.
   - القيم قد تختلف حسب إعدادات المشروع أو تغييرات Vercel.
   - انسخ Record Type / Name / Value كما تظهر لك في Vercel.
4. ارجع إلى Vercel واضغط **Verify**.

## SSL و Auto Deploy
- SSL يتفعّل تلقائيًا بعد اكتمال التحقق من الدومين.
- Auto Deploy يتفعّل تلقائيًا عند ربط GitHub (كل Push يعمل نشر جديد).
