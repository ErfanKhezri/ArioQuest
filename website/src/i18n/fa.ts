import type { Strings } from "@/i18n/types";
import type { site as en } from "./en";

/** Persian text for the website. Technical terms stay in English, as in the app. */
export const site: Strings<typeof en> = {
  meta: {
    title: "ArioQuest — کلاینت API برای HTTP و gRPC روی ویندوز",
    description:
      "ArioQuest یک کلاینت API برای ویندوز است: درخواست‌های HTTP و gRPC، اسکریپت‌های تست JavaScript، اجرای کالکشن، و آریو که به هر پاسخ واکنش نشان می‌دهد.",
  },

  ui: {
    send: "ارسال",
    sending: "در حال ارسال",
    params: "پارامترها",
    headers: "هدرها",
    body: "بادی",
    auth: "احراز هویت",
    scripts: "اسکریپت‌ها",
    tests: "تست‌ها",
    message: "پیام",
    metadata: "Metadata",
    response: "پاسخ",
    noResponse: "هنوز پاسخی نیامده",
    waiting: "در انتظار پاسخ…",
    completed: "تمام شد · OK",
    ready: "آماده",
    collection: "شروع کار",
    untitled: "درخواست بی‌نام",
    form: "فرم",
    binary: "Binary",
    testsPassed: "تست‌ها: {{passed}}/{{total}} موفق",
    score: "{{passed}}/{{total}} موفق",
    passed: "{{count}} موفق",
    failed: "{{count}} ناموفق",
    requests: {
      listPosts: "فهرست پست‌ها",
      getPost: "دریافت پست",
      createPost: "ساخت پست",
      updatePost: "ویرایش پست",
      getMissingPost: "دریافت پست ناموجود",
      deletePost: "حذف پست",
    },
  },

  language: {
    title: "زبان",
  },

  dialog: {
    close: "بستن",
  },

  nav: {
    features: "امکانات",
    tryOnline: "امتحان آنلاین",
    toLight: "رفتن به حالت روشن",
    toDark: "رفتن به حالت تیره",
  },

  actions: {
    downloadVersion: "دانلود نسخهٔ {{version}} برای ویندوز",
    download: "دانلود برای ویندوز",
    downloadShort: "دانلود",
    // \u200f (a right-to-left mark) keeps the full stop after "x64" on the Persian side.
    windows: "ویندوز ۱۰ و ۱۱، x64\u200f",
    getMsi: "دریافت فایل msi",
    tryOnline: "امتحان آنلاین",
    desktopBest: "روی صفحهٔ دسکتاپ بهتر کار می‌کند",
    noSignup: "در مرورگر اجرا می‌شود، بدون ثبت‌نام",
    viewGithub: "مشاهده در GitHub",
    stars: "ستاره",
  },

  demoDesktop: {
    title: "دمو را روی دسکتاپ باز کنید",
    body: "دموی آنلاین همان برنامهٔ کامل ArioQuest است و صفحهٔ بزرگ‌تری لازم دارد. این لینک را روی کامپیوترتان باز کنید.",
    copy: "کپی لینک",
    copied: "کپی شد",
    ok: "متوجه شدم",
  },

  hero: {
    eyebrow: "اپ دسکتاپ رایگان · HTTP + gRPC",
    title: "با دستیار API خودت آشنا شو.",
    lead: "ArioQuest یک کلاینت API برای ویندوز است که HTTP و gRPC را پشتیبانی می‌کند. درخواست بفرستید، اسکریپت‌های تست و کل کالکشن‌ها را اجرا کنید، و آریو می‌گوید هر کدام چطور پیش رفت.",
    typing: "کجا می‌ریم؟",
    sending: "در حال ارسال…",
    say: {
      getPost: "۲۰۰! هر دو تست موفق بودن.",
      createPost: "۲۰۱، ساخته شد. تست‌ها موفقن.",
      getMissingPost: "۴۰۴… این پست وجود نداره.",
    },
    arioSays: "آریو: {{line}}",
  },

  protocols: {
    title: "HTTP و gRPC در یک جا",
    body: "همهٔ متدها، بادی از JSON تا multipart و GraphQL، و احراز هویت bearer و basic و API key. در کنارش gRPC از روی فایل‌های <code>.proto</code> یا server reflection: unary و server و client و bidirectional streaming، بدون نیاز به نصب <code>protoc</code>.",
    invoke: "فراخوانی",
    stream: "استریم",
    messages: "{{count}} پیام",
  },

  testing: {
    title: "اسکریپت‌های فعلی‌تان همین‌طور اجرا می‌شوند",
    body: "اسکریپت‌های پیش از درخواست و تست یک API به نام <code>aq</code> دارند که با نام <code>pm</code> هم در دسترس است، با expectهای سبک chai یا jest. یا اصلاً کد ننویسید: شرط‌های بدون کد، status، هدرها، مسیرهای JSON، بادی و زمان پاسخ را بررسی می‌کنند.",
    eitherWay: "هر جور که دوست دارید بنویسید",
    prefix: "پیشوند اسکریپت",
    copyScript: "کپی اسکریپت",
    copy: "کپی",
    copied: "کپی شد",
    header: "هدر",
    variable: "متغیر",
    environment: "محیط",
  },

  runner: {
    title: "کل کالکشن را اجرا کنید",
    body: "یک کالکشن یا پوشه را به‌ترتیب و در چند تکرار اجرا کنید و نتیجهٔ تست‌های هر درخواست را ببینید. تنظیمات کنار را تغییر دهید و دوباره اجرا کنید.",
    iteration: "تکرار {{current}} از {{total}}",
    skipped: "رد شد",
    settings: "تنظیمات اجرا",
    iterations: "تعداد تکرار",
    fewer: "تکرار کمتر",
    more: "تکرار بیشتر",
    delay: "تأخیر (ms)",
    stopOnFailure: "توقف در اولین شکست",
    stop: "توقف",
    run: "اجرای کالکشن",
    demoNote:
      "<demo>نسخهٔ نمایشی وب</demo> یک کالکشن نمونه دارد که روی JSONPlaceholder اجرا می‌شود.",
  },

  import: {
    title: "cURL را paste کنید، درخواست تحویل بگیرید",
    body: "یک دستور cURL را در نوار URL paste کنید تا با هدرها و بادی به یک درخواست تبدیل شود. فایل‌های کالکشن (v2.0 و v2.1) و محیط‌ها هم وارد می‌شوند، و از هر چیزی می‌توانید خروجی کالکشن v2.1، cURL یا <code>fetch</code> بگیرید.",
    urlLabel: "URL، یا یک دستور cURL را paste کنید",
    placeholder: "یک دستور cURL را paste کنید",
    headers: "هدرها {{count}}",
    none: "هیچ",
    empty: "خالی",
    again: "دوباره paste کردن نمونه",
    private: "یا دستور خودتان را paste کنید. از این صفحه بیرون نمی‌رود.",
  },

  keyboard: {
    title: "دست‌ها روی کیبورد می‌مانند",
    body: "همین حالا میان‌برها را روی کیبوردتان بزنید تا پنجرهٔ این صفحه جواب بدهد، یا روی کلیدها کلیک کنید. در برنامه Ctrl+Tab هم بین تب‌ها جابه‌جا می‌شود.",
    does: {
      k: "پالت فرمان",
      enter: "ارسال درخواست",
      s: "ذخیره",
      n: "تب جدید",
      w: "بستن تب",
      e: "محیط بعدی",
      o: "وارد کردن",
    },
    staging: "Staging",
    noEnvironment: "بدون محیط",
    commands: {
      newHttp: "درخواست HTTP جدید",
      newGrpc: "درخواست gRPC جدید",
      run: "اجرای کالکشن…",
      import: "وارد کردن…",
      theme: "تغییر تم",
    },
    typeCommand: "یک فرمان بنویسید…",
    saved: "«{{name}}» در «شروع کار» ذخیره شد",
    importToast: "وارد کردن: کالکشن، محیط، cURL یا JSON خروجی ArioQuest",
    pressSend: "هنوز پاسخی نیامده. Ctrl+Enter را بزنید.",
    allClosed: "همهٔ تب‌ها بسته شدند. Ctrl+N را بزنید.",
  },

  moods: {
    title: "آریو دربارهٔ خطاهای 500 احساسات دارد",
    body: "روی 2xx خوشحال است، روی ریدایرکت کنجکاو، روی 4xx ناراحت، و وقتی سرور خراب شود یا جواب ندهد نگران. قبل از اینکه خط وضعیت را بخوانید می‌فهمید درخواست چطور پیش رفت.",
    timedOut: "مهلت تمام شد",
    refused: "اتصال برقرار نشد",
  },

  finalCta: {
    title: "اولین درخواستتان را بفرستید",
    body: "همین حالا در مرورگر امتحانش کنید، یا نسخهٔ دسکتاپ را برای gRPC و درخواست‌های بدون محدودیت CORS نصب کنید.",
  },

  footer: {
    tagline: "یک کلاینت API برای ویندوز، ساخته‌شده با Tauri و React و Rust.",
    label: "پانویس",
    tryOnline: "امتحان آنلاین",
    releases: "نسخه‌ها",
    docs: "مستندات",
    star: "در GitHub ستاره بدهید",
  },
};
