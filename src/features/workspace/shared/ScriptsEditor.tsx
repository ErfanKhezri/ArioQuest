import { useState } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { Segmented } from "@/components/ui/Tabs";
import type { ApiRequest } from "@/core/types";

interface Snippet {
  label: string;
  code: string;
}

const testSnippets: Snippet[] = [
  {
    label: "Status code is 200",
    code: 'aq.test("Status code is 200", () => {\n  aq.expect(aq.response.code).to.equal(200);\n});',
  },
  {
    label: "Response time below 500 ms",
    code: 'aq.test("Response time is below 500 ms", () => {\n  aq.expect(aq.response.responseTime).to.be.below(500);\n});',
  },
  {
    label: "Check a JSON value",
    code: 'aq.test("Body has the expected value", () => {\n  const json = aq.response.json();\n  aq.expect(json.id).to.exist;\n});',
  },
  {
    label: "Header is present",
    code: 'aq.test("Content-Type is JSON", () => {\n  aq.expect(aq.response.headers.get("content-type")).to.include("json");\n});',
  },
  {
    label: "Save value to environment",
    code: 'aq.environment.set("token", aq.response.json().token);',
  },
  { label: "Log the response", code: "console.log(aq.response.json());" },
];

const preSnippets: Snippet[] = [
  {
    label: "Set a variable",
    code: 'aq.variables.set("requestTime", new Date().toISOString());',
  },
  { label: "Add a header", code: 'aq.request.headers["X-Request-Id"] = crypto.randomUUID();' },
  {
    label: "Read environment variable",
    code: 'const baseUrl = aq.environment.get("baseUrl");\nconsole.log("Calling", baseUrl);',
  },
];

interface ScriptsEditorProps {
  request: ApiRequest;
  onChange: (patch: Pick<ApiRequest, "preScript"> | Pick<ApiRequest, "testScript">) => void;
}

export function ScriptsEditor({ request, onChange }: ScriptsEditorProps) {
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
            { value: "pre", label: `Pre-request${request.preScript.trim() ? " •" : ""}` },
            { value: "test", label: `Post-response${request.testScript.trim() ? " •" : ""}` },
          ]}
        />
        <span className="text-[11px] text-subtle">
          {phase === "pre"
            ? "Runs before the request is sent. Edit aq.request or set variables."
            : "Runs after the response arrives. Use aq.test() and aq.expect(); pm.* also works."}
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
        <aside className="hidden w-52 shrink-0 overflow-y-auto border-l border-line p-3 lg:block">
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-subtle uppercase">
            Snippets
          </p>
          <ul className="space-y-0.5">
            {snippets.map((s) => (
              <li key={s.label}>
                <button
                  type="button"
                  onClick={() =>
                    set(value.trim() ? `${value.trimEnd()}\n\n${s.code}\n` : `${s.code}\n`)
                  }
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-brand-600 transition-colors hover:bg-panel-2 dark:text-brand-300"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
