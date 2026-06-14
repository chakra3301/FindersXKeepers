export const MAX_MESSAGE_LENGTH = 2000;

/** Trim and validate a message body; throws on empty or over-length. */
export function parseMessageBody(raw: string): string {
  const body = raw.trim();
  if (!body) throw new Error("Message can't be empty.");
  if (body.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
  }
  return body;
}
