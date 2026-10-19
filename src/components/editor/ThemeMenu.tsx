import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/controls";
import { Menu } from "@/components/ui/Menu";
import { useAppMode } from "@/lib/appTheme";
import { useWorkspace } from "@/store/workspace";
import { activeTheme, themeByName, themeNames } from "./themes";

/** Palette button that switches the editor theme without opening Settings. */
export function ThemeMenu() {
  const { t } = useTranslation();
  const settings = useWorkspace((s) => s.editorSettings);
  const update = useWorkspace((s) => s.updateEditorSettings);
  const openDialog = useWorkspace((s) => s.openDialog);
  const appMode = useAppMode();
  const active = activeTheme(settings, appMode);
  const mode = settings.followApp ? appMode : active.mode;

  return (
    <Menu
      items={[
        ...themeNames(settings).map((name) => ({
          label: name,
          icon: name === active.name ? ("check" as const) : undefined,
          onSelect: () => update({ themeId: themeByName(settings, name, mode).id }),
        })),
        {
          label: t("editor.customize"),
          icon: "sliders",
          separatorBefore: true,
          onSelect: () => openDialog({ type: "settings" }),
        },
      ]}
      trigger={({ toggle }) => (
        <IconButton icon="palette" label={t("editor.themeMenu")} onClick={toggle} />
      )}
    />
  );
}
