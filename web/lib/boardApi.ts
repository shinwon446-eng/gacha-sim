import { accountRequest, browserAccountsEnabled, getAccountSession } from "./account";
import { applyBoardCommand, BoardError, parseBoardPosts, type BoardCommand, type BoardSnapshot } from "./board";
export const BOARD_STORAGE_KEY = "voila.community-board.v1";
let queue: Promise<unknown> = Promise.resolve();
function read() { return parseBoardPosts(JSON.parse(localStorage.getItem(BOARD_STORAGE_KEY) ?? "[]")); }
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
  const run = async (): Promise<BoardSnapshot> => typeof navigator !== "undefined" && navigator.locks ? await navigator.locks.request(BOARD_STORAGE_KEY, commit) : await commit();
  const pending = queue.then(run, run); queue = pending.catch(() => undefined);
  return pending;
}
export const loadBoard = () => request();
export const submitBoardCommand = (command: BoardCommand) => request(command);
