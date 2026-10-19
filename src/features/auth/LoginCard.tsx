import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input, Spinner } from "@/components/ui/controls";
import { Tabs } from "@/components/ui/Tabs";
import { AuthError, DEFAULT_ACCOUNT, signIn, signUp, type Session } from "@/lib/auth";

type Mode = "signin" | "signup";
export type FieldName = "name" | "email" | "password";

/** Card events the landing page turns into Ario's reactions. */
interface LoginCardProps {
  onSignedIn: (session: Session) => void;
  onSubmit: () => void;
  onError: () => void;
  onFocusField: (field: FieldName | null) => void;
  onPasswordVisibleChange: (visible: boolean) => void;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-danger">{message}</p> : null;
}

export function LoginCard({
  onSignedIn,
  onSubmit,
  onError,
  onFocusField,
  onPasswordVisibleChange,
}: LoginCardProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ field?: FieldName; message: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    onSubmit();
    try {
      const session =
        mode === "signin" ? await signIn(email, password) : await signUp(name, email, password);
      onSignedIn(session);
    } catch (err) {
      setError(
        err instanceof AuthError
          ? { field: err.field, message: err.message }
          : { message: t("login.errors.generic") },
      );
      setSubmitting(false);
      onError();
    }
  };

  const errorFor = (field: FieldName) => (error?.field === field ? error.message : undefined);
  const invalid = (field: FieldName) => (error?.field === field ? "border-danger" : "");

  return (
    <div className="w-full rounded-md border border-line bg-panel">
      <Tabs
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
        tabs={[
          { id: "signin", label: t("login.signIn") },
          { id: "signup", label: t("login.createAccount") },
        ]}
        className="h-10 px-4"
      />
      {/* Remount per mode so the first field gets focus again. */}
      <form
        key={mode}
        onSubmit={submit}
        // Inputs carry their field in `name`; the toggle button has none.
        onFocus={(e) => {
          const field = e.target.getAttribute("name");
          if (field) onFocusField(field as FieldName);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) onFocusField(null);
        }}
        className="space-y-4 p-4"
        noValidate
      >
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1 block text-xs text-muted">{t("login.name")}</span>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              name="name"
              autoComplete="name"
              className={`h-8 ${invalid("name")}`}
            />
            <FieldError message={errorFor("name")} />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs text-muted">
            {mode === "signin" ? t("login.emailOrUsername") : t("login.email")}
          </span>
          <Input
            autoFocus={mode === "signin"}
            type={mode === "signin" ? "text" : "email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            dir="ltr"
            className={`h-8 ${invalid("email")}`}
          />
          <FieldError message={errorFor("email")} />
        </label>
        <div>
          <span className="mb-1 flex items-center justify-between text-xs text-muted">
            <label htmlFor="auth-password">{t("login.password")}</label>
            {mode === "signin" && (
              <button
                type="button"
                disabled
                title={t("login.comingSoon")}
                className="text-subtle disabled:cursor-not-allowed"
              >
                {t("login.forgotPassword")}
              </button>
            )}
          </span>
          <span className="relative block">
            <Input
              id="auth-password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={mode === "signup" ? t("login.passwordPlaceholder") : undefined}
              className={`h-8 pe-8 ${invalid("password")}`}
            />
            <button
              type="button"
              aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
              onClick={() => {
                setShowPassword(!showPassword);
                onPasswordVisibleChange(!showPassword);
              }}
              className="absolute end-2 top-1/2 -translate-y-1/2 text-subtle hover:text-fg"
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} size={14} />
            </button>
          </span>
          <FieldError message={errorFor("password")} />
        </div>
        <Button type="submit" disabled={submitting} className="h-8 w-full">
          {submitting && <Spinner />}
          {mode === "signin" ? t("login.signIn") : t("login.createAccount")}
        </Button>
        {error && !error.field && <FieldError message={error.message} />}
        {mode === "signin" && (
          <p className="text-center text-xs text-subtle">
            {t("login.firstTime")}{" "}
            <button
              type="button"
              onClick={() => {
                setEmail(DEFAULT_ACCOUNT.username);
                setPassword(DEFAULT_ACCOUNT.password);
                setError(null);
              }}
              className="text-accent hover:underline"
            >
              {t("login.useDefaultAccount")}
            </button>{" "}
            ({DEFAULT_ACCOUNT.username} / {DEFAULT_ACCOUNT.password})
          </p>
        )}
      </form>
    </div>
  );
}
