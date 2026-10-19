import { useTranslation } from "react-i18next";
import { Field, Input, Select } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import type { AuthConfig, AuthType } from "@/core/types";

const authTypes: AuthType[] = ["none", "bearer", "basic", "apikey"];

export function AuthEditor({
  auth,
  onChange,
}: {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-4 py-4 md:grid-cols-[200px_1fr]">
      <div>
        <Field label={t("auth.type")}>
          <Select
            className="w-full"
            value={auth.type}
            onChange={(e) => onChange({ ...auth, type: e.target.value as AuthType })}
            options={authTypes.map((type) => ({ value: type, label: t(`auth.types.${type}`) }))}
          />
        </Field>
        <p className="mt-3 text-xs text-subtle">{t("auth.hint", { example: "{{variables}}" })}</p>
      </div>

      <div className="max-w-md space-y-3">
        {auth.type === "none" && (
          <p className="flex items-center gap-2 text-xs text-subtle">
            <Icon name="shield" size={15} /> {t("auth.none")}
          </p>
        )}
        {auth.type === "bearer" && (
          <Field label={t("auth.token")}>
            <Input
              dir="ltr"
              value={auth.bearer.token}
              onChange={(e) => onChange({ ...auth, bearer: { token: e.target.value } })}
              placeholder="{{accessToken}}"
              className="font-mono"
            />
          </Field>
        )}
        {auth.type === "basic" && (
          <>
            <Field label={t("auth.username")}>
              <Input
                dir="ltr"
                value={auth.basic.username}
                onChange={(e) =>
                  onChange({ ...auth, basic: { ...auth.basic, username: e.target.value } })
                }
              />
            </Field>
            <Field label={t("auth.password")}>
              <Input
                dir="ltr"
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
            <Field label={t("auth.key")}>
              <Input
                dir="ltr"
                value={auth.apikey.key}
                onChange={(e) =>
                  onChange({ ...auth, apikey: { ...auth.apikey, key: e.target.value } })
                }
                className="font-mono"
              />
            </Field>
            <Field label={t("auth.value")}>
              <Input
                dir="ltr"
                value={auth.apikey.value}
                onChange={(e) =>
                  onChange({ ...auth, apikey: { ...auth.apikey, value: e.target.value } })
                }
                className="font-mono"
              />
            </Field>
            <Field label={t("auth.addTo")}>
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
                  { value: "header", label: t("auth.header") },
                  { value: "query", label: t("auth.queryParams") },
                ]}
              />
            </Field>
          </>
        )}
      </div>
    </div>
  );
}
