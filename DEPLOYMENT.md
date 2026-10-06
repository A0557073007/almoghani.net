# نشر ALMOGHANI API وقاعدة البيانات

## الخيار الأول: Docker Compose محليًا

المتطلبات: Docker وDocker Compose.

```bash
cp .env.example .env
# عدّل الأسرار في docker-compose.yml قبل بيئة مشتركة

docker compose up -d --build
curl http://localhost:4000/health
```

يتم تشغيل PostgreSQL تلقائيًا وتطبيق `db/schema.sql` عند إنشاء volume لأول مرة.

لإيقاف الخدمات مع الاحتفاظ بالبيانات:

```bash
docker compose down
```

لإعادة تهيئة قاعدة البيانات من الصفر (يحذف البيانات):

```bash
docker compose down -v
docker compose up -d --build
```

## الخيار الثاني: Render

يستخدم Render خدمة Web Service للخادم وقاعدة Render PostgreSQL مُدارة. لا تستخدم قاعدة PostgreSQL داخل حاوية Render للإنتاج، لأن نظام ملفات الخدمة ليس مكانًا دائمًا للبيانات.

### خطوات النشر

1. ارفع مجلد المشروع إلى GitHub.
2. من Render اختر **New → Blueprint**.
3. اربط مستودع GitHub واختر `render.yaml`.
4. وافق على إنشاء:
   - `almoghani-api` كـ Docker Web Service.
   - `almoghani-db` كقاعدة PostgreSQL مُدارة.
5. عند طلب قيمة `CORS_ORIGIN`، ضع رابط الواجهة الأمامية، مثل:

```text
https://your-frontend.example.com
```

6. انتظر نجاح بناء الخدمة.
7. طبّق المخطط مرة واحدة على قاعدة Render. من جهاز يملك `psql`:

```bash
export DATABASE_URL='ضع_رابط_قاعدة_Render_هنا'
psql "$DATABASE_URL" -f db/schema.sql
```

يمكن الحصول على رابط الاتصال من إعدادات قاعدة البيانات في Render. لا تضعه في GitHub ولا ترسله إلى المتصفح.

8. تحقّق من:

```bash
curl https://YOUR-RENDER-SERVICE.onrender.com/health
```

### ملاحظات مهمة عن Render وSocket.io

- WebSocket/Socket.io يعمل على Render Web Service.
- يجب أن يتصل العميل بالرابط `https://YOUR-RENDER-SERVICE.onrender.com`؛ Socket.io يختار النقل الآمن تلقائيًا.
- الخدمة المجانية قد تدخل في وضع السكون، لذلك قد يحدث تأخر عند أول طلب وإعادة اتصال للعملاء.
- عند تشغيل أكثر من نسخة API، الذاكرة المحلية للغرف لا تكفي. أضف Redis Adapter واستخدم Redis مُدارًا لمزامنة Socket.io بين النسخ.
- لا تُخزّن ملفات المستخدمين أو الفيديوهات داخل حاوية Render. استخدم S3 أو Cloudflare R2 أو خدمة تخزين مشابهة.
- ضع `CORS_ORIGIN` على النطاق الحقيقي للواجهة فقط، وليس `*` في الإنتاج.

## متغيرات الإنتاج

```text
NODE_ENV=production
PORT=4000
DATABASE_URL=<managed PostgreSQL connection string>
CORS_ORIGIN=https://your-frontend.example.com
DB_POOL_MAX=10
```

## ترقية الخادم إلى Redis عند التوسع

```bash
npm install @socket.io/redis-adapter redis
```

بعدها يُنشأ Redis publisher/subscriber في `src/server.js` قبل استخدام Socket.io. يجب أن تستخدم كل نسخ API نفس Redis ونفس إعدادات CORS والمصادقة.

## الأمان قبل الإنتاج

- أضف JWT أو جلسات موثوقة لمسارات POST وPATCH وDELETE.
- لا ترجع `stream_key_hash` في أي استجابة عامة.
- استخدم كلمات مرور قوية وقم بتدويرها.
- فعّل نسخًا احتياطية لقاعدة البيانات.
- أضف rate limiting وقيودًا على عدد اتصالات Socket.io.
- راقب سجلات التطبيق وقاعدة البيانات.
