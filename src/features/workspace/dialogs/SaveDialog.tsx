import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/controls";
import type { CollectionItem } from "@/core/types";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";

const NEW_COLLECTION = "__new__";

function folderOptions(
  items: CollectionItem[],
  depth = 0,
): Array<{ value: string; label: string }> {
  return items.flatMap((item) =>
    item.type === "folder"
      ? [
          { value: item.id, label: `${"  ".repeat(depth)}↳ ${item.name}` },
          ...folderOptions(item.items, depth + 1),
        ]
      : [],
  );
}

export function SaveDialog({ tabId }: { tabId: string }) {
  const { t } = useTranslation();
  const closeDialog = useWorkspace((s) => s.closeDialog);
  const tab = useWorkspace((s) => s.tabs.find((t) => t.id === tabId));
  const collections = useWorkspace((s) => s.collections);
  const createCollection = useWorkspace((s) => s.createCollection);
  const saveTabTo = useWorkspace((s) => s.saveTabTo);

  const [name, setName] = useState(tab?.request.name ?? "");
  const [collectionId, setCollectionId] = useState(
    tab?.origin?.collectionId ?? collections[0]?.id ?? NEW_COLLECTION,
  );
  const [newCollectionName, setNewCollectionName] = useState(t("defaults.myCollection"));
  const [folderId, setFolderId] = useState("");

  if (!tab) return null;
  const collection = collections.find((c) => c.id === collectionId);

  const save = () => {
    const target =
      collectionId === NEW_COLLECTION
        ? createCollection(newCollectionName.trim() || t("defaults.myCollection"))
        : collectionId;
    saveTabTo(tabId, target, folderId || null, name.trim() || t("defaults.untitledRequest"));
    notify.success(t("save.saved"));
  };

  return (
    <Modal
      title={t("save.title")}
      onClose={closeDialog}
      footer={
        <>
          <Button variant="ghost" onClick={closeDialog}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={save}>{t("actions.save")}</Button>
        </>
      }
    >
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label={t("save.requestName")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label={t("save.collection")}>
          <Select
            className="w-full"
            value={collectionId}
            onChange={(e) => {
              setCollectionId(e.target.value);
              setFolderId("");
            }}
            options={[
              ...collections.map((c) => ({ value: c.id, label: c.name })),
              { value: NEW_COLLECTION, label: t("save.newCollectionOption") },
            ]}
          />
        </Field>
        {collectionId === NEW_COLLECTION && (
          <Field label={t("save.newCollectionName")}>
            <Input
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
            />
          </Field>
        )}
        {collection && folderOptions(collection.items).length > 0 && (
          <Field label={t("save.folder")}>
            <Select
              className="w-full"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              options={[
                { value: "", label: t("save.collectionRoot") },
                ...folderOptions(collection.items),
              ]}
            />
          </Field>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
