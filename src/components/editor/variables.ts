import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { EditorState, type Extension } from "@codemirror/state";
import {
  Decoration,
  MatchDecorator,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
  EditorView,
} from "@codemirror/view";
import { useMemo } from "react";
import { dynamicVariables } from "@/core/variables";
import { t } from "@/i18n";
import { useWorkspace } from "@/store/workspace";

type Lookup = (name: string) => { value: string; scope: string } | undefined;

function highlighter(lookup: Lookup): Extension {
  const matcher = new MatchDecorator({
    regexp: /\{\{\s*([^{}\s][^{}]*?)\s*\}\}/g,
    decoration: (match) => {
      const name = match[1] ?? "";
      const dynamic = dynamicVariables[name];
      const found = dynamic
        ? { value: dynamic.description, scope: t("editor.dynamicScope") }
        : lookup(name);
      return Decoration.mark({
        class: found ? "cm-var" : "cm-var cm-var-missing",
        attributes: {
          title: found
            ? `${name} = ${found.value}  (${found.scope})`
            : t("editor.variableUndefined", { name }),
        },
      });
    },
  });

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = matcher.createDeco(view);
      }
      update(update: ViewUpdate) {
        this.decorations = matcher.updateDeco(update, this.decorations);
      }
    },
    { decorations: (v) => v.decorations },
  );
}

function completions(names: Array<{ label: string; detail: string }>) {
  return (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(/\{\{[\w$.-]*/);
    if (!match) return null;
    return {
      from: match.from + 2,
      options: names.map((n) => ({
        label: n.label,
        detail: n.detail,
        type: "variable",
        apply: `${n.label}}}`,
      })),
      validFor: /^[\w$.-]*$/,
    };
  };
}

/** Highlighting, hover info and `{{` autocompletion for variables. */
export function useVariableExtensions(): Extension[] {
  const environments = useWorkspace((s) => s.environments);
  const activeId = useWorkspace((s) => s.activeEnvironmentId);
  const globals = useWorkspace((s) => s.globals);
  const resolveVariable = useWorkspace((s) => s.resolveVariable);

  return useMemo(() => {
    const env = environments.find((e) => e.id === activeId);
    const seen = new Set<string>();
    const names: Array<{ label: string; detail: string }> = [];
    const add = (label: string, detail: string) => {
      if (label && !seen.has(label)) {
        seen.add(label);
        names.push({ label, detail });
      }
    };
    env?.variables.filter((v) => v.enabled).forEach((v) => add(v.key, env.name));
    globals.filter((v) => v.enabled).forEach((v) => add(v.key, t("defaults.globals")));
    Object.entries(dynamicVariables).forEach(([k, d]) => add(k, d.description));

    return [
      highlighter(resolveVariable),
      EditorState.languageData.of(() => [{ autocomplete: completions(names) }]),
    ];
    // resolveVariable reads the latest store state; recompute when its inputs change.
  }, [environments, activeId, globals, resolveVariable]);
}
