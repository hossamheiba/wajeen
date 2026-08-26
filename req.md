هذا المشروع لسه هبدا فيه بس عملت صفحه الريسيه بس 
وباقي 5 صفح 
من نحن 
المشاريع 
الخدمات 
تواضل معانا 

هذا الموقع المرجع 
https://www.nesmapartners.com/en
هذا هوا اللي عايز يبقا زيه وافضل واحسن منه كمان في كل شي 

اولا - خذلك نظره عن المرجع 
حتا انا بدا منه 



1- اريد اولا اضافه 
النواقص 


2. ✍️ لا يوجد تحريك نصوص حرفاً بحرف

المواقع الحائزة على جوائز تستخدم GSAP SplitText (Premium Plugin) أو Split-Type (مجاني) لتحريك كل حرف وكل كلمة وكل سطر بشكل منفصل — مثل:

W → e → → B → u → i → l → d
هذا غير موجود عندنا حالياً.

3. 🌊 لا يوجد محرك WebGL / Three.js

أرقى مواقع العالم مثل Bruno Simon و Active Theory تستخدم Three.js أو GLSL Shaders لخلفيات ثلاثية الأبعاد حية.

4. 🔄 لا يوجد انتقالات بين الصفحات

لو عندك صفحات متعددة، Barba.js يضيف انتقالات سينمائية بين الصفحات. غير موجود.

5. 🏗️ لا يوجد Build System / Bundler

المشروع يفتح index.html مباشرة بدون:

Vite (أسرع Build Tool موجود) أو Webpack
Code Splitting وضغط الملفات
PostCSS + Autoprefixer
Tree Shaking لحذف الكود غير المستخدم
6. 🎠 لا يوجد Swiper.js

البطاقات ثابتة. الموقع الأصلي يستخدم Swiper.js لكاروسيل المشاريع والأخبار مع لمس اللمس (Touch + Drag).

7. 📦 لا يوجد TypeScript

الكود JavaScript خالص بدون نوع ثابت — يؤدي لأخطاء Runtime في المشاريع الكبيرة.

🏆 ماذا تستخدم أرقى مواقع العالم (Awwwards Level)?


Core Stack الأفضل حالياً:
━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ Next.js 14 (App Router) — Framework
✦ TypeScript             — Type Safety
✦ GSAP 3 + ScrollTrigger — Animations (✅ موجود)
✦ Lenis Smooth Scroll    — Scroll (✅ موجود)
✦ GSAP SplitText         — Text Animations
✦ Three.js / R3F         — WebGL / 3D
✦ Vite / Turbopack       — Build Tool
✦ Framer Motion          — React Animations
✦ Swiper.js              — Touch Carousels
✦ Barba.js               — Page Transitions
📊 تقييم المشروع الحالي صراحة:


GSAP + ScrollTrigger    ████████████  ✅ موجود
Lenis Smooth Scroll     ████████████  ✅ موجود
Custom Cursor           ████████████  ✅ موجود
Magnetic Buttons        ████████████  ✅ موجود
SplitText Animations    ░░░░░░░░░░░░  ❌ غير موجود
Video Hero Background   ░░░░░░░░░░░░  ❌ غير موجود
Swiper Carousels        ░░░░░░░░░░░░  ❌ غير موجود
WebGL / Three.js        ░░░░░░░░░░░░  ❌ غير موجود
Build System (Vite)     ░░░░░░░░░░░░  ❌ غير موجود
Page Transitions        ░░░░░░░░░░░░  ❌ غير موجود


