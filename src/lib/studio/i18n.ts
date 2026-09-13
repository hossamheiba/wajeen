/**
 * The studio's own interface copy, in both languages.
 *
 * Deliberately NOT in `src/messages/*.json`. Those files are the website's
 * content: they are imported into the CMS, versioned, published and rolled
 * back, and their shape is fixed at 28 namespaces and 1117 key paths by tests
 * on both sides. Studio chrome is not site content, must not be editable in
 * the CMS, and must not move that baseline — so it lives here instead.
 *
 * `Copy` is derived from the English tree and Arabic is checked against it, so
 * a key added to one language and forgotten in the other is a build error
 * rather than an English word surfacing in an Arabic interface.
 *
 * Section names follow the site's own Arabic vocabulary — "لماذا وجين" is what
 * the careers page actually says — rather than a translation of my English
 * label for it.
 */

export type StudioLocale = "en" | "ar";

const en = {
  brand: { name: "WJEEN", studio: "STUDIO", home: "Wjeen Studio home" },

  nav: {
    label: "Studio",
    landmark: "Studio navigation",
    overview: "Overview",
    media: "Media",
    inbox: "Inbox",
    content: "Content",
    sections: "Sections",
    drafts: "Drafts",
    publishing: "Publishing",
    publish: "Publish",
    versions: "Versions",
    liveVersion: "Live version",
    role: "Editor",
    signOut: "Sign out",
    signedIn: "Signed in",
    open: "Open navigation",
    collapse: "Collapse sidebar",
    expand: "Expand sidebar",
    breadcrumb: "Breadcrumb",
    language: "Language",
    english: "English",
    arabic: "العربية",
  },

  common: {
    loading: "Loading",
    dismiss: "Dismiss",
    cancel: "Cancel",
    clear: "Clear",
    search: "Search",
    live: "Live",
    draft: "Draft",
    readOnly: "Read-only",
    noPreview: "No preview",
    openWebsite: "Open website",
    of: (shown: number, total: number) => `${shown} of ${total}`,
  },

  overview: {
    title: "Overview",
    subtitle: "Wjeen content at a glance",
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    greet: (greeting: string, name: string | null) =>
      name ? `${greeting}, ${name}.` : `${greeting}.`,
    headline:
      "Manage Wjeen’s content, preview every change, and publish when you’re ready.",
    browse: "Browse sections",
    reviewDrafts: (count: number) =>
      count === 1 ? "Review 1 draft" : `Review ${count} drafts`,
    metricSections: "Editable sections",
    metricSectionsHint: "Screens you can edit",
    metricAreas: "Content areas",
    metricDrafts: "Pending drafts",
    metricDraftsWaiting: "Waiting to be published",
    metricDraftsNone: "Everything is published",
    metricVersion: "Live version",
    metricVersionHint: "Currently published",
    readyTitle: (count: number) =>
      count === 1 ? "1 change ready to publish" : `${count} changes ready to publish`,
    readyBody: "Nothing is live until you publish. Review the changes first.",
    reviewAndPublish: "Review & publish",
    recent: "Recently updated",
    recentEmpty: "Nothing has been edited yet.",
  },

  sections: {
    title: "Sections",
    subtitle: "Everything you can edit on the site",
    searchLabel: "Search sections",
    searchPlaceholder: "Search sections…",
    all: "All",
    draftsOnly: "Drafts",
    published: "Published",
    both: "Both",
    emptyTitle: "No sections match that.",
    emptyBody: "Try a different word, or clear the filters.",
    clearSearch: "Clear search",
    filterStatus: "Filter by status",
    filterLanguage: "Filter by language",
  },

  drafts: {
    title: "Drafts",
    subtitleCount: (count: number) =>
      count === 1 ? "1 unpublished change" : `${count} unpublished changes`,
    subtitleNone: "Nothing is waiting to be published",
    emptyTitle: "Everything is published.",
    emptyBody:
      "Edits you save appear here until you publish them. Nothing on the live site is waiting on you.",
    summary: (count: number) =>
      count === 1
        ? "1 section with unpublished changes"
        : `${count} sections with unpublished changes`,
    privacy: "Drafts are private. Nothing reaches the live site until you publish.",
  },

  editor: {
    hasDraft: "Unpublished draft",
    matchesLive: "Matches the live site",
    unsaved: "Unsaved",
    sharedWith: (count: number) =>
      count === 1 ? "Shared with 1 other screen" : `Shared with ${count} other screens`,
    save: "Save draft",
    saving: "Saving…",
    discard: "Discard draft",
    discardHint: "Removes the unpublished changes. The live site is not affected.",
    editIn: (code: string) => `Edit in ${code}`,
    preview: "Preview",
    edit: "Edit",
    conflictTitle: "Someone else changed this while you were editing.",
    conflictShared: (name: string, count: number) =>
      `${count} other screen${count === 1 ? "" : "s"} edit the same content, so this can happen without anyone opening ${name}.`,
    reload: "Reload the latest",
    wouldRemove: (count: number) =>
      `This would remove ${count} field${count === 1 ? "" : "s"}.`,
    typeChanged: (count: number) =>
      `${count} field${count === 1 ? "" : "s"} changed type.`,
    undoFirst: "Undo that change before saving.",
    noPreviewBody:
      "This content appears across the whole site rather than in one section, so there is nothing single to preview. Everything else works the same.",
    switchWarning: "Discard the unsaved changes in this language?",
    saved: "Draft saved.",
    discarded: "Draft discarded. The live site is unchanged.",
    loadFailed: "Could not load this section.",
    saveFailed: "Save failed.",
    discardFailed: "Could not discard the draft.",
  },

  fields: {
    wholeNumber: "whole number",
    number: "number",
    emptyBody: "Empty on purpose — nothing is shown here on the site right now.",
    lockedBody:
      "This list will move to its own management screen in a later release, so it is read-only here rather than teaching a way of working that is about to change.",
    moveUp: (label: string) => `Move ${label} up`,
    moveDown: (label: string) => `Move ${label} down`,
    remove: (label: string) => `Remove ${label}`,
    add: (label: string) => `Add ${label}`,
    item: (index: number) => `Item ${index}`,
  },

  preview: {
    size: "Preview size",
    zoom: "Zoom",
    desktop: "Desktop",
    tablet: "Tablet",
    phone: "Phone",
    reload: "Reload preview",
    of: (name: string) => `${name} preview`,
    fullScreen: "Full screen preview",
    exitFullScreen: "Exit full screen",
  },

  publish: {
    title: "Publish",
    subtitle: (count: number) =>
      count === 1 ? "1 change ready to go live" : `${count} changes ready to go live`,
    subtitleNone: "Nothing is waiting to be published",
    parityOk: "Both languages are complete",
    parityOkBody: "English and Arabic match.",
    parityBad: "Languages do not match",
    parityBadBody:
      "One language has fields the other does not. Add the matching text before publishing.",
    changes: "Changes to publish",
    changed: "Changed",
    counts: (edited: number, added: number, removed: number) =>
      `${edited} edited${added ? ` · ${added} added` : ""}${removed ? ` · ${removed} removed` : ""}`,
    liveNow: "Live now",
    afterPublishing: "After publishing",
    labelField: "Describe this release",
    optional: "(optional)",
    labelPlaceholder: "e.g. Updated hero copy for Q4",
    confirmTitle: (count: number) =>
      count === 1
        ? "Publish 1 change to the live site?"
        : `Publish ${count} changes to the live site?`,
    confirmBody: (version: string) =>
      `Visitors will see this immediately. You can return to version #${version} afterwards from the Versions page.`,
    confirmYes: "Yes, publish now",
    action: (count: number) =>
      count === 1 ? "Publish 1 change" : `Publish ${count} changes`,
    publishing: "Publishing…",
    upToDateTitle: "The live site is up to date.",
    upToDateBody: (version: string | null) =>
      `${version ? `Version #${version} is live. ` : ""}There are no unpublished changes.`,
    done: (number: number) => `Published as version #${number}.`,
    failed: "Publish failed.",
  },

  inbox: {
    title: "Inbox",
    subtitle: "Everything the website's forms have sent",
    searchLabel: "Search by name, email or company",
    empty: "Nothing here",
    emptyBody: "No submissions match the filters above.",
    tabs: { all: "All", contact: "Contact", vendor: "Service providers", career: "Careers" },
    status: { new: "New", read: "Read", replied: "Replied", archived: "Archived" },
    statusLabel: "Status",
    filterStatus: "Any status",
    notNotified: "Not emailed",
    notNotifiedBody:
      "The notification email did not go out. The submission itself is safe — it is stored here.",
    requeue: "Send the email again",
    requeued: "Queued to send again",
    markRead: "Mark as read",
    markReplied: "Mark as replied",
    archive: "Archive",
    reopen: "Reopen",
    reply: "Reply by email",
    received: "Received",
    readAt: "First opened",
    repliedAt: "Replied",
    handledBy: "Handled by",
    details: "Details",
    close: "Close",
    sendTo: "For",
    name: "Name",
    company: "Company",
    contactPerson: "Contact person",
    city: "City",
    service: "Service",
    aramcoVendor: "Aramco vendor",
    aramcoYes: "Registered",
    aramcoNo: "Not registered",
    message: "Message",
    noMessage: "No message — a career application collects four fields.",
    cv: "CV",
    cvDownload: "Download CV",
    cvExpires: "Kept until",
    cvPurged: "Deleted — the retention period ended",
    cvNoPermission: "You do not have permission to download CVs.",
    language: "Sent in",
    total: (count: number) =>
      count === 1 ? "1 submission" : `${count} submissions`,
  },

  media: {
    title: "Media",
    subtitle: "Every image the site shows, and where it shows it",
    searchLabel: "Search by file name",
    empty: "Nothing here yet",
    emptyBody: "Upload an image, or change the filters above.",
    upload: "Upload",
    uploading: "Uploading",
    dropHere: "Drop an image here",
    dropOr: "or choose a file",
    accepts: "JPEG, PNG, WebP or AVIF, up to 10 MB",
    preview: "Preview",
    replaceFile: "Choose a different file",
    grid: "Grid",
    list: "List",
    all: "All",
    used: "In use",
    unused: "Not used",
    usedCount: (count: number) =>
      count === 0 ? "Not used" : count === 1 ? "Used in 1 place" : `Used in ${count} places`,
    dimensions: "Dimensions",
    fileSize: "Size",
    type: "Type",
    added: "Added",
    updated: "Updated",
    fileName: "File name",
    altEn: "Alt text (English)",
    altAr: "Alt text (Arabic)",
    altHelp: "Describe the picture for someone who cannot see it.",
    altMissing: "No alt text",
    category: "Category",
    status: "Status",
    save: "Save",
    saved: "Saved",
    close: "Close",
    usage: "Where it is used",
    usageNone: "Nothing shows this image yet.",
    remove: "Delete",
    removing: "Deleting",
    confirmDelete: "Delete this image?",
    confirmDeleteBody: "The file is removed for good. This cannot be undone.",
    inUseTitle: "This image is in use",
    inUseBody:
      "It is still shown in the places listed above. Remove it from them first, and it can then be deleted.",
    duplicate: "That exact image is already in the library.",
    duplicateBody: "It has been selected for you instead of uploaded again.",
    pick: "Choose an image",
    pickFromLibrary: "From the library",
    pickUpload: "Upload a new one",
    clear: "Remove image",
    coverTitle: "Main image",
    coverBody: "Shown on the card and at the top of the gallery.",
    galleryTitle: "Gallery",
    galleryBody: "Extra photographs, in the order they appear on the site.",
    galleryAdd: "Add a photograph",
    galleryEmpty: "No extra photographs yet.",
    moveUp: "Move earlier",
    moveDown: "Move later",
    makePrimary: "Make this the main image",
    isPrimary: "Main image",
    fromSite: "Bundled with the site",
    fromLibrary: "From the library",
    notManaged: "Still using the image that ships with the site.",
    itemsTitle: "Images in this section",
    itemsBody: "Pick a main image for each entry, and add a gallery where one belongs.",
    noImageSlots: "This section has no images to manage.",
  },

  versions: {
    title: "Versions",
    subtitle: "Every published release, newest first",
    history: "History",
    restored: "Restored",
    restoredFrom: (number: number) => `Restored #${number}`,
    noDescription: "No description",
    pickTitle: "Pick a version",
    pickBody: "Choose a release on the left to see what restoring it would change.",
    versionNumber: (number: number) => `Version #${number}`,
    isCurrent: "This is what the site is showing right now.",
    whatChanges: "What would change",
    changeSummary: (count: number, version: number) =>
      `${count} field${count === 1 ? "" : "s"} across both languages would go back to how they were in version #${version}.`,
    comparing: "Comparing…",
    draftsKeptTitle: (count: number) =>
      count === 1
        ? "1 unpublished draft will be kept."
        : `${count} unpublished drafts will be kept.`,
    draftsKeptBody:
      "That is on purpose — unfinished work is never thrown away. But a draft written before this restore still holds the newer text, so publishing it later would bring part of it back.",
    confirmTitle: (number: number) =>
      `Put version #${number} back on the live site?`,
    confirmBody:
      "This adds a new version rather than deleting anything, so you can undo it.",
    confirmYes: "Yes, restore it",
    restoring: "Restoring…",
    action: (number: number) => `Restore version #${number}`,
    done: (from: number, to: number) => `Version #${from} restored as #${to}.`,
    failed: "Restore failed.",
    label: (number: number) => `Restored version #${number}`,
  },

  login: {
    title: "Wjeen Studio",
    subtitle: "Sign in to edit the website’s content.",
    username: "Username",
    password: "Password",
    submit: "Sign in",
    submitting: "Signing in…",
    rejected: "Those credentials were not accepted.",
    unreachable: "Could not reach the content service.",
    throttled: (minutes: number | null) =>
      minutes
        ? `Too many sign-in attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`
        : "Too many sign-in attempts. Try again later.",
  },

  groups: {
    "Homepage & shared": "Homepage & shared",
    "About page": "About page",
    "Services page": "Services page",
    "Projects page": "Projects page",
    "Careers page": "Careers page",
    "Contact page": "Contact page",
    "Site-wide": "Site-wide",
  },

  time: {
    justNow: "just now",
    minutes: (n: number) => `${n} min ago`,
    hours: (n: number) => `${n} hr ago`,
    yesterday: "yesterday",
    days: (n: number) => `${n} days ago`,
    never: "—",
  },
};

