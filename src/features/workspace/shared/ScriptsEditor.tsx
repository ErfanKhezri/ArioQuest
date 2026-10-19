import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { Segmented } from "@/components/ui/Tabs";
import type { ApiRequest } from "@/core/types";
import type { app } from "@/i18n/locales/en";

type SnippetId = keyof typeof app.scripts.snippet;

interface Snippet {
  label: SnippetId;
  code: string;
}

const testSnippets: Snippet[] = [
  {
    label: "status200",
    code: 'aq.test("Status code is 200", () => {\n  aq.expect(aq.response.code).to.equal(200);\n});',
  },
  {
    label: "responseTime",
    code: 'aq.test("Response time is below 500 ms", () => {\n  aq.expect(aq.response.responseTime).to.be.below(500);\n});',
  },
  {
    label: "jsonValue",
    code: 'aq.test("Body has the expected value", () => {\n  const json = aq.response.json();\n  aq.expect(json.id).to.exist;\n});',
  },
  {
    label: "header",
    code: 'aq.test("Content-Type is JSON", () => {\n  aq.expect(aq.response.headers.get("content-type")).to.include("json");\n});',
  },
  {
    label: "saveToEnvironment",
    code: 'aq.environment.set("token", aq.response.json().token);',
  },
  { label: "logResponse", code: "console.log(aq.response.json());" },
];

const preSnippets: Snippet[] = [
  {
    label: "setVariable",
    code: 'aq.variables.set("requestTime", new Date().toISOString());',
  },
  { label: "addHeader", code: 'aq.request.headers["X-Request-Id"] = crypto.randomUUID();' },
  {
    label: "readEnvironment",
    code: 'const baseUrl = aq.environment.get("baseUrl");\nconsole.log("Calling", baseUrl);',
  },
];

interface ScriptsEditorProps {
  request: ApiRequest;
  onChange: (patch: Pick<ApiRequest, "preScript"> | Pick<ApiRequest, "testScript">) => void;
}

export function ScriptsEditor({ request, onChange }: ScriptsEditorProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"pre" | "test">(
    request.preScript && !request.testScript ? "pre" : "test",
  );
  const value = phase === "pre" ? request.preScript : request.testScript;
  const set = (code: string) =>
    onChange(phase === "pre" ? { preScript: code } : { testScript: code });
  const snippets = phase === "pre" ? preSnippets : testSnippets;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 px-4 py-2">
        <Segmented
          value={phase}
          onChange={setPhase}
          options={[
            {
              value: "pre",
              label: `${t("scripts.preRequest")}${request.preScript.trim() ? " •" : ""}`,
            },
            {
              value: "test",
              label: `${t("scripts.postResponse")}${request.testScript.trim() ? " •" : ""}`,
            },
          ]}
        />
        <span className="text-xs text-subtle">
          {phase === "pre" ? t("scripts.preHint") : t("scripts.postHint")}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 border-t border-line">
        <div className="min-w-0 flex-1">
          <CodeEditor
            value={value}
            onChange={set}
            language="javascript"
            placeholder={
              phase === "pre"
                ? "// e.g. aq.variables.set('nonce', Date.now())"
                : "// e.g. aq.test('ok', () => aq.response.to.have.status(200))"
            }
          />
        </div>
        <aside className="hidden w-52 shrink-0 overflow-y-auto border-s border-line p-3 lg:block">
          <p className="mb-2 text-xs font-medium text-subtle">{t("scripts.snippets")}</p>
          <ul className="space-y-0.5">
            {snippets.map((s) => (
              <li key={s.label}>
                <button
                  type="button"
                  onClick={() =>
                    set(value.trim() ? `${value.trimEnd()}\n\n${s.code}\n` : `${s.code}\n`)
                  }
                  className="w-full rounded-md px-2 py-2 text-start text-xs text-accent hover:bg-panel-2"
                >
                  {t(`scripts.snippet.${s.label}`)}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