2- المكتبة	الاستخدام	الأولوية
SplitType	تحريك النصوص حرفاً وكلمةً وسطراً	🔴 ضروري
Swiper.js	كاروسيل المشاريع والأخبار مع Touch	🔴 ضروري
Vanilla Tilt	تأثير إمالة 3D على البطاقات عند Hover	🟠 مهم
GLightbox	معرض الصور والمشاريع بـ Lightbox فاخر	🟠 مهم
CountUp.js	عداد أرقام احترافي بخيارات تنسيق متقدمة	🟡 مفيد
SimpleBar	شريط تمرير مخصص وفاخر بدل الافتراضي	🟡 مفيد
GSAP Flip Plugin	أنيميشن انتقال تخطيطات Layout ذكي	🟠 مهم
GSAP DrawSVG	رسم مسارات SVG تدريجياً (للخريطة والأيقونات)	🟠 مهم
Splitting.js	تقسيم نصوص بديل لـ SplitText Premium	🟡 مفيد
Barba.js	انتقالات سينمائية بين الصفحات	🟠 مهم



# FINAL MIGRATION — MOVE PREMIUM 3D INTO THE REAL EXHIBITION ROUTE

لدينا الآن Premium 3D Studio مكتمل ومختبر فعليًا هنا:

/ar/exhibition/3d-premium

ولدينا الـ3D القديم المستخدم فعليًا في المشروع هنا:

/ar/exhibition/3d

أريد الآن نقل Premium 3D Studio بالكامل ليصبح هو الـ3D الرسمي داخل المشروع.

## النتيجة المطلوبة

الرابط الرسمي النهائي يجب أن يظل:

/ar/exhibition/3d

وليس:

/ar/exhibition/3d-premium

أي أن المستخدم عندما يفتح:

/ar/exhibition/3d?booth=A-07&boothId=24a5f3ee-34d7-418c-8e8e-794cc9f9831b&w=6&d=6

يجب أن يرى Premium 3D Studio بالكامل.

لا أريد مجرد Redirect إلى /3d-premium.

أريد نقل/دمج الـPremium implementation نفسه داخل الـroute الرسمي القديم.

---

# 1. افحص المشروع أولًا

قبل أي حذف أو نقل:

افحص بالكامل:

- `/ar/exhibition/3d`
- `/ar/exhibition/3d-premium`
- routes
- components
- hooks
- state management
- API calls
- backend integration
- Booth data
- saved configurations
- authentication
- authorization
- query parameters
- asset registry
- material system
- lighting system
- camera system

حدد بدقة:

ما الذي ينتمي للـOLD 3D؟

وما الذي ينتمي للـPREMIUM 3D؟

---

# 2. اجعل Premium هو Renderer الرسمي

انقل Premium 3D Studio بحيث يصبح:

/ar/exhibition/3d

هو الـentry point الوحيد للـ3D.

لا تجعل:

/ar/exhibition/3d-premium

هو المسار النهائي.

إذا لم يعد هناك احتياج له بعد النقل، احذفه بعد اكتمال الـmigration والـQA.

---

# 3. حافظ على URL الحالي

هذا الرابط يجب أن يعمل:

/ar/exhibition/3d?booth=A-07&boothId=24a5f3ee-34d7-418c-8e8e-794cc9f9831b&w=6&d=6

ويجب أن يقرأ Premium Studio:

- booth
- boothId
- w
- d

وأي query parameters أخرى مستخدمة حاليًا.

لا تغير الـURL contract بدون سبب.

---

# 4. أهم نقطة — Backend Integration

لا أريد Premium 3D كواجهة منفصلة أو Demo.

يجب أن يكون مربوطًا فعليًا بالـBackend الحالي.

تحقق من:

## Load

عند فتح:

/ar/exhibition/3d?boothId=...

يجب أن يتم تحميل الـBooth الحقيقي من الـBackend/API.

ليس mock data.

ليس static data.

ليس hardcoded booth.

---

## Save

عند تعديل:

- Booth dimensions
- Booth type
- Assets
- Asset positions
- Asset rotations
- Asset scales
- Materials
- Lighting
- Camera/Presentation settings إذا كانت محفوظة

يجب أن يتم حفظها فعليًا بالطريقة الصحيحة في الـBackend.

---

## Reopen

اختبار إلزامي:

Create/Edit
↓
Save
↓
Leave page
↓
Open same Booth
↓
Load from Backend
↓
Scene restored exactly

