import { useTranslation } from "react-i18next";
import { IconButton, Checkbox, Select } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import {
  assertionOperators,
  assertionSources,
  operatorLabel,
  operatorNeedsValue,
  sourceLabel,
  sourceNeedsProperty,
} from "@/core/assertions";
import { newAssertion, newExtraction } from "@/core/factory";
import type { ApiRequest, Assertion, Extraction } from "@/core/types";
import { cn } from "@/lib/cn";

const cell =
  "h-8 w-full min-w-0 bg-transparent px-2 font-mono text-xs outline-none placeholder:text-subtle/70 focus:bg-panel-2/60";

interface TestsEditorProps {
  request: ApiRequest;
  onChange: (patch: Pick<ApiRequest, "assertions"> | Pick<ApiRequest, "extractions">) => void;
}

/** No-code checks and variable extraction that run after every response. */
export function TestsEditor({ request, onChange }: TestsEditorProps) {
  const { t } = useTranslation();
  const isGrpc = request.kind === "grpc";
  // Header assertions also match gRPC metadata; gRPC status only makes sense for gRPC.
  const sources = (
    isGrpc ? assertionSources : assertionSources.filter((s) => s !== "grpcStatus")
  ).map((source) => ({ value: source, label: sourceLabel(source) }));
  const operators = assertionOperators.map((op) => ({ value: op, label: operatorLabel(op) }));

  const setAssertion = (id: string, patch: Partial<Assertion>) =>
    onChange({ assertions: request.assertions.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const setExtraction = (id: string, patch: Partial<Extraction>) =>
    onChange({
      extractions: request.extractions.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      <section>
        <header className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium">{t("tests.assertions")}</h3>
            <p className="mt-0.5 text-xs text-subtle">
              {t("tests.assertionsHint", { example: "{{variables}}" })}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                assertions: [
                  ...request.assertions,
                  newAssertion(isGrpc ? { source: "grpcStatus", expected: "OK" } : {}),
                ],
              })
            }
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <Icon name="plus" size={13} /> {t("tests.addAssertion")}
          </button>
        </header>

        {request.assertions.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-md border border-line">
            {request.assertions.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "group flex items-center border-b border-line last:border-b-0",
                  !a.enabled && "opacity-55",
                )}
              >
                <span className="flex w-8 shrink-0 justify-center">
                  <Checkbox
                    checked={a.enabled}
                    onChange={(enabled) => setAssertion(a.id, { enabled })}
                    label={t("keyValue.enabled")}
                  />
                </span>
                <Select
                  className="w-40 shrink-0 [&_select]:rounded-none [&_select]:border-0 [&_select]:border-x [&_select]:bg-transparent"
                  value={a.source}
                  onChange={(e) =>
                    setAssertion(a.id, { source: e.target.value as Assertion["source"] })
                  }
                  options={sources}
                />
                {sourceNeedsProperty(a.source) && (
                  <input
                    value={a.property}
                    onChange={(e) => setAssertion(a.id, { property: e.target.value })}
                    placeholder={a.source === "header" ? t("tests.headerName") : "data.items[0].id"}
                    dir="ltr"
                    className={cn(cell, "flex-1 border-e border-line")}
                  />
                )}
                <Select
                  className="w-36 shrink-0 [&_select]:rounded-none [&_select]:border-0 [&_select]:border-e [&_select]:bg-transparent"
                  value={a.operator}
                  onChange={(e) =>
                    setAssertion(a.id, { operator: e.target.value as Assertion["operator"] })
                  }
                  options={operators}
                />
                {operatorNeedsValue(a.operator) ? (
                  <input
                    value={a.expected}
                    onChange={(e) => setAssertion(a.id, { expected: e.target.value })}
                    placeholder={t("tests.expectedValue")}
                    dir="auto"
                    className={cn(cell, "flex-1")}
                  />
                ) : (
                  <span className="flex-1" />
                )}
                <span className="flex w-8 shrink-0 justify-center">
                  <IconButton
                    icon="trash"
                    label={t("tests.removeAssertion")}
                    size={13}
                    tone="danger"
                    className="size-6 opacity-0 group-hover:opacity-100"
                    onClick={() =>
                      onChange({ assertions: request.assertions.filter((x) => x.id !== a.id) })
                    }
                  />
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <header className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium">{t("tests.extract")}</h3>
            <p className="mt-0.5 text-xs text-subtle">{t("tests.extractHint")}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ extractions: [...request.extractions, newExtraction()] })}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <Icon name="plus" size={13} /> {t("tests.addVariable")}
          </button>
        </header>

        {request.extractions.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-md border border-line">
            {request.extractions.map((e) => (
              <div
                key={e.id}
                className={cn(
                  "group flex items-center border-b border-line last:border-b-0",
                  !e.enabled && "opacity-55",
                )}
              >
                <span className="flex w-8 shrink-0 justify-center">
                  <Checkbox
                    checked={e.enabled}
                    onChange={(enabled) => setExtraction(e.id, { enabled })}
                    label={t("keyValue.enabled")}
                  />
                </span>
                <input
                  value={e.variable}
                  onChange={(ev) => setExtraction(e.id, { variable: ev.target.value })}
                  placeholder={t("tests.variableName")}
                  dir="ltr"
                  className={cn(cell, "flex-1 border-x border-line")}
                />
                <Select
                  className="w-36 shrink-0 [&_select]:rounded-none [&_select]:border-0 [&_select]:border-e [&_select]:bg-transparent"
                  value={e.source}
                  onChange={(ev) =>
                    setExtraction(e.id, { source: ev.target.value as Extraction["source"] })
                  }
                  options={[
                    { value: "jsonPath", label: sourceLabel("jsonPath") },
                    { value: "header", label: sourceLabel("header") },
                    { value: "status", label: sourceLabel("status") },
                  ]}
                />
                {e.source !== "status" ? (
                  <input
                    value={e.path}
                    onChange={(ev) => setExtraction(e.id, { path: ev.target.value })}
                    placeholder={e.source === "header" ? t("tests.headerName") : "data.token"}
                    dir="ltr"
                    className={cn(cell, "flex-[1.4]")}
                  />
                ) : (
                  <span className="flex-[1.4]" />
                )}
                <span className="flex w-8 shrink-0 justify-center">
                  <IconButton
                    icon="trash"
                    label={t("tests.removeVariable")}
                    size={13}
                    tone="danger"
                    className="size-6 opacity-0 group-hover:opacity-100"
                    onClick={() =>
                      onChange({ extractions: request.extractions.filter((x) => x.id !== e.id) })
                    }
                  />
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-6 flex items-start gap-2 rounded-md bg-panel-2/60 px-3 py-2 text-xs text-muted">
        <Icon name="info" size={14} className="mt-px shrink-0 text-subtle" />
        {t("tests.moreControl")}
      </p>
    </div>
  );
}
