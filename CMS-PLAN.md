# وجين — خطة بناء نظام إدارة المحتوى (CMS)

> **ملف مواصفات تنفيذي.** اقرأه بالكامل قبل كتابة أي سطر كود.
> الباك إند: **Django + DRF** · الداش بورد: **Next.js** داخل نفس التطبيق الحالي.
>
> **تاريخ الإعداد:** 2026-09-01 · **الحالة:** جاهز للتنفيذ

---

## المحتويات

1. [الوضع الحالي — ما تم فحصه فعلياً](#1-الوضع-الحالي)
2. [الفكرة المعمارية المحورية](#2-الفكرة-المعمارية-المحورية)
3. [المعمارية العامة](#3-المعمارية-العامة)
4. [الباك إند — Django](#4-الباك-إند--django)
5. [نموذج البيانات الكامل](#5-نموذج-البيانات-الكامل)
6. [نظام المسودة والنشر](#6-نظام-المسودة-والنشر)
7. [واجهة الـ API](#7-واجهة-الـ-api)
8. [ربط الموقع بالـ API](#8-ربط-الموقع-بالـ-api)
9. [الداش بورد — Next.js](#9-الداش-بورد--nextjs)
10. [نظام المعاينة الحية](#10-نظام-المعاينة-الحية-★-جوهر-المشروع)
11. [نظام تصميم الداش بورد](#11-نظام-تصميم-الداش-بورد)
12. [الصلاحيات والأمان](#12-الصلاحيات-والأمان)
13. [إدارة الوسائط](#13-إدارة-الوسائط)
14. [خطة التنفيذ بالمراحل](#14-خطة-التنفيذ-بالمراحل)
15. [قواعد إلزامية](#15-قواعد-إلزامية-غير-قابلة-للتفاوض)
16. [معايير القبول](#16-معايير-القبول)
17. [ملحق: الأخطاء المستفادة](#17-ملحق-الأخطاء-المستفادة-من-مشروع-سابق)

---

## 1. الوضع الحالي

**تم فحص المشروع فعلياً. هذه حقائق لا افتراضات:**

### الاستاك القائم

| العنصر | الإصدار |
|---|---|
| Next.js | 16.3.3 (App Router) |
| React | 19.2.8 |
| TypeScript | ^5 |
| Tailwind CSS | v4 (عبر `@tailwindcss/postcss`) |
| next-intl | ^4.13.7 — مسارات `/en` و `/ar`، `localePrefix: "always"` |
| Framer Motion | ^13.1.1 |
| GSAP | ^3.15.0 (+ Flip) |
| Lenis | ^1.3.26 (smooth scroll) |
| Swiper | ^14.2.0 |
| three + @react-three/fiber + drei | 3D |
| react-hook-form + zod | ✅ **موجودان بالفعل — سنعيد استخدامهما في الداش بورد** |
| Resend | إرسال البريد |
| الاستضافة | Vercel (مجلد `.vercel` موجود) |

### بنية المحتوى الحالية

كل المحتوى ثابت في ملفين:

```
src/messages/en.json   →  44,972 بايت
src/messages/ar.json   →  56,690 بايت
```

الكميات الحقيقية داخلهما:

| الكيان | العدد | المفاتيح |
|---|---|---|
| المشاريع | **32** | `city, category, title, location, value, year, manpower, equipment, image` |
| العملاء | **22** | `label, category, code, logo` |
| الخدمات | **11** | `title, desc` |
| المعدات | **14** نوع | `label, count` |
| التخصصات (trades) | **11** | `label, count` |
| الشهادات | **7** | `title, desc` |
| المكاتب | **5** | `city, address, phone, contact, email, mobile` |
| أقسام الهيكل التنظيمي | **10** | `title, desc` |
| الجوائز | **4** | `year, title, org` |
| الإحصائيات | **4** | `value, suffix, label, body` |
| المحطات الزمنية | **4** | `year, title, desc` |
| شرائح الهيرو | **3** | `line1, highlight, line2` |
| القطاعات | **3** | `key, title, summary, capabilities, stat` |
| آراء العملاء | **2** | `quote, role` |

### مكوّنات السكاشن

```
src/components/sections/   →  35 مكوّناً
```

**33 منها تستدعي `useTranslations()` أو `getTranslations()` مباشرة.**
واحد فقط (`PillarGrid`) يستقبل المحتوى عبر props.

> ⚠️ **هذه أهم معلومة في الملف كله.** اقرأ القسم التالي.

### نظام التصميم القائم (`src/app/globals.css`)

```css
--color-primary:      #0f155f    /* كحلي وجين */
--color-primary-hover:#090d3d
--color-off-white:    #f7f8fc
--color-gray-muted:   #585f6b
--color-heading:      #0f155f
--radius-ui:          0.75rem    /* البطاقات والحاويات */
--radius-frame:       1.25rem    /* الإطارات الكبيرة */
--font-sans:          var(--font-cairo)
--header-h:           88px
```

سلّم الخطوط: `t-display` … `t-eyebrow` — **وزن واحد لكل فئة، ممنوع إضافة `font-*` فوقها.**

### المطلوب حسب `TODO-BACKEND.md`

> «محتوى ديناميكي / CMS — 32 مشروع و22 عميل و11 خدمة و7 شهادات كلهم في
> `src/messages/{en,ar}.json`. أي تحديث محتاج deploy. **القرار المطلوب:
> CMS جاهز (Sanity / Contentful) ولا داش بورد مخصص؟**»

**القرار المتخذ في هذا الملف: داش بورد مخصص، Django + Next.js.**

---

## 2. الفكرة المعمارية المحورية

### الاكتشاف

بما أن **33 سكشن يقرأ محتواه من سياق next-intl** وليس من props، فإن:

```
تغيير مصدر الرسائل في src/i18n/request.ts من ملف JSON إلى الـ API
  ⟹  الموقع كله يصبح ديناميكياً
  ⟹  بصفر تعديل على الـ 33 مكوّناً
```

وبنفس المنطق، المعاينة الحية تصبح:

```tsx
<NextIntlClientProvider locale={locale} messages={draftMessages}>
  <Hero />          {/* ← المكوّن الحقيقي. نفس الملف. نفس الـ CSS. */}
</NextIntlClientProvider>
```

### لماذا هذا مهم جداً

| النهج التقليدي | نهج وجين |
|---|---|
| إعادة بناء شكل السكشن يدوياً داخل الداش بورد | استدعاء المكوّن الحقيقي |
| ~200 سطر HTML مكرر لكل سكشن | **0 سطر** |
| المعاينة تتعفّن كلما تغيّر التصميم | مستحيل أن تختلف |
| تحديث عبر الشبكة (debounce ~400ms) | **فوري — إعادة رندر React على كل حرف** |
| تغطية جزئية | كل السكاشن مجاناً |

**الشرط الوحيد لنجاح هذا:** أن يبقى العقد قائماً — كل سكشن يقرأ محتواه من
next-intl فقط. أي سكشن يقرأ من `fetch` داخلي أو ملف مستورد يكسر المعاينة.
(انظر [القواعد الإلزامية](#15-قواعد-إلزامية-غير-قابلة-للتفاوض)، القاعدة #1.)

---

## 3. المعمارية العامة

```
┌─────────────────────────────────────────────────────────────────┐
│  Django + DRF  (Railway / Fly.io / VPS)                         │
│                                                                 │
│   ├── PostgreSQL          ← البيانات المهيكلة                   │
│   ├── Cloudflare R2 / S3  ← الصور والملفات                      │
│   ├── ContentAssembler    ← يبني JSON بنفس شكل messages/*.json  │
│   └── DRF API                                                   │
│         GET  /api/v1/content/{locale}/published/   ← عام، مخبأ  │
│         GET  /api/v1/content/{locale}/draft/       ← بمصادقة     │
│         CRUD /api/v1/admin/**                      ← بمصادقة     │
└────────────┬────────────────────────────────────┬───────────────┘
             │                                    │
   published │ (ISR + revalidateTag)         draft│ (no-store)
             ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  تطبيق Next.js واحد  (Vercel)  ← المستودع الحالي                │
│                                                                 │
│  src/app/[locale]/…        ← الموقع العام (كما هو)              │
│  src/app/(studio)/…        ← الداش بورد الجديد  /studio         │
│  src/app/[locale]/__preview/[section]/  ← مسار المعاينة         │
│  src/components/sections/  ← ★ مشترك بين الاثنين ★              │
└─────────────────────────────────────────────────────────────────┘
```

### قرار: تطبيق Next.js واحد وليس اثنين

**السبب الحاسم:** المعاينة تستورد مكوّنات السكاشن الحقيقية مباشرة.
لو فصلنا الداش بورد في مستودع منفصل لاحتجنا حزمة npm مشتركة، ومعها
مزامنة نسخ و CSS و tokens وخطوط — تعقيد بلا مقابل.

**العزل مضمون رغم ذلك:**
- `(studio)` هي route group → لا تظهر في الـ URL ولا تُحمَّل مع الموقع العام
- code-splitting تلقائي → صفر أثر على حجم حزمة الموقع
- `robots.ts` يمنع الفهرسة + `middleware` يحمي المسار
- المعاينة داخل `<iframe>` → عزل CSS كامل بين Tailwind الموقع والداش بورد

---

## 4. الباك إند — Django

### الإصدارات

```
Python 3.12
Django 5.1
djangorestframework 3.15
djangorestframework-simplejwt 5.3
django-cors-headers
django-filter
Pillow
psycopg[binary]
django-storages[s3]      # Cloudflare R2
python-decouple          # متغيرات البيئة
```

### هيكل المشروع

```
wjeen-backend/
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── dev.py
│   │   └── prod.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── content/          # كل نماذج المحتوى
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── base.py        # BilingualModel, OrderedModel, TimeStamped
│   │   │   ├── sections.py    # نصوص السكاشن
│   │   │   ├── projects.py
│   │   │   ├── company.py     # عملاء، جوائز، شهادات، مكاتب…
│   │   │   └── careers.py
│   │   ├── serializers/
│   │   ├── views/
│   │   ├── assembler.py       # ★ يبني شكل messages JSON
│   │   └── admin.py
│   ├── media_library/
│   ├── accounts/         # المستخدمون والأدوار والصلاحيات
│   ├── submissions/      # رسائل التواصل + طلبات التوظيف
│   ├── publishing/       # المسودات والنسخ والنشر
│   └── activity/         # سجل النشاط
└── manage.py
```

### النماذج الأساسية (`apps/content/models/base.py`)

```python
class TimeStamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL,
                                   related_name="+")
    updated_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL,
                                   related_name="+")
    class Meta:
        abstract = True


class Ordered(models.Model):
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_visible = models.BooleanField(default=True)
    class Meta:
        abstract = True
        ordering = ["order", "pk"]


class Bilingual(models.Model):
    """كل حقل نصّي له نسختان. الـ serializer يختار حسب اللغة."""
    class Meta:
        abstract = True

    def t(self, field: str, locale: str) -> str:
        """يرجع النسخة المطلوبة، ويسقط للإنجليزية لو العربية فاضية."""
        val = getattr(self, f"{field}_{locale}", "")
        return val or getattr(self, f"{field}_en", "")
```

**قرار الثنائية اللغوية:** حقول صريحة بلاحقة `_en` / `_ar`
(وليس `django-modeltranslation`).

**لماذا:** التعيين إلى واجهة التحرير ذات التبويبين (EN | AR) يصبح مباشراً
1:1، والاستعلامات صريحة، والهجرات مقروءة. المكتبة تضيف سحراً لا نحتاجه
في لغتين فقط.

---

## 5. نموذج البيانات الكامل

> مشتق حرفياً من بنية `src/messages/en.json` بعد فحصها.

### 5.1 نصوص السكاشن (العناوين الثابتة)

كل سكشن في الموقع له ثلاثي `tag / title / description`. نمذجها في جدول واحد:

```python
class Section(TimeStamped):
    """السطور الثابتة لكل سكشن: الوسم والعنوان والوصف."""
    key  = models.SlugField(unique=True)   # "hero", "stats", "clients"…
    page = models.CharField(max_length=32, choices=PAGE_CHOICES)

    tag_en = models.CharField(max_length=120, blank=True)
    tag_ar = models.CharField(max_length=120, blank=True)
    title_en = models.CharField(max_length=300, blank=True)
    title_ar = models.CharField(max_length=300, blank=True)
    description_en = models.TextField(blank=True)
    description_ar = models.TextField(blank=True)

    extra = models.JSONField(default=dict, blank=True)
    # للمفاتيح المتفرّقة: cta, viewAll, statusLabel, unitsLabel…

    is_visible = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
```

**السكاشن المطلوب زرعها (seed):**

```
home:      hero · stats · clients · aboutPreview · presence ·
           servicesShowcase · gallery · careersPreview · sustainability ·
           ticker · cta
about:     aboutPage · president · story · mission · values · quality ·
           leadership · governance · awards · orgChart
business:  businessPage · sectors · process · servicesList · resources ·
           hse · certificates
projects:  projectsPage
contact:   contactPage · contactInfo · location
careers:   careersPage · careerValues · benefits · positions · careersCta
global:    nav · footer · meta · notFound
```

### 5.2 المشاريع

```python
class Project(TimeStamped, Ordered):
    title_en    = models.CharField(max_length=300)
    title_ar    = models.CharField(max_length=300)
    slug        = models.SlugField(unique=True, blank=True)

    category    = models.ForeignKey("ProjectCategory", on_delete=models.PROTECT,
                                    related_name="projects")
    city_en     = models.CharField(max_length=120)
    city_ar     = models.CharField(max_length=120)
    location_en = models.CharField(max_length=300, blank=True)
    location_ar = models.CharField(max_length=300, blank=True)

    value       = models.CharField(max_length=60, blank=True)   # نص لا رقم
    year        = models.CharField(max_length=20, blank=True)
    manpower    = models.PositiveIntegerField(null=True, blank=True)
    equipment   = models.PositiveIntegerField(null=True, blank=True)

    image       = models.ForeignKey("media_library.MediaAsset", null=True,
                                    blank=True, on_delete=models.SET_NULL,
                                    related_name="+")
    gallery     = models.ManyToManyField("media_library.MediaAsset", blank=True,
                                         related_name="project_galleries")

    body_en     = models.TextField(blank=True)   # لصفحة التفاصيل المستقبلية
    body_ar     = models.TextField(blank=True)
    is_featured = models.BooleanField(default=False)


class ProjectCategory(Ordered):
    key      = models.SlugField(unique=True)
    label_en = models.CharField(max_length=120)
    label_ar = models.CharField(max_length=120)
```

> **تحذير من `TODO-BACKEND.md` — احترمه:**
> «10 فقط من الـ32 عندها صورة موثّقة؛ أي صور إضافية لازم تيجي **مربوطة
> باسم مشروعها** عشان ما يتكررش خطأ ربط صورة بمشروع غلط.»
> ⟹ حقل `image` يظل `null` افتراضياً. الداش بورد يعرض تحذيراً واضحاً
> عند ربط صورة، ولا يقترح صوراً تلقائياً أبداً.

### 5.3 كيانات الشركة

```python
class Client(Ordered):
    label_en = models.CharField(max_length=200)
    label_ar = models.CharField(max_length=200)
    code     = models.CharField(max_length=20, blank=True)
    category = models.CharField(max_length=60, blank=True)
    logo     = models.ForeignKey("media_library.MediaAsset", null=True,
                                 blank=True, on_delete=models.SET_NULL,
                                 related_name="+")


class Service(Ordered):
    title_en = models.CharField(max_length=200)
    title_ar = models.CharField(max_length=200)
    desc_en  = models.TextField(blank=True)
    desc_ar  = models.TextField(blank=True)
    icon     = models.CharField(max_length=60, blank=True)


class Certificate(Ordered):
    title_en = models.CharField(max_length=200)
    title_ar = models.CharField(max_length=200)
    desc_en  = models.TextField(blank=True)
    desc_ar  = models.TextField(blank=True)
    document = models.ForeignKey("media_library.MediaAsset", null=True,
                                 blank=True, on_delete=models.SET_NULL,
                                 related_name="+")
    issued_at  = models.DateField(null=True, blank=True)
    expires_at = models.DateField(null=True, blank=True)
    # ← الداش بورد ينبّه قبل انتهاء الصلاحية بـ 60 يوماً


class Award(Ordered):
    year     = models.CharField(max_length=20)
    title_en = models.CharField(max_length=200)
    title_ar = models.CharField(max_length=200)
    org_en   = models.CharField(max_length=200, blank=True)
    org_ar   = models.CharField(max_length=200, blank=True)


class Office(Ordered):
    city_en    = models.CharField(max_length=120)
    city_ar    = models.CharField(max_length=120)
    address_en = models.TextField(blank=True)
    address_ar = models.TextField(blank=True)
    phone   = models.CharField(max_length=60, blank=True)
    mobile  = models.CharField(max_length=60, blank=True)
    email   = models.EmailField(blank=True)
    contact_en = models.CharField(max_length=200, blank=True)
    contact_ar = models.CharField(max_length=200, blank=True)
    map_url = models.URLField(blank=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)


class Testimonial(Ordered):
    quote_en = models.TextField()
    quote_ar = models.TextField()
    role_en  = models.CharField(max_length=200, blank=True)
    role_ar  = models.CharField(max_length=200, blank=True)
    author   = models.CharField(max_length=200, blank=True)
    avatar   = models.ForeignKey("media_library.MediaAsset", null=True,
                                 blank=True, on_delete=models.SET_NULL,
                                 related_name="+")


class StatItem(Ordered):
    section = models.ForeignKey(Section, on_delete=models.CASCADE,
                                related_name="stats")
    value  = models.CharField(max_length=20)
    suffix = models.CharField(max_length=10, blank=True)
    label_en = models.CharField(max_length=120)
    label_ar = models.CharField(max_length=120)
    body_en  = models.TextField(blank=True)
    body_ar  = models.TextField(blank=True)


class Milestone(Ordered):
    year = models.CharField(max_length=20)
    title_en = models.CharField(max_length=200)
    title_ar = models.CharField(max_length=200)
    desc_en  = models.TextField(blank=True)
    desc_ar  = models.TextField(blank=True)


class Pillar(Ordered):
    """عنصر عام لأي شبكة عناوين+وصف: القيم، الاستدامة، HSE، المزايا…"""
    section  = models.ForeignKey(Section, on_delete=models.CASCADE,
                                 related_name="pillars")
    title_en = models.CharField(max_length=200)
    title_ar = models.CharField(max_length=200)
    desc_en  = models.TextField(blank=True)
    desc_ar  = models.TextField(blank=True)
    icon     = models.CharField(max_length=60, blank=True)


class ResourceItem(Ordered):
    """التخصصات (11) والمعدات (14)."""
    KIND = [("trade", "Trade"), ("equipment", "Equipment")]
    kind = models.CharField(max_length=12, choices=KIND, db_index=True)
    label_en = models.CharField(max_length=200)
    label_ar = models.CharField(max_length=200)
    count = models.PositiveIntegerField(default=0)


class Department(Ordered):
    """أقسام الهيكل التنظيمي (10)."""
    title_en = models.CharField(max_length=200)
    title_ar = models.CharField(max_length=200)
    desc_en  = models.TextField(blank=True)
    desc_ar  = models.TextField(blank=True)
    parent   = models.ForeignKey("self", null=True, blank=True,
                                 on_delete=models.SET_NULL, related_name="children")


class Sector(Ordered):
    key = models.SlugField()
    title_en = models.CharField(max_length=200)
    title_ar = models.CharField(max_length=200)
    summary_en = models.TextField(blank=True)
    summary_ar = models.TextField(blank=True)
    capabilities_en = models.JSONField(default=list)   # قائمة نصوص
    capabilities_ar = models.JSONField(default=list)
    stat_value = models.CharField(max_length=40, blank=True)
    stat_label_en = models.CharField(max_length=120, blank=True)
    stat_label_ar = models.CharField(max_length=120, blank=True)


class HeroSlide(Ordered):
    line1_en = models.CharField(max_length=200)
    line1_ar = models.CharField(max_length=200)
    highlight_en = models.CharField(max_length=200, blank=True)
    highlight_ar = models.CharField(max_length=200, blank=True)
    line2_en = models.CharField(max_length=200, blank=True)
    line2_ar = models.CharField(max_length=200, blank=True)
    image = models.ForeignKey("media_library.MediaAsset", null=True, blank=True,
                             on_delete=models.SET_NULL, related_name="+")


class JobPosition(TimeStamped, Ordered):
    title_en = models.CharField(max_length=200)
    title_ar = models.CharField(max_length=200)
    department = models.CharField(max_length=120, blank=True)
    location_en = models.CharField(max_length=200, blank=True)
    location_ar = models.CharField(max_length=200, blank=True)
    type = models.CharField(max_length=40, blank=True)   # دوام كامل…
    description_en = models.TextField(blank=True)
    description_ar = models.TextField(blank=True)
    is_open = models.BooleanField(default=True)
    closes_at = models.DateField(null=True, blank=True)
```

### 5.4 النماذج الواردة

```python
class ContactSubmission(models.Model):
    name, email, phone, company, subject, message
    locale      = models.CharField(max_length=5)
    status      = models.CharField(choices=["new","read","replied","archived"])
    ip_address  = models.GenericIPAddressField(null=True)
    user_agent  = models.CharField(max_length=300, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)


class JobApplication(models.Model):
    position = models.ForeignKey(JobPosition, null=True, on_delete=models.SET_NULL)
    name, email, phone
    cv      = models.FileField(upload_to="applications/")
    note    = models.TextField(blank=True)
    status  = models.CharField(choices=["new","reviewing","shortlisted",
                                        "rejected","hired"])
    created_at = models.DateTimeField(auto_now_add=True)
```

> `POST /api/contact` الحالي في Next.js يبقى كما هو (Resend + rate limit +
> honeypot) ويُضاف إليه استدعاء واحد يخزّن النسخة في Django.
> **لا تحذف منطق الإيميل الحالي.**

---

## 6. نظام المسودة والنشر

### التصميم

```
جداول المحتوى (الحالة الحيّة)  ──►  = المسودة دائماً
        │
        │  عند الضغط على "نشر"
        ▼
ContentVersion  (لقطة JSON كاملة لكل لغة)
        │
        ▼
الموقع العام يقرأ آخر نسخة is_live=True فقط
```

```python
class ContentVersion(models.Model):
    number      = models.PositiveIntegerField(unique=True)
    payload_en  = models.JSONField()      # شكل messages/en.json كاملاً
    payload_ar  = models.JSONField()
    checksum    = models.CharField(max_length=64)   # sha256 لكشف "لا تغيير"
    note        = models.CharField(max_length=300, blank=True)
    is_live     = models.BooleanField(default=False, db_index=True)
    published_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    published_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-number"]
```

### لماذا لقطة كاملة وليس تتبّع الفروق

1. **قراءة الموقع = صف واحد.** لا joins، لا N+1 — استعلام واحد لكل لغة.
2. **التراجع فوري وذرّي.** `is_live` تنتقل لنسخة أقدم = الموقع رجع خلال ثوانٍ.
3. **المسودة لا تسرّب أبداً.** الموقع لا يرى الجداول الحيّة إطلاقاً.
4. **الحجم لا يُذكر.** ~100 كيلوبايت للنسخة؛ 1000 نسخة = 100 ميجابايت.

### تدفق النشر

```python
@transaction.atomic
def publish(user, note=""):
    payload_en = ContentAssembler("en").build()
    payload_ar = ContentAssembler("ar").build()
    checksum = sha256(json.dumps([payload_en, payload_ar],
                                 sort_keys=True).encode()).hexdigest()

    latest = ContentVersion.objects.filter(is_live=True).first()
    if latest and latest.checksum == checksum:
        raise NoChangesToPublish        # لا تُنشئ نسخة فارغة

    ContentVersion.objects.filter(is_live=True).update(is_live=False)
    version = ContentVersion.objects.create(
        number=(ContentVersion.objects.aggregate(Max("number"))["number__max"] or 0) + 1,
        payload_en=payload_en, payload_ar=payload_ar,
        checksum=checksum, note=note, is_live=True, published_by=user,
    )
    trigger_revalidate()   # webhook إلى Next.js
    log_activity(user, "publish", version=version.number)
    return version
```

### إعادة التحقق في Next.js

```ts
// src/app/api/revalidate/route.ts
export async function POST(req: Request) {
  const secret = req.headers.get("x-revalidate-secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  revalidateTag("wjeen-content");
  return Response.json({ revalidated: true, now: Date.now() });
}
```

### الاحتفاظ

آخر **50 نسخة** تبقى كاملة. الأقدم يُحتفظ بها بلا `payload` (بيانات وصفية فقط).

---

## 7. واجهة الـ API

### عام (بلا مصادقة)

```
GET /api/v1/content/{locale}/
    ← payload النسخة الحيّة. Cache-Control: public, s-maxage=31536000
    ← ETag = checksum
    ← يُستهلك من طبقة ISR في Next.js فقط، لا من المتصفح
```

### المعاينة (بمصادقة)

```
GET /api/v1/content/{locale}/draft/
    ← الحالة الحيّة للجداول مجمّعة الآن. Cache-Control: no-store
```

### الإدارة (بمصادقة)

```
GET    /api/v1/admin/projects/            ?search= &category= &ordering= &page=
POST   /api/v1/admin/projects/
GET    /api/v1/admin/projects/{id}/
PATCH  /api/v1/admin/projects/{id}/
DELETE /api/v1/admin/projects/{id}/
POST   /api/v1/admin/projects/reorder/    {"ids": [5, 2, 9, …]}
POST   /api/v1/admin/projects/bulk/       {"action": "hide", "ids": […]}

… ونفس النمط لكل كيان:
   clients · services · certificates · awards · offices · testimonials
   stats · milestones · pillars · resource-items · departments · sectors
   hero-slides · positions · sections

POST   /api/v1/admin/preview/             ← ★ انظر القسم 10
POST   /api/v1/admin/publish/             {"note": "…"}
GET    /api/v1/admin/versions/
POST   /api/v1/admin/versions/{n}/rollback/
GET    /api/v1/admin/diff/                ← الفرق بين المسودة والمنشور

GET    /api/v1/admin/media/               ?category= &search=
POST   /api/v1/admin/media/
DELETE /api/v1/admin/media/{id}/          ← يُرفض لو مستخدَم؛ يذكر أين

GET    /api/v1/admin/submissions/contact/
GET    /api/v1/admin/submissions/applications/
GET    /api/v1/admin/activity/
GET    /api/v1/admin/dashboard/           ← إحصاءات الصفحة الرئيسية
```

### المصادقة

```
POST /api/v1/auth/login/     {email, password} → يضبط كوكيز httpOnly
POST /api/v1/auth/refresh/
POST /api/v1/auth/logout/
GET  /api/v1/auth/me/        → {id, name, email, role, permissions[]}
```

**SimpleJWT** — التوكن في كوكيز `httpOnly` + `Secure` + `SameSite=Lax`
تضبطها route handler في Next.js يعمل كوسيط. **ممنوع تخزين التوكن في
`localStorage`** (عرضة لـ XSS).

عمر التوكن: access **15 دقيقة** · refresh **7 أيام** مع تدوير وقائمة سوداء.

### مواصفة الاستجابة

```jsonc
// نجاح — قائمة
{ "count": 32, "next": "…?page=2", "previous": null, "results": [ … ] }

// خطأ تحقّق  (422)
{ "detail": "Validation failed",
  "errors": { "title_ar": ["هذا الحقل مطلوب."] } }

// خطأ عام  (4xx/5xx)
{ "detail": "رسالة مقروءة للإنسان", "code": "media_in_use" }
```

---

## 8. ربط الموقع بالـ API

### التغيير الوحيد المطلوب في الموقع العام

```ts
// src/i18n/request.ts   ← الملف كله بعد التعديل

import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { getPublishedMessages } from "@/lib/content";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return { locale, messages: await getPublishedMessages(locale) };
});
```

```ts
// src/lib/content.ts   ← ملف جديد

import "server-only";
import type { Locale } from "@/i18n/routing";

const API = process.env.CMS_API_URL!;

export async function getPublishedMessages(locale: Locale) {
  try {
    const res = await fetch(`${API}/api/v1/content/${locale}/`, {
      next: { tags: ["wjeen-content"], revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`CMS ${res.status}`);
    return await res.json();
  } catch (err) {
    // شبكة الأمان: الموقع لا يسقط أبداً بسبب الـ CMS.
    console.error("[cms] fallback to bundled messages:", err);
    return (await import(`../messages/${locale}.json`)).default;
  }
}
```

### شبكة الأمان — إلزامية

ملفا `src/messages/{en,ar}.json` **يبقيان في المستودع** كنسخة احتياطية.
عند كل نشر ناجح، مهمة CI تكتب فوقهما بالـ payload الجديد وتعمل commit.
النتيجة: لو سقط الباك إند بالكامل، الموقع يظل يعمل بآخر محتوى منشور.

> بدون هذه الشبكة، عطل في الـ CMS = سقوط موقع الشركة. غير مقبول.

### تعديلات أخرى مطلوبة

| الملف | التغيير |
|---|---|
| `src/app/[locale]/page.tsx` وأخواتها | إخفاء السكشن لو `is_visible = false` |
| `src/components/sections/ProjectsGrid.tsx` | يقرأ الصور من روابط الـ CDN بدل `/public` |
| `next.config.ts` | إضافة نطاق R2 إلى `images.remotePatterns` |
| `src/app/api/contact/route.ts` | يخزّن نسخة في Django بعد إرسال الإيميل |
| `src/app/robots.ts` | `disallow: ["/studio", "/*/__preview"]` |
| جديد: `src/middleware.ts` | حماية `/studio` |

> ⚠️ **انتبه للتحذير الموجود في `TODO-BACKEND.md`:** Next يخبّئ الصور
> المحسّنة حسب `(url, width, quality)`. **أي صورة جديدة لازم تأخذ اسماً
> جديداً** — لذلك `MediaAsset` يولّد اسم ملف يتضمن hash المحتوى.

---

## 9. الداش بورد — Next.js

### الحزم المضافة

```jsonc
{
  "@tanstack/react-query": "^5",      // حالة الخادم والتخبئة
  "@radix-ui/react-*":     "…",       // عبر shadcn/ui
  "class-variance-authority": "^0.7",
  "tailwind-merge":        "^2",
  "lucide-react":          "^0.4",    // الأيقونات
  "@dnd-kit/core":         "^6",      // السحب والإفلات
  "@dnd-kit/sortable":     "^8",
  "@tiptap/react":         "^2",      // محرر النصوص الغنية
  "@tiptap/starter-kit":   "^2",
  "sonner":                "^1",      // التنبيهات
  "next-themes":           "^0",      // الوضع الليلي
  "recharts":              "^2",      // الرسوم البيانية
  "date-fns":              "^3"
}
```

> `react-hook-form` · `zod` · `@hookform/resolvers` · `framer-motion`
> **موجودة بالفعل** في المشروع — أعد استخدامها ولا تضف بديلاً.

### البنية

```
src/app/(studio)/
├── layout.tsx                  # الشل: sidebar + topbar + providers
├── login/page.tsx
├── page.tsx                    # لوحة النظرة العامة
├── content/
│   ├── [page]/page.tsx         # محرر صفحة + معاينة  ← الشاشة الرئيسية
│   └── layout.tsx
├── projects/
│   ├── page.tsx                # قائمة (جدول/بطاقات + بحث + فلترة + ترتيب)
│   └── [id]/page.tsx           # محرر + معاينة
├── clients/ · services/ · certificates/ · awards/ ·
├── offices/ · testimonials/ · resources/ · org-chart/ ·
├── careers/positions/ · careers/applications/
├── media/page.tsx              # مكتبة الوسائط
├── inbox/page.tsx              # رسائل التواصل
├── versions/page.tsx           # سجل النشر + التراجع
├── activity/page.tsx
├── settings/page.tsx
└── users/page.tsx

src/components/studio/
├── ui/                         # shadcn: button, input, dialog, table…
├── shell/                      # Sidebar, Topbar, CommandPalette
├── forms/                      # Field, BilingualField, ImagePicker,
│                               #   RichText, RepeaterField
├── preview/                    # ★ PreviewPane, PreviewFrame, DeviceBar
├── data/                       # DataTable, SortableList, EmptyState
└── feedback/                   # Toast, ConfirmDialog, UnsavedGuard

src/lib/studio/
├── api.ts                      # عميل fetch مع تحديث التوكن
├── queries.ts                  # خطافات TanStack Query
├── schemas.ts                  # مخططات zod (تعكس تحقّق Django)
└── permissions.ts
```

### الشاشة الرئيسية — محرر المحتوى

```
┌───────────────────────────────────────────────────────────────────────┐
│ ▓ وجين            الصفحة الرئيسية              🔍 ⌘K   🔔  🌙   [أحمد ▾] │
├──────────────┬────────────────────────────────────────────────────────┤
│              │  ┌─────────────────────┐ ┌──────────────────────────┐ │
│ ◈ نظرة عامة  │  │ سكاشن الصفحة        │ │ 📱 💻 🖥️   🌐 ع | EN   ⟳ │ │
│              │  │                     │ ├──────────────────────────┤ │
│ ▸ المحتوى    │  │ ⠿ الهيرو        ●   │ │                          │ │
│   الرئيسية ✓ │  │ ⠿ الإحصائيات    ●   │ │                          │ │
│   من نحن     │  │ ⠿ العملاء       ●   │ │    ┃ المعاينة الحية ┃    │ │
│   الأعمال    │  │ ⠿ نبذة عنّا     ●   │ │    ┃  iframe يعرض   ┃    │ │
│   المشاريع   │  │ ⠿ التواجد       ○   │ │    ┃ المكوّن الحقيقي ┃    │ │
│   التواصل    │  │ ⠿ الخدمات       ●   │ │    ┃                ┃    │ │
│   الوظائف    │  └─────────────────────┘ │    ┃  تتحدّث فوراً   ┃    │ │
│              │  ┌─────────────────────┐ │    ┃  مع كل حرف     ┃    │ │
│ ▸ الكيانات   │  │ تحرير: الهيرو       │ │    ┃                ┃    │ │
│   المشاريع   │  │ ┌─────┬─────┐       │ │                          │ │
│   العملاء    │  │ │ ع ✓ │ EN  │       │ │                          │ │
│   الخدمات    │  │ └─────┴─────┘       │ │                          │ │
│   الشهادات   │  │ الوسم   [_________] │ │                          │ │
│   المكاتب    │  │ العنوان [_________] │ │                          │ │
│              │  │ الوصف   [_________] │ │                          │ │
│ ▸ الوسائط    │  │                     │ │                          │ │
│ ▸ الوارد  ③  │  │ الشرائح (3)   + جديد│ │                          │ │
│ ▸ النشر      │  │  ⠿ شريحة ١   ✎ 🗑  │ │                          │ │
│ ▸ الإعدادات  │  │  ⠿ شريحة ٢   ✎ 🗑  │ │                          │ │
│              │  └─────────────────────┘ └──────────────────────────┘ │
├──────────────┴────────────────────────────────────────────────────────┤
│  ● 3 تغييرات غير منشورة    [عرض الفروقات]  [حفظ مسودة]  [نشر ↑]      │
└───────────────────────────────────────────────────────────────────────┘
```

### مكوّنات لا بد منها

| المكوّن | السلوك |
|---|---|
| `BilingualField` | تبويبان ع/EN، مؤشر «فارغ» أحمر على التبويب الناقص، اتجاه RTL/LTR تلقائي داخل الحقل |
| `RepeaterField` | قوائم متكررة (الشرائح، الأعمدة، القدرات) — إضافة/حذف/سحب |
| `SortableList` | dnd-kit + حفظ متفائل + تراجع عند الفشل |
| `ImagePicker` | فتح مكتبة الوسائط، رفع بالسحب، اقتصاص، معاينة فورية، بديل نصّي (alt) إلزامي |
| `UnsavedGuard` | يعترض التنقّل ويحذّر من فقد التعديلات |
| `CommandPalette` | ⌘K — قفز لأي سكشن أو كيان أو أمر |
| `DiffViewer` | فروقات المسودة مقابل المنشور، حقلاً حقلاً، بالألوان |

### الاختصارات

```
⌘K   لوحة الأوامر          ⌘S   حفظ مسودة
⌘↵   نشر (مع تأكيد)        ⌘\   طيّ/إظهار المعاينة
⌘⇧L  تبديل اللغة           Esc  إغلاق الحوار
```

---

## 10. نظام المعاينة الحية ★ جوهر المشروع

### المبدأ

> **المعاينة تستدعي مكوّن السكشن الحقيقي. لا تُعاد كتابته أبداً.**

### المعمارية

```
┌──────────────── الداش بورد /studio ─────────────────┐
│                                                     │
│  الفورم (react-hook-form)                          │
│      │  watch()  ← على كل ضغطة مفتاح                │
│      ▼                                              │
│  دمج قيم الفورم داخل شجرة الرسائل                  │
│      │                                              │
│      ▼  postMessage({type:"wjeen:preview", messages})│
│  ┌───────────────────────────────────────────────┐ │
│  │ <iframe src="/ar/__preview/hero">             │ │
│  │                                               │ │
│  │   ┌─── مسار المعاينة داخل تطبيق الموقع ───┐  │ │
│  │   │ يستقبل الرسالة                         │  │ │
│  │   │ setMessages(draft)                     │  │ │
│  │   │                                        │  │ │
│  │   │ <NextIntlClientProvider messages={…}>  │  │ │
│  │   │   <Hero />   ← المكوّن الحقيقي          │  │ │
│  │   │ </NextIntlClientProvider>              │  │ │
│  │   └────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### لماذا `iframe` وليس رندر مباشر

| السبب | التفصيل |
|---|---|
| **عزل CSS** | Tailwind الداش بورد و Tailwind الموقع لهما `@theme` مختلفان. الحقن المباشر يكسر الاثنين. |
| **مطابقة بصرية** | المعاينة ترث خطوط الموقع (Cairo) و tokens و `--header-h` بالضبط. |
| **محاكاة الأجهزة** | تبديل الجهاز = تغيير عرض الـ iframe فقط، وقواعد `lg:` و `md:` تعمل حقيقةً. |
| **عزل الحركة** | GSAP/Lenis/Framer داخل الـ iframe لا تعبث بتمرير الداش بورد. |
| **أمان** | `sandbox="allow-scripts allow-same-origin"` |

### مسار المعاينة

```tsx
// src/app/[locale]/__preview/[section]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { SECTION_REGISTRY } from "@/lib/preview/registry";

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL!;

export default function PreviewPage({
  params,
}: {
  params: { locale: string; section: string };
}) {
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // ★ التحقق من المصدر إلزامي — بدونه أي موقع يستطيع الحقن.
      if (e.origin !== ALLOWED_ORIGIN) return;
      if (e.data?.type !== "wjeen:preview") return;
      setMessages(e.data.messages);
    }
    window.addEventListener("message", onMessage);
    // أبلغ الأب أن الإطار جاهز لاستقبال أول لقطة
    window.parent.postMessage({ type: "wjeen:preview-ready" }, ALLOWED_ORIGIN);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const Section = SECTION_REGISTRY[params.section];
  if (!Section) return <PreviewError section={params.section} />;
  if (!messages) return <PreviewSkeleton />;

  return (
    <NextIntlClientProvider locale={params.locale} messages={messages}>
      <Section />
    </NextIntlClientProvider>
  );
}
```

```ts
// src/lib/preview/registry.ts
//
// الخريطة الوحيدة بين مفتاح السكشن في قاعدة البيانات ومكوّنه.
// ★ أي سكشن جديد يُضاف هنا وإلا فلا معاينة له.

import { Hero } from "@/components/sections/Hero";
import { Stats } from "@/components/sections/Stats";
import { OurClients } from "@/components/sections/OurClients";
// … الـ 35 مكوّناً

export const SECTION_REGISTRY = {
  hero: Hero,
  stats: Stats,
  clients: OurClients,
  // …
} as const;

export type SectionKey = keyof typeof SECTION_REGISTRY;
```

### جانب الداش بورد

```tsx
// src/components/studio/preview/PreviewPane.tsx

const DEVICES = {
  mobile:  { w: 390,  label: "موبايل"  },
  tablet:  { w: 834,  label: "تابلت"   },
  desktop: { w: null, label: "ديسكتوب" },
} as const;

export function PreviewPane({
  section, locale, draftMessages,
}: {
  section: SectionKey;
  locale: "en" | "ar";
  draftMessages: Record<string, unknown>;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [ready, setReady] = useState(false);

  // انتظر إشارة الجاهزية من الإطار قبل أول إرسال
  useEffect(() => {
    function onReady(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "wjeen:preview-ready") setReady(true);
    }
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, []);

  // ادفع المسودة عند كل تغيير — بلا debounce، فالتكلفة postMessage فقط
  useEffect(() => {
    if (!ready) return;
    frame.current?.contentWindow?.postMessage(
      { type: "wjeen:preview", messages: draftMessages },
      window.location.origin,
    );
  }, [draftMessages, ready]);

  const width = DEVICES[device].w;

  return (
    <div className="flex h-full flex-col rounded-frame border bg-off-white">
      <DeviceBar value={device} onChange={setDevice}
                 locale={locale} section={section} />
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <iframe
          ref={frame}
          src={`/${locale}/__preview/${section}`}
          sandbox="allow-scripts allow-same-origin"
          className="h-full rounded-ui border bg-white shadow-card
                     transition-[width] duration-300"
          style={{ width: width ? `${width}px` : "100%" }}
        />
      </div>
    </div>
  );
}
```

### بناء رسائل المسودة

```ts
// src/lib/studio/draftMessages.ts

/**
 * يدمج قيم الفورم غير المحفوظة فوق المسودة المخزّنة، فينتج شجرة
 * رسائل كاملة صالحة لتغذية next-intl.
 *
 * `sectionPath` هو مسار المفتاح في الشجرة، مثل "hero" أو "aboutPage.story".
 */
export function buildDraftMessages(
  base: Messages,
  sectionPath: string,
  formValues: Record<string, unknown>,
): Messages {
  return setDeep(structuredClone(base), sectionPath, {
    ...getDeep(base, sectionPath),
    ...formValues,
  });
}
```

```tsx
// الاستخدام داخل شاشة التحرير
const values = watch();                       // react-hook-form
const draftMessages = useMemo(
  () => buildDraftMessages(baseMessages, sectionPath, values),
  [baseMessages, sectionPath, values],
);
```

### معاينة الصور قبل الرفع

```ts
// حوّل الملف المحلي إلى blob URL وضعه في الرسائل قبل الرفع
const localUrl = URL.createObjectURL(file);
setValue("image", localUrl);
// ونظّف بعد الرفع الفعلي:  URL.revokeObjectURL(localUrl)
```

### شروط النجاح

- ✅ زمن التحديث من ضغطة المفتاح إلى تغيّر البكسل: **< 50ms**
- ✅ صفر HTML مكرر بين الموقع والمعاينة
- ✅ كل سكشن مسجَّل في `SECTION_REGISTRY` له معاينة تلقائياً
- ✅ اختبار: `Object.keys(SECTION_REGISTRY)` يغطي كل مفاتيح `Section` في DB

---

## 11. نظام تصميم الداش بورد

### المبدأ

الداش بورد **يمتد** هوية وجين ولا يخترع هوية جديدة: نفس الكحلي `#0F155F`،
نفس خط Cairo، نفس نصف القطر. المستخدم يشعر أنه داخل نفس المنتج.

### الرموز (`src/app/(studio)/studio.css`)

```css
@layer theme {
  :root {
    /* الهوية — من globals.css */
    --s-brand:        #0f155f;
    --s-brand-hover:  #090d3d;
    --s-brand-soft:   color-mix(in srgb, #0f155f 8%, white);

    /* أسطح فاتحة */
    --s-bg:           #f7f8fc;   /* = --color-off-white */
    --s-surface:      #ffffff;
    --s-surface-alt:  #fbfcfe;
    --s-border:       color-mix(in srgb, #111827 8%, transparent);
    --s-text:         #111827;
    --s-text-muted:   #585f6b;   /* = --color-gray-muted */

    /* الحالات */
    --s-success:      #0f9d58;
    --s-warning:      #d97706;
    --s-danger:       #dc2626;
    --s-info:         #2563eb;

    /* الأشكال — من نظام الموقع */
    --s-radius:       0.75rem;   /* = --radius-ui */
    --s-radius-lg:    1.25rem;   /* = --radius-frame */

    /* الظلال — طبقة واحدة، خفيفة */
    --s-shadow-sm:    0 1px 2px rgba(17,24,39,.04);
    --s-shadow:       0 4px 16px -4px rgba(17,24,39,.08);
    --s-shadow-lg:    0 20px 48px -16px rgba(15,21,95,.14);

    /* التوقيت */
    --s-fast:         120ms;
    --s-base:         200ms;
    --s-slow:         320ms;
    --s-ease:         cubic-bezier(.4, 0, .2, 1);
  }

  :root[data-theme="dark"] {
    --s-bg:          #0b0e1a;
    --s-surface:     #131829;
    --s-surface-alt: #1a2036;
    --s-border:      color-mix(in srgb, white 9%, transparent);
    --s-text:        #eef0f6;
    --s-text-muted:  #9aa2b8;
    --s-brand-soft:  color-mix(in srgb, #979ef7 12%, transparent);
    --s-shadow-lg:   0 20px 48px -16px rgba(0,0,0,.5);
  }
}
```

### القواعد

1. **ملف CSS واحد للرموز.** كل شيء آخر أدوات Tailwind أو variants من CVA.
2. **صفر `<style>` داخل الصفحات. صفر `style=""` عدا القيم المحسوبة وقت
   التشغيل** (عرض الـ iframe، نسبة شريط التقدم).
3. **صفر `!important`.** لو احتجتها فالتخصص خاطئ — أصلح المصدر.
4. **صفر ألوان مكتوبة يدوياً.** الرمز أو لا شيء.
5. **مقياس المسافات:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 فقط.
6. **الحركة تخدم الفهم:** ظهور 120ms، انتقال حالة 200ms، عناصر الحوار 320ms.
   احترم `prefers-reduced-motion` — أوقف كل شيء عداه.

### اللغة البصرية

- **كثافة معلوماتية عالية، لا فراغ مسرف.** المستخدم يحرّر 32 مشروعاً؛
  ثلاثة صفوف في الشاشة إهانة لوقته.
- **حدود لا ظلال** للتمييز بين المناطق. الظل للطبقات العائمة فقط.
- **الحالة أولاً:** كل قائمة تعرض المنشور مقابل المسودة بوضوح.
  نقطة ملوّنة + وسم نصّي — **ممنوع الاعتماد على اللون وحده.**
- **RTL أصلي:** استخدم `ms-*` / `me-*` / `ps-*` / `pe-*` وخصائص
  `inset-inline-*` المنطقية. **ممنوع `ml-*` / `mr-*` / `left` / `right`.**

### الحالات — كلها إلزامية لكل شاشة

| الحالة | المطلوب |
|---|---|
| **فارغة** | رسم توضيحي + جملة تشرح + زر الإجراء الأول |
| **تحميل** | هيكل عظمي (skeleton) يطابق شكل المحتوى — لا spinner |
| **خطأ** | ماذا حدث + ماذا يفعل المستخدم + زر «إعادة المحاولة» |
| **جزئية** | «3 من 32 بلا صورة» مع فلتر يقفز إليها |
| **مشغول** | الزر يعطّل ويعرض دواره الخاص، لا تجميد الشاشة |

### إمكانية الوصول — إلزامية

```
✓ كل زر أيقونة له aria-label
✓ حلقة تركيز مرئية: outline 2px بلون --s-brand، offset 2px
✓ الحوارات: focus trap + Esc + إعادة التركيز للزر المُطلِق
✓ تباين النص ≥ 4.5:1  والعناصر التفاعلية ≥ 3:1  (WCAG AA)
✓ الجداول: <caption> + scope على <th>
✓ الأخطاء مرتبطة بحقولها عبر aria-describedby
✓ التنقّل بالكيبورد وحده يصل لكل شيء — اختبره فعلياً
✓ منطقة aria-live للتنبيهات
```

> مشروع سابق في نفس الفريق سجّل **صفر سمة `aria-` عبر 40 شاشة.**
> هذه القائمة ليست تزييناً.

---

## 12. الصلاحيات والأمان

### الأدوار

```python
class Role(models.TextChoices):
    OWNER  = "owner"    # كل شيء + إدارة المستخدمين + التراجع
    ADMIN  = "admin"    # كل شيء + النشر
    EDITOR = "editor"   # تحرير + حفظ مسودة، بلا نشر
    VIEWER = "viewer"   # قراءة فقط
```

### الصلاحيات الدقيقة

```python
class UserPermission(models.Model):
    user  = models.OneToOneField(User, on_delete=models.CASCADE)
    role  = models.CharField(max_length=12, choices=Role.choices)

    can_edit_content    = models.BooleanField(default=True)
    can_edit_projects   = models.BooleanField(default=True)
    can_edit_careers    = models.BooleanField(default=True)
    can_manage_media    = models.BooleanField(default=True)
    can_view_inbox      = models.BooleanField(default=True)
    can_publish         = models.BooleanField(default=False)
    can_rollback        = models.BooleanField(default=False)
    can_manage_users    = models.BooleanField(default=False)
    can_manage_settings = models.BooleanField(default=False)
```

### الفرض على طبقتين

**الخادم مصدر الحقيقة.** كل ViewSet يفرض الصلاحية.
**العميل يخفي فقط.** إخفاء زر ليس أمناً — لكن إظهار زر يفشل عند الضغط
تجربة سيئة، فافعل الاثنين.

### قائمة الأمان

```
□ كل مسارات /api/v1/admin/** تتطلب مصادقة — بلا استثناء
□ JWT في كوكيز httpOnly + Secure + SameSite=Lax  (ممنوع localStorage)
□ تدوير التوكن + قائمة سوداء عند الخروج
□ CORS: نطاقات محدّدة فقط، ممنوع "*"
□ تحديد المعدّل: 5 محاولات دخول / 15 دقيقة / IP
□ رفع الملفات: قائمة بيضاء للامتدادات + فحص magic bytes + حد 10MB
□ إزالة EXIF من الصور المرفوعة (بيانات الموقع الجغرافي)
□ CSP على /studio: script-src 'self'
□ middleware يحمي /studio ويعيد التوجيه لتسجيل الدخول
□ robots.ts يمنع /studio و /*/__preview
□ __preview يتحقق من e.origin  ← بدونه ثغرة حقن
□ تنقية HTML من Tiptap عبر bleach قبل التخزين
□ سجل نشاط لكل كتابة: من، ماذا، متى، القيمة قبل وبعد
□ نسخة احتياطية يومية للقاعدة + احتفاظ 30 يوماً
□ حذف الوسائط يُرفض لو الأصل مستخدَم، مع ذكر أماكن الاستخدام
```

---

## 13. إدارة الوسائط

```python
class MediaAsset(TimeStamped):
    title      = models.CharField(max_length=200)
    file       = models.ImageField(upload_to=hashed_upload_path)
    alt_en     = models.CharField(max_length=300)   # إلزامي
    alt_ar     = models.CharField(max_length=300)   # إلزامي
    category   = models.CharField(max_length=40, choices=CATEGORY_CHOICES)
    width      = models.PositiveIntegerField()
    height     = models.PositiveIntegerField()
    size_bytes = models.PositiveIntegerField()
    checksum   = models.CharField(max_length=64, db_index=True)  # منع التكرار
    focal_x    = models.FloatField(default=0.5)     # نقطة التركيز للاقتصاص
    focal_y    = models.FloatField(default=0.5)
```

### القواعد

1. **اسم الملف يتضمّن hash المحتوى** — يحلّ مشكلة تخبئة الصور في Next
   المذكورة في `TODO-BACKEND.md` جذرياً.
2. **البديل النصّي (alt) إلزامي بلغتين.** الحفظ يُرفض بدونه.
3. **كشف التكرار عبر checksum** — يحذّر قبل رفع نسخة ثانية.
4. **الضغط عند الرفع:** WebP + AVIF، وعرض 400/800/1600/2400.
   الملفات الأصلية 4.6 ميجابايت المذكورة في التودو تُحل هنا.
5. **الحذف الآمن:** الأصل المستخدَم لا يُحذف؛ الرد يذكر أين يُستخدم.
6. **صور المشاريع:** الداش بورد يعرض تحذيراً ثابتاً عند ربط صورة بمشروع —
   «تأكد أن الصورة لهذا المشروع تحديداً» — احتراماً لتحذير التودو.

---

## 14. خطة التنفيذ بالمراحل

> كل مرحلة تنتهي بشيء يعمل ويُعرض. ممنوع مرحلة تنتهي بكود غير مرئي.

### المرحلة 0 — الأساس

```
□ مشروع Django + PostgreSQL + إعدادات البيئات الثلاثة
□ نماذج base.py (TimeStamped, Ordered, Bilingual)
□ المستخدمون والأدوار + JWT في كوكيز httpOnly
□ CORS + الإعدادات الأمنية
□ سكربت الاستيراد: messages/*.json  →  قاعدة البيانات
   ★ هذا السكربت هو أهم مخرج في المرحلة — يجب أن يستورد
     الـ32 مشروعاً والـ22 عميلاً وكل شيء آخر بلا فقد حرف واحد.
□ ContentAssembler + اختبار ذهاب-وعودة:
     assemble(import(en.json)) == en.json     ← يجب أن ينجح بالضبط
```

**مخرج المرحلة:** استيراد كامل + إعادة تجميع مطابقة بايت ببايت.

### المرحلة 1 — المحتوى والـ API

```
□ كل نماذج القسم 5 + الهجرات + بيانات الزرع
□ Serializers + ViewSets لكل كيان
□ ContentVersion + منطق النشر + التراجع
□ endpoints المحتوى العام والمسودة
□ webhook إعادة التحقق إلى Next.js
□ Django admin مؤقت للاختبار اليدوي
```

**مخرج المرحلة:** الموقع يعمل كاملاً من الـ API بدل ملفات JSON.

### المرحلة 2 — شل الداش بورد

```
□ route group (studio) + تخطيط + middleware
□ صفحة الدخول
□ shadcn/ui + studio.css + الوضع الليلي
□ Sidebar + Topbar + CommandPalette
□ TanStack Query + عميل API + تحديث التوكن
□ لوحة النظرة العامة (إحصاءات + آخر نشاط + التغييرات غير المنشورة)
□ DataTable + SortableList + كل الحالات الخمس
```

**مخرج المرحلة:** تسجيل دخول + تصفّح + قراءة كل شيء.

### المرحلة 3 — نظام المعاينة ★

```
□ SECTION_REGISTRY لكل الـ35 مكوّناً
□ مسار /[locale]/__preview/[section]
□ جسر postMessage مع التحقق من المصدر
□ PreviewPane + DeviceBar + مبدّل اللغة
□ buildDraftMessages + الربط مع react-hook-form
□ اختبار: كل مفاتيح Section لها إدخال في السجل
```

**مخرج المرحلة:** تكتب في حقل ← السكشن الحقيقي يتغيّر أمامك فوراً.

> ⚠️ **نفّذ هذه المرحلة مبكراً وليس في النهاية.** هي أعلى بند مخاطرة
> في المشروع؛ اكتشاف مشكلة فيها بعد بناء 40 شاشة كارثة.

### المرحلة 4 — المحرّرات

```
□ محرر السكاشن لكل صفحة (6 صفحات)
□ BilingualField + RepeaterField + RichText + ImagePicker
□ CRUD المشاريع (الأثقل: 32 عنصراً + صور + فلاتر)
□ CRUD العملاء والخدمات والشهادات والجوائز والمكاتب وآراء العملاء
□ الموارد (11 تخصصاً + 14 معدة) والهيكل التنظيمي
□ السحب والإفلات للترتيب في كل القوائم
□ UnsavedGuard + الحفظ التلقائي كمسودة كل 30 ثانية
```

**مخرج المرحلة:** تحرير كل محتوى الموقع من الداش بورد.

### المرحلة 5 — النشر والوسائط

```
□ مكتبة الوسائط: رفع بالسحب، اقتصاص، نقطة التركيز، كشف التكرار
□ خط أنابيب الصور (WebP/AVIF + المقاسات)
□ شاشة النشر + DiffViewer
□ سجل النسخ + التراجع بنقرة
□ سجل النشاط
```

**مخرج المرحلة:** دورة تحرير ← معاينة ← نشر ← تراجع كاملة.

### المرحلة 6 — الوارد والوظائف

```
□ رسائل التواصل: قائمة، تفاصيل، حالة، تصدير CSV
□ ربط /api/contact الحالي بالتخزين في Django
□ الوظائف الشاغرة + طلبات التوظيف + تحميل السير الذاتية
□ التنبيهات (رسالة جديدة، طلب جديد، شهادة توشك على الانتهاء)
```

### المرحلة 7 — التلميع والإطلاق

```
□ تدقيق إمكانية الوصول (axe + تنقّل بالكيبورد وحده)
□ Lighthouse ≥ 95 على الموقع، ≥ 90 على الداش بورد
□ مراجعة أمنية بقائمة القسم 12
□ مزامنة الاحتياطي إلى messages/*.json عبر CI
□ دليل استخدام بالعربية للعميل + فيديو قصير
□ نسخ احتياطية آلية + مراقبة
```

---

## 15. قواعد إلزامية (غير قابلة للتفاوض)

### 1. عقد المحتوى

> **كل مكوّن سكشن يقرأ محتواه من next-intl فقط.**
> ممنوع `fetch` داخل مكوّن سكشن. ممنوع استيراد JSON. ممنوع props للمحتوى
> (عدا `PillarGrid` القائم، وهو يبقى استثناءً موثّقاً).

كسر هذه القاعدة يكسر المعاينة والـ CMS معاً.

### 2. مصدر واحد للحقيقة البصرية

> **ممنوع منعاً باتاً إعادة بناء شكل أي سكشن داخل الداش بورد.**
> لو وجدت نفسك تكتب `<div>` يشبه الهيرو — توقّف. استورد `<Hero />`.

مشروع سابق كتب **~2400 سطر HTML مكرر** لأنه خالف هذه القاعدة، وتغطيته
بلغت 11 شاشة من 40، والمعاينات لم تعد تطابق الموقع.

### 3. صفر تكرار في شاشات CRUD

> كيان جديد = **إعداد**، لا شاشة جديدة.
> `<EntityScreen config={projectsConfig} />` — القائمة والفورم والمعاينة
> والصلاحيات من الإعداد.

### 4. الأداء

```
□ ممنوع استعلام قاعدة بيانات داخل حلقة — استخدم annotate/aggregate
□ select_related / prefetch_related على كل ViewSet
□ كل endpoint < 15 استعلاماً — يُفرض عبر django-silk في CI
□ استجابة الـ API < 200ms (p95)
□ ContentAssembler يبني الشجرة كاملة في ≤ 12 استعلاماً
```

> مشروع سابق نفّذ **67 استعلاماً منفصلاً** في شاشة تحليلات واحدة
> بسبب حلقتين على الأيام. لا تكرره.

### 5. عزل CSS

```
□ globals.css     ← الموقع فقط
□ studio.css      ← الداش بورد فقط
□ الاثنان لا يتقاطعان أبداً — العزل عبر iframe فقط
```

### 6. الملفات الاحتياطية تبقى

> `src/messages/{en,ar}.json` **لا تُحذف أبداً.**
> هي شبكة أمان الموقع لو سقط الباك إند.

### 7. أول لغة هي العربية

> الداش بورد **عربي أولاً**، بتبديل للإنجليزية. RTL هو الوضع الافتراضي
> وليس حالة معالَجة لاحقاً. اختبر بالعربية أولاً في كل شاشة.

### 8. TypeScript صارم

```
□ strict: true  ← موجود بالفعل، لا تخفّفه
□ ممنوع any  — استخدم unknown + تضييق النوع
□ أنواع الـ API مولّدة من مخطط DRF (drf-spectacular → openapi-typescript)
□ مخططات zod تعكس تحقّق Django — مصدر واحد، توليد آلي
```

### 9. Next.js 16

> راجع `AGENTS.md`: هذه ليست Next.js المألوفة. **اقرأ
> `node_modules/next/dist/docs/` قبل كتابة أي كود** يمسّ التوجيه أو
> التخبئة أو Server Actions. لا تعتمد على الذاكرة.

### 10. الالتزامات القائمة

```
□ لا تكسر منطق CSP في next.config.ts (التعليق يشرح سبب كونه جزئياً)
□ لا تحذف rateLimit ولا honeypot من مسار التواصل
□ لا تضف font-* فوق فئات t-display…t-eyebrow
□ استخدم rounded-ui / rounded-frame فقط — لا أنصاف أقطار جديدة
□ اسم ملف جديد لكل صورة جديدة (تخبئة صور Next)
```

---

## 16. معايير القبول

### وظيفياً

```
□ تحرير كل نص في الموقع من الداش بورد بلا deploy
□ كل سكشن له معاينة حية تعرض المكوّن الحقيقي
□ زمن المعاينة من الضغطة إلى البكسل < 50ms
□ تبديل ع/EN داخل المعاينة يعمل
□ ثلاثة مقاسات أجهزة تعمل فعلياً بقواعد md:/lg:
□ إعادة ترتيب أي قائمة بالسحب والإفلات
□ رفع صورة مع اقتصاص ونقطة تركيز وبديل نصّي إلزامي
□ نشر ← الموقع يتحدّث خلال 10 ثوانٍ
□ تراجع ← الموقع يعود خلال 10 ثوانٍ
□ عرض الفروقات بين المسودة والمنشور قبل النشر
□ 4 أدوار بصلاحيات مفروضة على الخادم
□ سجل نشاط كامل بالقيم قبل وبعد
□ رسائل التواصل وطلبات التوظيف تصل وتُدار
```

### تقنياً

```
□ ContentAssembler ينتج JSON مطابقاً لـ messages/*.json (اختبار آلي)
□ كل endpoint < 15 استعلاماً
□ استجابة API < 200ms (p95)
□ Lighthouse: الموقع ≥ 95 · الداش بورد ≥ 90
□ صفر أخطاء axe على كل شاشة
□ التنقّل بالكيبورد وحده يغطي كل وظيفة
□ صفر أخطاء TypeScript · صفر تحذيرات ESLint
□ SECTION_REGISTRY يغطي كل مفاتيح Section (اختبار آلي)
□ الموقع يعمل بالملفات الاحتياطية عند إسقاط الـ API عمداً (اختبار)
```

### تجربة

```
□ العميل يعدّل نصاً وينشره بلا تدريب خلال دقيقتين
□ كل شاشة لها حالاتها الخمس
□ ممنوع تجميد الشاشة عند أي إجراء
□ تحذير واضح عند مغادرة صفحة بتعديلات غير محفوظة
□ حفظ تلقائي كمسودة كل 30 ثانية
□ الداش بورد بالعربية RTL بلا كسر واحد
```

---

## 17. ملحق: الأخطاء المستفادة من مشروع سابق

فُحص داش بورد Django/Tabler سابق لنفس الفريق. ما يلي **قياسات فعلية**
من ذلك المشروع، مذكورة هنا لتُتجنّب لا لتُكرّر:

| ما حدث | الرقم | القاعدة المانعة هنا |
|---|---|---|
| CSS مكرر داخل القوالب | **17,000 سطر** | القاعدة 5 + رموز مركزية |
| `!important` | **146 مرة** | القاعدة 5 |
| `style=""` مضمّنة | **336 مرة** | القسم 11، القاعدة 2 |
| HTML معاينة مكرر | **~2,400 سطر** | القاعدة 2 ★ |
| تغطية المعاينة | **11 من 40 شاشة** | السجل يعطي تغطية كاملة مجاناً |
| بحث في القوائم | **4 من 19** | `EntityScreen` يعطيه لكل كيان |
| ترقيم الصفحات | **4 من 19** | نفس السبب |
| سمات `aria-` | **صفر** | القسم 11، قائمة الوصول |
| استعلامات شاشة التحليلات | **67** | القاعدة 4 |
| قالب معاينة يتيم بلا مسار | **1** | معايير القبول |
| مسودة/نشر | **غير موجود** | القسم 6 |
| سحب وإفلات (رغم وجود حقول order) | **غير موجود** | القسم 4، المرحلة 4 |
| favicon يُرسم على canvas كل 50ms للأبد | **1** | مراجعة الكود |

**الخلاصة المستفادة:** التصميم البصري في ذلك المشروع كان جيداً فعلاً —
لكن غياب مصدر واحد للحقيقة حوّل كل تحسين إلى دَين. هذه الخطة تعالج
السبب الجذري: **المعاينة تستدعي المكوّن الحقيقي، والشاشات تُولَّد من
إعدادات، والرموز في مكان واحد.**

---

## البدء

```bash
# 1. الباك إند
django-admin startproject config wjeen-backend
cd wjeen-backend
python -m venv .venv && source .venv/bin/activate
pip install django djangorestframework djangorestframework-simplejwt \
            django-cors-headers django-filter pillow psycopg[binary] \
            django-storages[s3] python-decouple drf-spectacular

# 2. المرحلة 0 — الأهم أولاً
#    اكتب سكربت الاستيراد واختبار الذهاب-والعودة قبل أي شيء آخر.
python manage.py import_messages ../wjeen/src/messages/en.json en
python manage.py import_messages ../wjeen/src/messages/ar.json ar
python manage.py test content.tests.test_assembler   # يجب أن ينجح

# 3. الداش بورد — في المستودع الحالي
cd ../wjeen
npx shadcn@latest init
npm i @tanstack/react-query @dnd-kit/core @dnd-kit/sortable \
      @tiptap/react @tiptap/starter-kit sonner next-themes \
      recharts date-fns lucide-react
```

**رتّب التنفيذ هكذا:** المرحلة 0 → المرحلة 1 → **المرحلة 3 (المعاينة)**
→ المرحلة 2 → 4 → 5 → 6 → 7.

قدّم المعاينة على شل الداش بورد: هي أعلى بنود المخاطرة، وإثبات نجاحها
مبكراً يحمي بقية المشروع.

---

*انتهى.*
