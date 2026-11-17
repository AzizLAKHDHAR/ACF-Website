// Whether a meeting still takes answers: not cancelled and not over yet (the end, or the start when
// there is no end). answer_meeting() applies the same rule in the database.
export function isMeetingOpen(
  meeting: { starts_at: string; ends_at: string | null; cancelled_at: string | null },
  now: number = Date.now(),
): boolean {
  if (meeting.cancelled_at) return false;
  return new Date(meeting.ends_at ?? meeting.starts_at).getTime() >= now;
}
