/**
 * English text for the website. `fa.ts` must have the same keys; TypeScript
 * checks every `t("…")` call against this file. Text inside the app mock-ups
 * uses the same words as the app itself.
 */
export const site = {
  meta: {
    title: "ArioQuest — API client for HTTP and gRPC on Windows",
    description:
      "ArioQuest is an API client for Windows. HTTP and gRPC requests, JavaScript test scripts, a collection runner, and Ario, who reacts to every response.",
  },

  /** Words shared by the app mock-ups on the page. */
  ui: {
    send: "Send",
    sending: "Sending",
    params: "Params",
    headers: "Headers",
    body: "Body",
    auth: "Auth",
    scripts: "Scripts",
    tests: "Tests",
    message: "Message",
    metadata: "Metadata",
    response: "Response",
    noResponse: "No response yet",
    waiting: "Waiting for the response…",
    completed: "Completed · OK",
    ready: "Ready",
    collection: "Getting started",
    untitled: "Untitled request",
    form: "Form",
    binary: "Binary",
    testsPassed: "Tests {{passed}}/{{total}} passed",
    score: "{{passed}}/{{total}} passed",
    passed: "{{count}} passed",
    failed: "{{count}} failed",
    requests: {
      listPosts: "List posts",
      getPost: "Get post",
      createPost: "Create post",
      updatePost: "Update post",
      getMissingPost: "Get missing post",
      deletePost: "Delete post",
    },
  },

  language: {
    title: "Language",
  },

  dialog: {
    close: "Close",
  },

  nav: {
    features: "Features",
    tryOnline: "Try online",
    toLight: "Switch to light mode",
    toDark: "Switch to dark mode",
  },

  actions: {
    downloadVersion: "Download v{{version}} for Windows",
    download: "Download for Windows",
    downloadShort: "Download",
    windows: "Windows 10 and 11, x64",
    getMsi: "Get the .msi",
    tryOnline: "Try it online",
    desktopBest: "Works best on a desktop screen",
    noSignup: "Runs in your browser, no sign-up",
    viewGithub: "View on GitHub",
    stars: "stars",
  },

  demoDesktop: {
    title: "Open the demo on a desktop",
    body: "The online demo is the full ArioQuest app and needs a bigger screen. Open this link on your computer to try it.",
    copy: "Copy link",
    copied: "Copied",
    ok: "Got it",
  },

  hero: {
    eyebrow: "Free desktop app · HTTP + gRPC",
    title: "Meet your API sidekick.",
    lead: "ArioQuest is a Windows API client for HTTP and gRPC. Send requests, run your test scripts and whole collections, and Ario tells you how each one went.",
    typing: "Where are we going?",
    sending: "Sending…",
    say: {
      getPost: "200! Both tests passed.",
      createPost: "201, created. Tests pass.",
      getMissingPost: "404… that post isn't there.",
    },
    arioSays: "Ario: {{line}}",
  },

  protocols: {
    title: "HTTP and gRPC in one place",
    body: "Every method, JSON to multipart to GraphQL bodies, bearer, basic and API-key auth. Next to it, gRPC from <code>.proto</code> files or server reflection: unary, server, client and bidirectional streaming, with no <code>protoc</code> to install.",
    invoke: "Invoke",
    stream: "Stream",
    messages: "{{count}} messages",
  },

  testing: {
    title: "Existing scripts just run",
    body: "Pre-request and test scripts get an <code>aq</code> API that is also exposed as <code>pm</code>, with chai or jest style expectations. Or skip the code: no-code assertions check status, headers, JSON paths, body and response time.",
    eitherWay: "Write it either way",
    prefix: "Script prefix",
    copyScript: "Copy the script",
    copy: "Copy",
    copied: "Copied",
    header: "Header",
    variable: "Variable",
    environment: "Environment",
  },

  runner: {
    title: "Run the whole collection",
    body: "Run a collection or folder in order, for several iterations, and see every request’s test results. Change the settings on the right and run it again.",
    iteration: "Iteration {{current}} of {{total}}",
    skipped: "Skipped",
    settings: "Run settings",
    iterations: "Iterations",
    fewer: "Fewer iterations",
    more: "More iterations",
    delay: "Delay (ms)",
    stopOnFailure: "Stop on first failure",
    stop: "Stop",
    run: "Run collection",
    demoNote:
      "The <demo>web demo</demo> comes with a sample collection to run against JSONPlaceholder.",
  },

  import: {
    title: "Paste cURL, get a request",
    body: "Paste a cURL command into the URL bar and it becomes a request, headers and body included. Collection files (v2.0, v2.1) and environments import too, and anything exports as a v2.1 collection, cURL or <code>fetch</code>.",
    urlLabel: "URL, or paste a cURL command",
    placeholder: "Paste a cURL command",
    headers: "Headers {{count}}",
    none: "None",
    empty: "Empty",
    again: "Paste the example again",
    private: "Or paste your own. It never leaves this page.",
  },

  keyboard: {
    title: "Hands stay on the keyboard",
    body: "Press the shortcuts on your keyboard now and the window on this page answers, or tap the keys. Ctrl+Tab cycles tabs in the app too.",
    does: {
      k: "Command palette",
      enter: "Send the request",
      s: "Save",
      n: "New tab",
      w: "Close tab",
      e: "Next environment",
      o: "Import",
    },
    staging: "Staging",
    noEnvironment: "No environment",
    commands: {
      newHttp: "New HTTP request",
      newGrpc: "New gRPC request",
      run: "Run collection…",
      import: "Import…",
      theme: "Toggle theme",
    },
    typeCommand: "Type a command…",
    saved: "Saved “{{name}}” to Getting started",
    importToast: "Import: collection, environment, cURL or ArioQuest JSON",
    pressSend: "No response yet. Press Ctrl+Enter.",
    allClosed: "All tabs closed. Press Ctrl+N.",
  },

  moods: {
    title: "Ario has feelings about 500s",
    body: "Happy on a 2xx, curious on a redirect, upset on a 4xx and alarmed when the server breaks or never answers. You know how a request went before you read the status line.",
    timedOut: "Timed out",
    refused: "Connection refused",
  },

  finalCta: {
    title: "Send your first request",
    body: "Try it in the browser right now, or install the desktop app for gRPC and requests with no CORS limits.",
  },

  footer: {
    tagline: "An API client for Windows, built with Tauri, React and Rust.",
    label: "Footer",
    tryOnline: "Try it online",
    releases: "Releases",
    docs: "Documentation",
    star: "Star it on GitHub",
  },
};
