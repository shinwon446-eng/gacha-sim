import { accountRequest, browserAccountsEnabled, getAccountSession } from "./account";
import { applyBoardCommand, BoardError, createBoardExamples, parseBoardPosts, type BoardCommand, type BoardSnapshot } from "./board";
export const BOARD_STORAGE_KEY = "voila.community-board.v1";
export const BOARD_EXAMPLES_KEY = `${BOARD_STORAGE_KEY}.examples.v1`;
let queue: Promise<unknown> = Promise.resolve();
function read(includeExamples = false) {
  const posts = parseBoardPosts(JSON.parse(localStorage.getItem(BOARD_STORAGE_KEY) ?? "[]"));
  if (!includeExamples || posts.length || localStorage.getItem(BOARD_EXAMPLES_KEY)) return posts;
  const examples = createBoardExamples();
  localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(examples));
  localStorage.setItem(BOARD_EXAMPLES_KEY, "1");
  return examples;
}
function serialized(run: () => Promise<BoardSnapshot>): Promise<BoardSnapshot> {
  const locked = async (): Promise<BoardSnapshot> => typeof navigator !== "undefined" && navigator.locks ? await navigator.locks.request(BOARD_STORAGE_KEY, run) : await run();
  const pending = queue.then(locked, locked); queue = pending.catch(() => undefined); return pending;
}
async function request(command?: BoardCommand): Promise<BoardSnapshot> {
  if (!browserAccountsEnabled()) {
    const result = await accountRequest(command ? "/community/board/commands" : "/community/board", command);
    if (typeof result.canPublishNotice !== "boolean") throw new BoardError("invalid_response");
    return { posts: parseBoardPosts(result.posts), canPublishNotice: result.canPublishNotice };
  }
  if (!command) return { posts: read(), canPublishNotice: false };
  const commit = async () => {
    const user = await getAccountSession();
    // Announcements require server-issued permissions; signup never grants moderation rights.
    const actor = { id: user.id, name: user.nickname || "회원", canPublishNotice: false };
    const posts = applyBoardCommand(read(), command, actor);
    // Storage failure must not produce a successful UI update.
    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(posts));
    return { posts, canPublishNotice: false };
  };
  return serialized(commit);
}
/** Examples are an explicit presentation choice. HTTP responses remain authoritative. */
export const loadBoard = (options?: { includeExamples?: boolean }) => options?.includeExamples && browserAccountsEnabled()
  ? serialized(async () => ({ posts: read(true), canPublishNotice: false })) : request();
export const submitBoardCommand = (command: BoardCommand) => request(command);