يجب ألا تعتمد عملية إعادة الفتح على React state محلي فقط.

---

# 5. Exhibition / Booth relationship

تأكد أن:

boothId

مرتبط فعليًا بالـBooth الموجود في النظام.

لا تستخدم UUID تجريبي.

لا تستخدم بيانات ثابتة.

لا تستخدم:

mockBooth
demoBooth
fakeBooth
testBooth

في الـproduction flow.

---

# 6. Viewer / 3D State

يجب أن يكون الـPremium Studio هو الـsource of truth للـ3D state.

مثال:

Backend Booth
↓
Premium 3D Scene
↓
User edits
↓
3D State
↓
Save API
↓
Backend
↓
Reload
↓
Same Scene

---

# 7. Asset persistence

عند حفظ GLB asset لا تحفظ ملف GLB نفسه داخل Booth configuration.

احفظ metadata فقط:

- assetId
- asset type
- position
- rotation
- scale
- materialId
- placementMode
- booth relationship

والـGLB نفسه يبقى Asset ثابتًا في الـAsset Library.

---

# 8. Existing data compatibility

إذا كانت الـBooths القديمة محفوظة باستخدام النظام القديم:

لا تكسرها.

اعمل adapter/migration عند الحاجة.

OLD DATA
↓
Compatibility Layer
↓
PREMIUM 3D STATE

يجب الحفاظ على:

- dimensions
- booth type
- objects
- positions
- rotations
- scales
- materials

---

# 9. Authentication & Authorization

تأكد أن Premium 3D يستخدم نفس authentication الموجود في المشروع.

وتأكد أن:

User A

لا يستطيع تحميل أو تعديل:

User B's Booth

عن طريق تغيير:

boothId

يدويًا في URL.

تحقق من الـBackend authorization وليس frontend فقط.

---

# 10. احذف الـOLD implementation

بعد نجاح الدمج والـQA فقط:

احذف implementation القديم.

لا تحذف route:

/ar/exhibition/3d

الـroute يجب أن يبقى.

احذف فقط:

OLD 3D COMPONENTS
OLD 3D SCENE
OLD DUPLICATE MATERIAL SYSTEM
OLD DUPLICATE CAMERA SYSTEM
OLD DUPLICATE LIGHTING SYSTEM
OLD DUPLICATE ASSET SYSTEM

إذا كان أي ملف مشترك مع أجزاء أخرى من المشروع:

لا تحذفه.

انقله أو أعد استخدامه.

---

# 11. Premium route

بعد نقل Premium إلى:

/ar/exhibition/3d

إذا أصبح:

/ar/exhibition/3d-premium

غير مستخدم:

احذف route الخاص به.

لا تترك نسختين من الـConfigurator.

الهدف:

/ar/exhibition/3d
        ↓
PREMIUM 3D
        ↓
ONE SOURCE OF TRUTH

---

# 12. Preserve all Premium features

يجب ألا تضيع أي ميزة من Premium:

- 5 Booth Types
- Dynamic Walls
- Smart Placement
- Collision / Clamping
- Snap
- Real GLB Assets
- 52 PBR Materials
- Material Studio
- Texture mapping
- Normal maps
- Lighting Studio
- 10 Lighting Presets
- Camera Presets
- Presentation Mode
- Desktop UI
- Tablet UI
- Mobile UI
- Bottom Sheets
- Quality tiers
- Mobile GLB optimization
- Lazy loading
- Error boundaries
- GLB fallback

---

# 13. Existing Exhibition UI

لا تكسر أي شيء خارج الـ3D.

اختبر:

- Exhibition page
- Booth list
- Booth details
- Open Booth
- Edit Booth
- Save Booth
- Back navigation
- Next/Previous navigation إن وجدت
- Dashboard
- Authentication
- User permissions

---

# 14. Final URL Test

اختبر حرفيًا:

