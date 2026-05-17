export function addProjectTaskPendingDeletion({
  pendingDeletions,
  taskId,
}: {
  pendingDeletions: ReadonlySet<string>;
  taskId: string;
}): Set<string> {
  const next = new Set(pendingDeletions);
  next.add(taskId);
  return next;
}

export function removeProjectTaskPendingDeletion({
  pendingDeletions,
  taskId,
}: {
  pendingDeletions: ReadonlySet<string>;
  taskId: string;
}): Set<string> {
  const next = new Set(pendingDeletions);
  next.delete(taskId);
  return next;
}
