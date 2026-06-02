export type MediaCardStatus = "available" | "used" | "expired" | "deleted";

export type MediaCardAction =
  | { intent: "delete"; label: "Delete" }
  | { intent: "restore"; label: "Restore" }
  | { intent: "permanentDelete"; label: "Delete Forever" };

export function getMediaCardAction(status: MediaCardStatus): MediaCardAction {
  if (status === "deleted") {
    return { intent: "restore", label: "Restore" };
  }

  return { intent: "delete", label: "Delete" };
}

export function getMediaCardActions(status: MediaCardStatus): MediaCardAction[] {
  if (status === "deleted") {
    return [
      { intent: "restore", label: "Restore" },
      { intent: "permanentDelete", label: "Delete Forever" },
    ];
  }

  return [{ intent: "delete", label: "Delete" }];
}
