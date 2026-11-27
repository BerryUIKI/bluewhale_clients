import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TagDto } from "@bluewhale/ipc";
import { useMasterData, useTagUpdate } from "../../lib/master-data-queries";
import { tagUpdateRequest } from "./requests";
import { MasterDataBoundary, MasterDataErrorAlert, PageHeader, ShowArchived } from "./shared";
import { TagFormDialog } from "./tag-form-dialog";

/** Lists tags with their colors, create, edit, and archive. */
export function TagsPage() {
  const { t } = useTranslation();
  const query = useMasterData();
  const update = useTagUpdate();
  const [showArchived, setShowArchived] = useState(false);
  const [dialog, setDialog] = useState<{ tag: TagDto | null } | null>(null);

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("tags.title")} subtitle={t("tags.subtitle")}>
        <button type="button" className="button" onClick={() => setDialog({ tag: null })}>
          {t("tags.newTag")}
        </button>
      </PageHeader>

      <MasterDataBoundary query={query}>
        {(data) => {
          const visible = data.tags.filter((tag) => showArchived || !tag.isArchived);
          return (
            <>
              {update.isError ? <MasterDataErrorAlert error={update.error} /> : null}

              <div className="flex justify-end">
                <ShowArchived checked={showArchived} onChange={setShowArchived} />
              </div>

              {visible.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line bg-surface p-6 text-center">
                  <p className="font-medium">{t("tags.emptyTitle")}</p>
                  <p className="mt-1 text-sm text-muted">{t("tags.emptyBody")}</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {visible.map((tag) => (
                    <li key={tag.id} className="rounded-lg border border-line bg-surface p-5">
                      <div className="flex flex-wrap items-start gap-4">
                        <span
                          aria-hidden="true"
                          className="mt-1 inline-block size-5 shrink-0 rounded-full border border-line"
                          style={{ backgroundColor: tag.colorHex }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-semibold">{tag.name}</h2>
                            <span className="font-mono text-xs text-muted">{tag.colorHex}</span>
                            {tag.isArchived ? (
                              <span className="badge badge-danger">{t("masterData.archived")}</span>
                            ) : null}
                          </div>
                          {tag.description ? (
                            <p className="mt-1 text-sm text-muted">{tag.description}</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => setDialog({ tag })}
                          >
                            {t("masterData.edit")}
                          </button>
                          <button
                            type="button"
                            className="text-sm font-medium text-accent underline"
                            disabled={update.isPending}
                            onClick={() => update.mutate(tagUpdateRequest(tag, !tag.isArchived))}
                          >
                            {tag.isArchived ? t("masterData.restore") : t("masterData.archive")}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {dialog ? (
                <TagFormDialog
                  key={dialog.tag?.id ?? "new"}
                  open
                  onOpenChange={(open) => {
                    if (!open) {
                      setDialog(null);
                    }
                  }}
                  tag={dialog.tag}
                />
              ) : null}
            </>
          );
        }}
      </MasterDataBoundary>
    </section>
  );
}