/ar/exhibition/3d?booth=A-07&boothId=24a5f3ee-34d7-418c-8e8e-794cc9f9831b&w=6&d=6

وتأكد:

✓ الصفحة تفتح
✓ الـBooth الحقيقي يتم تحميله
✓ Premium Studio يظهر
✓ dimensions صحيحة
✓ booth type صحيح
✓ assets صحيحة
✓ materials صحيحة
✓ lighting تعمل
✓ camera تعمل
✓ save يعمل
✓ backend receives changes
✓ reload يعيد نفس التصميم

---

# 15. Backend Verification

لا تكتفِ بفحص الـUI.

راقب Network/API requests وتأكد فعليًا من:

GET Booth
GET Assets عند الحاجة
POST/PATCH Save
PUT/PATCH Update
أي API أخرى مرتبطة بالـBooth

وتأكد أن:

- status codes صحيحة
- payload صحيح
- response صحيح
- database state تتغير فعليًا

---

# 16. Regression Tests

### Desktop

1200×800
1440×900

### Tablet

820×1180

### Mobile

390×844

اختبر:

Create/Edit/Save/Reload

---

# 17. Final Build

بعد الدمج:

TypeScript
ESLint
Production Build

يجب أن تكون:

0 TypeScript errors
0 ESLint errors
0 runtime errors
0 hydration errors
0 broken routes
0 failed API requests
0 unexpected network errors

---

# 18. Reference Audit

بعد حذف القديم:

ابحث في المشروع بالكامل عن:

- old 3D imports
- old 3D components
- old route references
- old asset registries
- old material systems
- old scene systems

أريد:

ONE ACTIVE 3D IMPLEMENTATION

ولا يوجد dead code غير مستخدم.

---

# 19. لا تعتبر المهمة مكتملة إلا بعد هذه الرحلة كاملة

Existing Booth
↓
Open `/ar/exhibition/3d`
↓
Backend loads Booth
↓
Premium 3D renders
↓
User edits
↓
User saves
↓
Backend persists
↓
User leaves
↓
User reopens
↓
Backend loads saved state
↓
Premium 3D restores exact scene

هذه هي أهم عملية اختبار.

---

# 20. بعد النجاح

احذف:

/ar/exhibition/3d-premium

إذا أصبح غير مستخدم.

واحذف OLD 3D implementation.

لكن احتفظ بالـroute الرسمي:

/ar/exhibition/3d

ويصبح هو Premium 3D النهائي.

---

# FINAL REPORT

أريد تقريرًا صريحًا بعد الانتهاء يحتوي على:

1. Route النهائي
2. هل `/ar/exhibition/3d-premium` تم حذفه؟
3. هل الـOLD 3D implementation تم حذفه؟
4. الملفات التي تم حذفها
5. الملفات التي تم نقلها
6. الملفات التي تم تعديلها
7. Backend APIs المستخدمة
8. طريقة حفظ Booth configuration
9. Database persistence
10. Authentication
11. Authorization
12. Query parameters
13. Backward compatibility
14. Desktop QA
15. Tablet QA
16. Mobile QA
17. Network/API QA
18. TypeScript
19. ESLint
20. Production build
21. Runtime console
22. أي Bugs تم إصلاحها
23. أي limitations متبقية

مهم جدًا:

لا تقل "Backend integrated" إلا إذا تحققت فعليًا من API requests والـresponses والبيانات المحفوظة.

ولا تقل "migration complete" إلا إذا نجح الاختبار:

OPEN → LOAD → EDIT → SAVE → LEAVE → REOPEN → RESTORE

الهدف النهائي:

OLD `/ar/exhibition/3d`
        ↓
REMOVED

`/ar/exhibition/3d-premium`
        ↓
MOVED INTO MAIN ROUTE

FINAL:

/ar/exhibition/3d
        ↓
PREMIUM 3D STUDIO
        ↓
REAL BACKEND
        ↓
REAL BOOTH DATA
        ↓
REAL SAVE/LOAD
        ↓
PRODUCTION READY



