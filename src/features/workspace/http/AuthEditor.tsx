import { Field, Input, Select } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import type { AuthConfig, AuthType } from "@/core/types";

const authTypes: Array<{ value: AuthType; label: string }> = [
  { value: "none", label: "No auth" },
  { value: "bearer", label: "Bearer token" },
  { value: "basic", label: "Basic auth" },
  { value: "apikey", label: "API key" },
];

export function AuthEditor({
  auth,
  onChange,
}: {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-4 py-4 md:grid-cols-[200px_1fr]">
      <div>
        <Field label="Type">
          <Select
            className="w-full"
            value={auth.type}
            onChange={(e) => onChange({ ...auth, type: e.target.value as AuthType })}
            options={authTypes}
          />
        </Field>
        <p className="mt-3 text-[11px] leading-relaxed text-subtle">
          The auth header is generated when the request is sent. A header you add yourself takes
          precedence. Values can use {"{{variables}}"}.
        </p>
      </div>

      <div className="max-w-md space-y-3">
        {auth.type === "none" && (
          <p className="flex items-center gap-2 text-xs text-subtle">
            <Icon name="shield" size={15} /> This request does not use authorization.
          </p>
        )}
        {auth.type === "bearer" && (
          <Field label="Token">
            <Input
              value={auth.bearer.token}
              onChange={(e) => onChange({ ...auth, bearer: { token: e.target.value } })}
              placeholder="{{accessToken}}"
              className="font-mono"
            />
          </Field>
        )}
        {auth.type === "basic" && (
          <>
            <Field label="Username">
              <Input
                value={auth.basic.username}
                onChange={(e) =>
                  onChange({ ...auth, basic: { ...auth.basic, username: e.target.value } })
                }
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={auth.basic.password}
                onChange={(e) =>
                  onChange({ ...auth, basic: { ...auth.basic, password: e.target.value } })
                }
              />
            </Field>
          </>
        )}
        {auth.type === "apikey" && (
          <>
            <Field label="Key">
              <Input
                value={auth.apikey.key}
                onChange={(e) =>
                  onChange({ ...auth, apikey: { ...auth.apikey, key: e.target.value } })
                }
                className="font-mono"
              />
            </Field>
            <Field label="Value">
              <Input
                value={auth.apikey.value}
                onChange={(e) =>
                  onChange({ ...auth, apikey: { ...auth.apikey, value: e.target.value } })
                }
                className="font-mono"
              />
            </Field>
            <Field label="Add to">
              <Select
                className="w-full"
                value={auth.apikey.in}
                onChange={(e) =>
                  onChange({
                    ...auth,
                    apikey: { ...auth.apikey, in: e.target.value as "header" | "query" },
                  })
                }
                options={[
                  { value: "header", label: "Header" },
                  { value: "query", label: "Query params" },
                ]}
              />
            </Field>
          </>
        )}
      </div>
    </div>
  );
}
