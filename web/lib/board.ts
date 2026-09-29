/** The same command contract is enforced by the browser adapter and the community API. */
export const BOARD_CATEGORIES = ["general", "question", "tips", "notice"] as const;
export type BoardCategory = typeof BOARD_CATEGORIES[number];
export interface BoardActor { id: string; name: string; canPublishNotice: boolean }
export interface BoardComment { id: string; authorId: string; authorName: string; body: string; createdAt: string; updatedAt?: string }
export interface BoardPost {
  id: string; authorId: string; authorName: string; category: BoardCategory;
  title: string; body: string; pinned: boolean; createdAt: string; updatedAt?: string;
  revision: number; comments: BoardComment[];
}
export interface BoardDraft { title: string; body: string; category: BoardCategory; pinned: boolean }
export interface BoardSnapshot { posts: BoardPost[]; canPublishNotice: boolean }
export type BoardCommand =
  | { type: "create"; draft: BoardDraft }
  | { type: "edit"; id: string; revision: number; draft: BoardDraft }
  | { type: "delete"; id: string; revision: number }
  | { type: "comment"; id: string; body: string }
  | { type: "editComment"; id: string; commentId: string; body: string; revision: number }
  | { type: "deleteComment"; id: string; commentId: string; revision: number };
export class BoardError extends Error {}
export function validateDraft(draft: BoardDraft, actor: BoardActor): BoardDraft {
  if (!BOARD_CATEGORIES.includes(draft.category) || typeof draft.title !== "string" || typeof draft.body !== "string" || typeof draft.pinned !== "boolean") throw new BoardError("invalid");
  const title = draft.title.trim(); const body = draft.body.trim();
  if (title.length < 2 || title.length > 100 || body.length < 5 || body.length > 10000) throw new BoardError("length");
  if ((draft.category === "notice" || draft.pinned) && !actor.canPublishNotice) throw new BoardError("forbidden");
  if (draft.pinned && draft.category !== "notice") throw new BoardError("invalid");
  return { title, body, category: draft.category, pinned: draft.pinned };
}
function commentText(body: string) {
  if (typeof body !== "string" || !body.trim() || body.trim().length > 1000) throw new BoardError("comment_length");
  return body.trim();
}
/** No author IDs, timestamps, permissions or revisions from a submitted draft are trusted. */
export function applyBoardCommand(posts: BoardPost[], command: BoardCommand, actor: BoardActor | null, now = new Date().toISOString(), id = () => crypto.randomUUID()): BoardPost[] {
  if (!actor?.id) throw new BoardError("login");
  if (command.type === "create") return [{ ...validateDraft(command.draft, actor), id: id(), authorId: actor.id, authorName: actor.name, createdAt: now, revision: 1, comments: [] }, ...posts];
  const post = posts.find(p => p.id === command.id);
  if (!post) throw new BoardError("not_found");
  if ("revision" in command && command.revision !== post.revision) throw new BoardError("conflict");
  if (command.type === "edit" || command.type === "delete") {
    if (post.authorId !== actor.id && !actor.canPublishNotice) throw new BoardError("forbidden");
    if (post.category === "notice" && !actor.canPublishNotice) throw new BoardError("forbidden");
    if (command.type === "delete") return posts.filter(p => p.id !== post.id);
    const draft = validateDraft(command.draft, actor);
    return posts.map(p => p.id === post.id ? { ...p, ...draft, updatedAt: now, revision: p.revision + 1 } : p);
  }
  let comments = post.comments;
  if (command.type === "comment") {
    if (comments.length >= 500) throw new BoardError("comment_limit");
    comments = [...comments, { id: id(), body: commentText(command.body), authorId: actor.id, authorName: actor.name, createdAt: now }];
  } else {
    const comment = comments.find(c => c.id === command.commentId);
    if (!comment) throw new BoardError("not_found");
    if (comment.authorId !== actor.id && !actor.canPublishNotice) throw new BoardError("forbidden");
    comments = command.type === "deleteComment" ? comments.filter(c => c.id !== comment.id) : comments.map(c => c.id === comment.id ? { ...c, body: commentText(command.body), updatedAt: now } : c);
  }
  return posts.map(p => p.id === post.id ? { ...p, comments, revision: p.revision + 1 } : p);
}
export function selectBoardPosts(posts: BoardPost[], options: { category: string; query: string; mine: boolean; userId?: string; sort: string }) {
  const query = options.query.trim().toLocaleLowerCase();
  return posts.filter(p => (options.category === "all" || p.category === options.category) && (!options.mine || p.authorId === options.userId) && `${p.title} ${p.body} ${p.authorName}`.toLocaleLowerCase().includes(query))
    .sort((a, b) => Number(b.pinned), Number(a.pinned) || (options.sort === "discussed" ? b.comments.length, a.comments.length : 0) || (options.sort === "oldest" ? 1 : -1) * (Date.parse(a.createdAt), Date.parse(b.createdAt)) || a.id.localeCompare(b.id));
}
/** Reject corrupt persistence or malformed API responses rather than overwriting existing records. */
export function parseBoardPosts(value: unknown): BoardPost[] {
  if (!Array.isArray(value)) throw new BoardError("invalid_response");
  const string = (v: unknown): v is string => typeof v === "string";
  const date = (v: unknown) => string(v) && Number.isFinite(Date.parse(v));
  const ids = new Set<string>();
  for (const p of value) {
    if (!p || !string(p.id) || !p.id || ids.has(p.id) || !string(p.authorId) || !string(p.authorName) || !BOARD_CATEGORIES.includes(p.category) || !string(p.title) || p.title.length > 100 || !string(p.body) || p.body.length > 10000 || typeof p.pinned !== "boolean" || !date(p.createdAt) || (p.updatedAt !== undefined && !date(p.updatedAt)) || !Number.isInteger(p.revision) || p.revision < 1 || !Array.isArray(p.comments) || p.comments.length > 500) throw new BoardError("invalid_response");
    ids.add(p.id);
    const comments = new Set<string>();
    for (const c of p.comments) {
      if (!c || !string(c.id) || comments.has(c.id) || !string(c.authorId) || !string(c.authorName) || !string(c.body) || c.body.length > 1000 || !date(c.createdAt) || (c.updatedAt !== undefined && !date(c.updatedAt))) throw new BoardError("invalid_response");
      comments.add(c.id);
    }
  }
  return value as BoardPost[];
}
