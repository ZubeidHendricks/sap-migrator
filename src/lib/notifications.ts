import { prisma } from './prisma'

export type NotificationType =
  | 'object.assigned'
  | 'object.commented'
  | 'run.completed'
  | 'mention'

export interface NotificationInput {
  userId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
}

/** Create notifications for a set of recipients (deduped, self-excluded by caller). */
export async function notify(inputs: NotificationInput[]): Promise<void> {
  const valid = inputs.filter((n) => n.userId)
  if (valid.length === 0) return
  await prisma.notification.createMany({ data: valid }).catch(() => {})
}

/** Recipients for a comment: the object's owner + everyone who previously
 *  commented, minus the comment's author. Pure — returns a deduped id list. */
export function commentRecipients(opts: {
  authorId: string
  ownerId?: string | null
  priorCommenterIds: string[]
}): string[] {
  const set = new Set<string>()
  if (opts.ownerId) set.add(opts.ownerId)
  for (const id of opts.priorCommenterIds) set.add(id)
  set.delete(opts.authorId)
  return [...set]
}

/** Short preview of a comment body for a notification line. */
export function commentPreview(body: string, max = 80): string {
  const clean = body.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}