/** Every key the English tree has, so a gap in Arabic fails the build. */
export type Copy = typeof en;

const ar: Copy = {
  brand: { name: "وجين", studio: "الاستوديو", home: "الصفحة الرئيسية للاستوديو" },

  nav: {
    label: "الاستوديو",
    landmark: "قائمة الاستوديو",
    overview: "نظرة عامة",
    media: "الوسائط",
    inbox: "صندوق الرسائل",
    content: "المحتوى",
    sections: "الأقسام",
    drafts: "المسودات",
    publishing: "النشر",
    publish: "نشر",
    versions: "الإصدارات",
    liveVersion: "الإصدار المنشور",
    role: "محرّر",
    signOut: "تسجيل الخروج",
    signedIn: "مسجَّل الدخول",
    open: "فتح القائمة",
    collapse: "طيّ القائمة الجانبية",
    expand: "توسيع القائمة الجانبية",
    breadcrumb: "مسار التصفح",
    language: "اللغة",
    english: "English",
    arabic: "العربية",
  },

  common: {
    loading: "جارٍ التحميل",
    dismiss: "إغلاق",
    cancel: "إلغاء",
    clear: "مسح",
    search: "بحث",
    live: "منشور",
    draft: "مسودة",
    readOnly: "للقراءة فقط",
    noPreview: "بدون معاينة",
    openWebsite: "فتح الموقع",
    of: (shown: number, total: number) => `${shown} من ${total}`,
  },

  overview: {
    title: "نظرة عامة",
    subtitle: "محتوى وجين في لمحة",
    morning: "صباح الخير",
    afternoon: "مساء الخير",
    evening: "مساء الخير",
    greet: (greeting: string, name: string | null) =>
      name ? `${greeting}، ${name}.` : `${greeting}.`,
    headline: "حرّر محتوى وجين، عاين كل تغيير، وانشر حين تكون جاهزًا.",
    browse: "تصفّح الأقسام",
    reviewDrafts: (count: number) =>
      count === 1 ? "مراجعة مسودة واحدة" : `مراجعة ${count} مسودات`,
    metricSections: "أقسام قابلة للتحرير",
    metricSectionsHint: "شاشات تستطيع تحريرها",
    metricAreas: "مساحات المحتوى",
    metricDrafts: "مسودات معلّقة",
    metricDraftsWaiting: "في انتظار النشر",
    metricDraftsNone: "كل شيء منشور",
    metricVersion: "الإصدار المنشور",
    metricVersionHint: "المعروض حاليًا",
    readyTitle: (count: number) =>
      count === 1 ? "تغيير واحد جاهز للنشر" : `${count} تغييرات جاهزة للنشر`,
    readyBody: "لا شيء يظهر على الموقع قبل النشر. راجع التغييرات أولًا.",
    reviewAndPublish: "مراجعة ونشر",
    recent: "آخر التعديلات",
    recentEmpty: "لم يُعدَّل أي شيء بعد.",
  },

  sections: {
    title: "الأقسام",
    subtitle: "كل ما يمكنك تحريره في الموقع",
    searchLabel: "ابحث في الأقسام",
    searchPlaceholder: "ابحث في الأقسام…",
    all: "الكل",
    draftsOnly: "المسودات",
    published: "المنشور",
    both: "الاثنتان",
    emptyTitle: "لا يوجد قسم مطابق.",
    emptyBody: "جرّب كلمة أخرى، أو امسح عوامل التصفية.",
    clearSearch: "مسح البحث",
    filterStatus: "تصفية حسب الحالة",
    filterLanguage: "تصفية حسب اللغة",
  },

  drafts: {
    title: "المسودات",
    subtitleCount: (count: number) =>
      count === 1 ? "تغيير واحد غير منشور" : `${count} تغييرات غير منشورة`,
    subtitleNone: "لا شيء في انتظار النشر",
    emptyTitle: "كل شيء منشور.",
    emptyBody:
      "التعديلات التي تحفظها تظهر هنا حتى تنشرها. لا شيء على الموقع ينتظرك.",
    summary: (count: number) =>
      count === 1
        ? "قسم واحد فيه تغييرات غير منشورة"
        : `${count} أقسام فيها تغييرات غير منشورة`,
    privacy: "المسودات خاصة. لا شيء يصل إلى الموقع قبل أن تنشره.",
  },

  editor: {
    hasDraft: "مسودة غير منشورة",
    matchesLive: "مطابق للموقع المنشور",
    unsaved: "غير محفوظ",
    sharedWith: (count: number) =>
      count === 1 ? "مشترك مع شاشة أخرى" : `مشترك مع ${count} شاشات أخرى`,
    save: "حفظ المسودة",
    saving: "جارٍ الحفظ…",
    discard: "حذف المسودة",
    discardHint: "يحذف التغييرات غير المنشورة. الموقع المنشور لا يتأثر.",
    editIn: (code: string) => `التحرير بـ${code === "ar" ? "العربية" : "الإنجليزية"}`,
    preview: "معاينة",
    edit: "تحرير",
    conflictTitle: "شخص آخر عدّل هذا أثناء تحريرك.",
    conflictShared: (name: string, count: number) =>
      `${count === 1 ? "شاشة أخرى تحرّر" : `${count} شاشات أخرى تحرّر`} المحتوى نفسه، فقد يحدث هذا دون أن يفتح أحد ${name}.`,
    reload: "إعادة تحميل أحدث نسخة",
    wouldRemove: (count: number) =>
      count === 1 ? "هذا سيحذف حقلًا واحدًا." : `هذا سيحذف ${count} حقول.`,
    typeChanged: (count: number) =>
      count === 1 ? "تغيّر نوع حقل واحد." : `تغيّر نوع ${count} حقول.`,
    undoFirst: "تراجع عن هذا التغيير قبل الحفظ.",
    noPreviewBody:
      "هذا المحتوى يظهر في الموقع كله لا في قسم واحد، فلا توجد معاينة مفردة له. وكل شيء آخر يعمل بالطريقة نفسها.",
    switchWarning: "هل تريد حذف التغييرات غير المحفوظة في هذه اللغة؟",
    saved: "حُفظت المسودة.",
    discarded: "حُذفت المسودة. الموقع المنشور لم يتغيّر.",
    loadFailed: "تعذّر تحميل هذا القسم.",
    saveFailed: "فشل الحفظ.",
    discardFailed: "تعذّر حذف المسودة.",
  },

  fields: {
    wholeNumber: "رقم صحيح",
    number: "رقم",
    emptyBody: "فارغ عن قصد — لا شيء يظهر هنا في الموقع حاليًا.",
    lockedBody:
      "هذه القائمة ستنتقل إلى شاشة إدارة خاصة بها لاحقًا، فهي للقراءة فقط هنا بدل تعليم طريقة عمل على وشك التغيير.",
    moveUp: (label: string) => `تحريك ${label} للأعلى`,
    moveDown: (label: string) => `تحريك ${label} للأسفل`,
    remove: (label: string) => `حذف ${label}`,
    add: (label: string) => `إضافة ${label}`,
    item: (index: number) => `العنصر ${index}`,
  },

  preview: {
    size: "حجم المعاينة",
    zoom: "التكبير",
    desktop: "سطح المكتب",
    tablet: "لوحي",
    phone: "جوال",
    reload: "إعادة تحميل المعاينة",
    of: (name: string) => `معاينة ${name}`,
    fullScreen: "معاينة بملء الشاشة",
    exitFullScreen: "الخروج من ملء الشاشة",
  },

  publish: {
    title: "النشر",
    subtitle: (count: number) =>
      count === 1 ? "تغيير واحد جاهز للنشر" : `${count} تغييرات جاهزة للنشر`,
    subtitleNone: "لا شيء في انتظار النشر",
    parityOk: "اللغتان مكتملتان",
    parityOkBody: "العربية والإنجليزية متطابقتان.",
    parityBad: "اللغتان غير متطابقتين",
    parityBadBody:
      "إحدى اللغتين فيها حقول ليست في الأخرى. أضف النص المقابل قبل النشر.",
    changes: "التغييرات المطلوب نشرها",
    changed: "معدَّل",
    counts: (edited: number, added: number, removed: number) =>
      `${edited} معدَّل${added ? ` · ${added} مضاف` : ""}${removed ? ` · ${removed} محذوف` : ""}`,
    liveNow: "المنشور الآن",
    afterPublishing: "بعد النشر",
    labelField: "صف هذا الإصدار",
    optional: "(اختياري)",
    labelPlaceholder: "مثال: تحديث نص الواجهة",
    confirmTitle: (count: number) =>
      count === 1
        ? "هل تنشر تغييرًا واحدًا على الموقع؟"
        : `هل تنشر ${count} تغييرات على الموقع؟`,
    confirmBody: (version: string) =>
      `سيراها الزوار فورًا. ويمكنك العودة إلى الإصدار رقم ${version} لاحقًا من صفحة الإصدارات.`,
    confirmYes: "نعم، انشر الآن",
    action: (count: number) =>
      count === 1 ? "نشر تغيير واحد" : `نشر ${count} تغييرات`,
    publishing: "جارٍ النشر…",
    upToDateTitle: "الموقع المنشور محدَّث.",
    upToDateBody: (version: string | null) =>
      `${version ? `الإصدار رقم ${version} منشور. ` : ""}لا توجد تغييرات غير منشورة.`,
    done: (number: number) => `نُشر كإصدار رقم ${number}.`,
    failed: "فشل النشر.",
  },

  inbox: {
    title: "صندوق الرسائل",
    subtitle: "كل ما أرسلته نماذج الموقع",
    searchLabel: "ابحث بالاسم أو البريد أو الشركة",
    empty: "لا يوجد شيء",
    emptyBody: "لا توجد رسائل تطابق عوامل التصفية.",
    tabs: { all: "الكل", contact: "تواصل", vendor: "مزودو الخدمة", career: "وظائف" },
    status: { new: "جديدة", read: "مقروءة", replied: "تم الرد", archived: "مؤرشفة" },
    statusLabel: "الحالة",
    filterStatus: "أي حالة",
    notNotified: "لم يُرسل بريد",
    notNotifiedBody:
      "لم يُرسل بريد الإشعار. الرسالة نفسها محفوظة هنا ولم تُفقد.",
    requeue: "إعادة إرسال البريد",
    requeued: "أُدرجت لإعادة الإرسال",
    markRead: "تعليم كمقروءة",
    markReplied: "تعليم كمُجاب عليها",
    archive: "أرشفة",
    reopen: "إعادة فتح",
    reply: "الرد بالبريد",
    received: "وردت",
    readAt: "أول فتح",
    repliedAt: "تم الرد",
    handledBy: "تولّاها",
    details: "التفاصيل",
    close: "إغلاق",
    sendTo: "موجهة إلى",
    name: "الاسم",
    company: "الشركة",
    contactPerson: "مسؤول التواصل",
    city: "المدينة",
    service: "نوع الخدمة",
    aramcoVendor: "مورّد أرامكو",
    aramcoYes: "معتمد",
    aramcoNo: "غير معتمد",
    message: "الرسالة",
    noMessage: "لا رسالة — طلب الوظيفة يجمع أربعة حقول.",
    cv: "السيرة الذاتية",
    cvDownload: "تنزيل السيرة",
    cvExpires: "محفوظة حتى",
    cvPurged: "حُذفت — انتهت مدة الاحتفاظ",
    cvNoPermission: "لا تملك صلاحية تنزيل السير الذاتية.",
    language: "أُرسلت بـ",
    total: (count: number) =>
      count === 1 ? "رسالة واحدة" : `${count} رسالة`,
  },

  media: {
    title: "الوسائط",
    subtitle: "كل صورة يعرضها الموقع، وأين تُعرض",
    searchLabel: "ابحث باسم الملف",
    empty: "لا يوجد شيء بعد",
    emptyBody: "ارفع صورة، أو غيّر عوامل التصفية بالأعلى.",
    upload: "رفع",
    uploading: "جارٍ الرفع",
    dropHere: "أفلِت صورة هنا",
    dropOr: "أو اختر ملفًا",
    accepts: "JPEG أو PNG أو WebP أو AVIF، حتى ١٠ ميغابايت",
    preview: "معاينة",
    replaceFile: "اختر ملفًا آخر",
    grid: "شبكة",
    list: "قائمة",
    all: "الكل",
    used: "مستخدمة",
    unused: "غير مستخدمة",
    usedCount: (count: number) =>
      count === 0 ? "غير مستخدمة" : count === 1 ? "مستخدمة في موضع واحد" : `مستخدمة في ${count} مواضع`,
    dimensions: "الأبعاد",
    fileSize: "الحجم",
    type: "النوع",
    added: "أُضيفت",
    updated: "حُدِّثت",
    fileName: "اسم الملف",
    altEn: "النص البديل (إنجليزي)",
    altAr: "النص البديل (عربي)",
    altHelp: "صِف الصورة لمن لا يستطيع رؤيتها.",
    altMissing: "بلا نص بديل",
    category: "التصنيف",
    status: "الحالة",
    save: "حفظ",
    saved: "حُفظت",
    close: "إغلاق",
    usage: "أين تُستخدم",
    usageNone: "لا شيء يعرض هذه الصورة بعد.",
    remove: "حذف",
    removing: "جارٍ الحذف",
    confirmDelete: "حذف هذه الصورة؟",
    confirmDeleteBody: "سيُحذف الملف نهائيًا، ولا يمكن التراجع.",
    inUseTitle: "هذه الصورة مستخدمة",
    inUseBody:
      "ما زالت معروضة في المواضع المذكورة أعلاه. أزِلها منها أولًا، ثم يمكن حذفها.",
    duplicate: "هذه الصورة نفسها موجودة في المكتبة.",
    duplicateBody: "تم اختيارها لك بدل رفعها مرة أخرى.",
    pick: "اختر صورة",
    pickFromLibrary: "من المكتبة",
    pickUpload: "ارفع صورة جديدة",
    clear: "إزالة الصورة",
    coverTitle: "الصورة الرئيسية",
    coverBody: "تُعرض على البطاقة وفي صدر المعرض.",
    galleryTitle: "المعرض",
    galleryBody: "صور إضافية، بالترتيب الذي تظهر به على الموقع.",
    galleryAdd: "أضف صورة",
    galleryEmpty: "لا توجد صور إضافية بعد.",
    moveUp: "تقديم",
    moveDown: "تأخير",
    makePrimary: "اجعلها الصورة الرئيسية",
    isPrimary: "الصورة الرئيسية",
    fromSite: "مرفقة مع الموقع",
    fromLibrary: "من المكتبة",
    notManaged: "ما زالت تستخدم الصورة المرفقة مع الموقع.",
    itemsTitle: "صور هذا القسم",
    itemsBody: "اختر صورة رئيسية لكل عنصر، وأضف معرضًا حيث يلزم.",
    noImageSlots: "لا توجد صور لإدارتها في هذا القسم.",
  },

  versions: {
    title: "الإصدارات",
    subtitle: "كل إصدار منشور، الأحدث أولًا",
    history: "السجل",
    restored: "مستعاد",
    restoredFrom: (number: number) => `مستعاد من ${number}`,
    noDescription: "بدون وصف",
    pickTitle: "اختر إصدارًا",
    pickBody: "اختر إصدارًا من القائمة لترى ما الذي سيتغيّر عند استعادته.",
    versionNumber: (number: number) => `الإصدار رقم ${number}`,
    isCurrent: "هذا ما يعرضه الموقع الآن.",
    whatChanges: "ما الذي سيتغيّر",
    changeSummary: (count: number, version: number) =>
      `${count === 1 ? "حقل واحد" : `${count} حقول`} في اللغتين سيعود إلى ما كان عليه في الإصدار رقم ${version}.`,
    comparing: "جارٍ المقارنة…",
    draftsKeptTitle: (count: number) =>
      count === 1
        ? "سيتم الاحتفاظ بمسودة واحدة غير منشورة."
        : `سيتم الاحتفاظ بـ${count} مسودات غير منشورة.`,
    draftsKeptBody:
      "هذا مقصود — العمل غير المكتمل لا يُحذف أبدًا. لكن المسودة المكتوبة قبل هذه الاستعادة ما زالت تحمل النص الأحدث، فنشرها لاحقًا سيعيد جزءًا منه.",
    confirmTitle: (number: number) =>
      `هل تعيد الإصدار رقم ${number} إلى الموقع؟`,
    confirmBody: "هذا يضيف إصدارًا جديدًا ولا يحذف شيئًا، فيمكنك التراجع عنه.",
    confirmYes: "نعم، استعده",
    restoring: "جارٍ الاستعادة…",
    action: (number: number) => `استعادة الإصدار رقم ${number}`,
    done: (from: number, to: number) => `استُعيد الإصدار رقم ${from} كإصدار ${to}.`,
    failed: "فشلت الاستعادة.",
    label: (number: number) => `استعادة الإصدار رقم ${number}`,
  },

  login: {
    title: "استوديو وجين",
    subtitle: "سجّل الدخول لتحرير محتوى الموقع.",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    submit: "تسجيل الدخول",
    submitting: "جارٍ تسجيل الدخول…",
    rejected: "بيانات الدخول غير صحيحة.",
    unreachable: "تعذّر الوصول إلى خدمة المحتوى.",
    throttled: (minutes: number | null) =>
      minutes
        ? `محاولات دخول كثيرة. حاول مرة أخرى بعد ${minutes} دقيقة تقريبًا.`
        : "محاولات دخول كثيرة. حاول مرة أخرى لاحقًا.",
  },

  groups: {
    "Homepage & shared": "الرئيسية والمشترك",
    "About page": "صفحة من نحن",
    "Services page": "صفحة الخدمات",
    "Projects page": "صفحة المشاريع",
    "Careers page": "صفحة الوظائف",
    "Contact page": "صفحة التواصل",
    "Site-wide": "على مستوى الموقع",
  },

  time: {
    justNow: "الآن",
    minutes: (n: number) => `منذ ${n} دقيقة`,
    hours: (n: number) => `منذ ${n} ساعة`,
    yesterday: "أمس",
    days: (n: number) => `منذ ${n} يوم`,
    never: "—",
  },
};

const COPY: Record<StudioLocale, Copy> = { en, ar };

export function isStudioLocale(value: string): value is StudioLocale {
  return value === "en" || value === "ar";
}

export function studioCopy(locale: string): Copy {
  return COPY[isStudioLocale(locale) ? locale : "en"];
}

export const OTHER_LOCALE: Record<StudioLocale, StudioLocale> = { en: "ar", ar: "en" };
