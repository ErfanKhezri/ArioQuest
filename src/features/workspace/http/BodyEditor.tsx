import { useTranslation } from "react-i18next";
import { CodeEditor, type EditorLanguage } from "@/components/editor/CodeEditor";
import { Button } from "@/components/ui/Button";
import { KeyValueEditor } from "@/components/ui/KeyValueEditor";
import { Icon } from "@/components/ui/Icon";
import { IconButton, Select } from "@/components/ui/controls";
import { newKeyValue } from "@/core/factory";
import type { BodyMode, FormField, HttpBodyConfig } from "@/core/types";
import { t } from "@/i18n";
import { formatBytes, pickFiles, readFileData } from "@/lib/files";
import { notify } from "@/store/toasts";

const modes = (): Array<{ value: BodyMode; label: string }> => [
  { value: "none", label: t("body.modes.none") },
  { value: "json", label: "JSON" },
  { value: "text", label: t("body.modes.text") },
  { value: "xml", label: "XML" },
  { value: "html", label: "HTML" },
  { value: "urlencoded", label: t("body.modes.urlencoded") },
  { value: "formdata", label: t("body.modes.formdata") },
  { value: "graphql", label: "GraphQL" },
  { value: "binary", label: t("body.modes.binary") },
];

const editorLanguage: Partial<Record<BodyMode, EditorLanguage>> = {
  json: "json",
  xml: "xml",
  html: "html",
  text: "text",
};

const MAX_FILE_BYTES = 50 * 1024 * 1024;

async function chooseFile() {
  const [file] = await pickFiles();
  if (!file) return undefined;
  if (file.size > MAX_FILE_BYTES) {
    notify.error(t("body.tooLarge", { name: file.name }));
    return undefined;
  }
  return readFileData(file);
}

/** Pretty-prints JSON while leaving `{{variables}}` used as bare values intact. */
function beautifyJson(raw: string): string | null {
  const placeholders: string[] = [];
  const masked = raw.replace(/\{\{[^{}]+\}\}/g, (m) => {
    placeholders.push(m);
    return `"__aq_var_${placeholders.length - 1}__"`;
  });
  try {
    const pretty = JSON.stringify(JSON.parse(masked), null, 2);
    return pretty.replace(/"__aq_var_(\d+)__"/g, (_, i: string) => placeholders[Number(i)] ?? "");
  } catch {
    return null;
  }
}

interface BodyEditorProps {
  body: HttpBodyConfig;
  onChange: (body: HttpBodyConfig) => void;
}

export function BodyEditor({ body, onChange }: BodyEditorProps) {
  const { t } = useTranslation();
  const set = (patch: Partial<HttpBodyConfig>) => onChange({ ...body, ...patch });
  const language = editorLanguage[body.mode];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
        <Select
          aria-label={t("body.type")}
          className="w-36"
          value={body.mode}
          onChange={(e) => set({ mode: e.target.value as BodyMode })}
          options={modes()}
        />
        {body.mode === "json" && (
          <Button
            variant="ghost"
            size="sm"
            className="ms-auto"
            onClick={() => {
              const pretty = beautifyJson(body.raw);
              if (pretty === null) notify.error(t("body.notJson"));
              else set({ raw: pretty });
            }}
          >
            <Icon name="braces" size={13} /> {t("body.beautify")}
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t border-line">
        {body.mode === "none" && (
          <p className="px-4 py-6 text-xs text-subtle">{t("body.noBody")}</p>
        )}

        {language && (
          <CodeEditor
            value={body.raw}
            onChange={(raw) => set({ raw })}
            language={language}
            variables
            placeholder={body.mode === "json" ? '{\n  "name": "{{userName}}"\n}' : undefined}
          />
        )}

        {body.mode === "urlencoded" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <KeyValueEditor
              rows={body.urlencoded}
              onChange={(urlencoded) => set({ urlencoded })}
              showDescription
            />
          </div>
        )}

        {body.mode === "formdata" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <KeyValueEditor<FormField>
              rows={body.formdata}
              onChange={(formdata) => set({ formdata })}
              createRow={(id) => ({ ...newKeyValue(), id, type: "text" })}
              allowBulkEdit={false}
              renderExtra={(row, update) => (
                <select
                  value={row.type}
                  onChange={(e) => update({ type: e.target.value as FormField["type"] })}
                  aria-label={t("body.fieldType")}
                  className="h-8 cursor-pointer bg-transparent px-2 text-xs text-muted outline-none"
                >
                  <option value="text">{t("body.text")}</option>
                  <option value="file">{t("body.file")}</option>
                </select>
              )}
              renderValue={(row, update) =>
                row.type === "file" ? (
                  <span className="flex h-8 min-w-0 flex-1 items-center gap-2 px-2 text-xs">
                    {row.file ? (
                      <>
                        <Icon name="file" size={13} className="shrink-0 text-subtle" />
                        <span className="truncate">{row.file.name}</span>
                        <span className="shrink-0 text-subtle">{formatBytes(row.file.size)}</span>
                        <IconButton
                          icon="x"
                          label={t("body.removeFile")}
                          size={12}
                          className="ms-auto size-6"
                          onClick={() => update({ file: undefined })}
                        />
                      </>
                    ) : (
                      <button
                        type="button"
                        className="text-accent hover:underline"
                        onClick={async () => {
                          const file = await chooseFile();
                          if (file)
                            update({ file, key: row.key || file.name.replace(/\.[^.]+$/, "") });
                        }}
                      >
                        {row.description ?? t("body.chooseFileLink")}
                      </button>
                    )}
                  </span>
                ) : null
              }
            />
          </div>
        )}

        {body.mode === "graphql" && (
          <div className="grid min-h-0 flex-1 grid-cols-[1.6fr_1fr]">
            <div className="flex min-h-0 flex-col">
              <span className="px-4 pt-2 text-xs font-medium text-subtle">{t("body.query")}</span>
              <CodeEditor
                value={body.graphql.query}
                onChange={(query) => set({ graphql: { ...body.graphql, query } })}
                language="text"
                variables
                placeholder={"query GetUser($id: ID!) {\n  user(id: $id) { id name }\n}"}
              />
            </div>
            <div className="flex min-h-0 flex-col border-s border-line">
              <span className="px-4 pt-2 text-xs font-medium text-subtle">
                {t("body.graphqlVariables")}
              </span>
              <CodeEditor
                value={body.graphql.variables}
                onChange={(variables) => set({ graphql: { ...body.graphql, variables } })}
                language="json"
                variables
                lineNumbers={false}
                placeholder={'{ "id": "1" }'}
              />
            </div>
          </div>
        )}

        {body.mode === "binary" && (
          <div className="flex items-center gap-3 px-4 py-6 text-xs">
            {body.binary ? (
              <>
                <Icon name="file" size={16} className="text-subtle" />
                <span className="font-medium">{body.binary.name}</span>
                <span className="text-subtle">
                  {formatBytes(body.binary.size)} ·{" "}
                  {body.binary.contentType ?? "application/octet-stream"}
                </span>
                <Button variant="ghost" size="sm" onClick={() => set({ binary: undefined })}>
                  {t("actions.remove")}
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const file = await chooseFile();
                  if (file) set({ binary: file });
                }}
              >
                <Icon name="upload" size={13} /> {t("body.chooseFile")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
