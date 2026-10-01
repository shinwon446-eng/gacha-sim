import test from "node:test";
import assert from "node:assert/strict";
import { applyBoardCommand, parseBoardPosts, selectBoardPosts, type BoardActor, type BoardDraft } from "../lib/board";
const member: BoardActor = { id: "one", name: "Member", canPublishNotice: false };
const other: BoardActor = { id: "two", name: "Other", canPublishNotice: false };
const admin: BoardActor = { id: "admin", name: "Operator", canPublishNotice: true };
const draft: BoardDraft = { title: "Hello community", body: "A real member's story", category: "general", pinned: false };
const create = () => applyBoardCommand([], { type: "create", draft }, member, "2026-09-30T00:00:00Z", () => "post");
test("board validates login, lengths, categories and protected fields", () => {
  assert.throws(() => applyBoardCommand([], { type: "create", draft }, null), /login/);
  for (const patch of [{ title: " " }, { title: "a".repeat(101) }, { body: "tiny" }, { body: "a".repeat(10001) }]) assert.throws(() => applyBoardCommand([], { type: "create", draft: { ...draft, ...patch } }, member), /length/);
  const posts = create(); assert.equal(posts[0].authorId, member.id); assert.equal(posts[0].revision, 1);
  assert.deepEqual(parseBoardPosts(JSON.parse(JSON.stringify(posts))), posts);
  assert.throws(() => parseBoardPosts([...posts, ...posts]), /invalid_response/);
  assert.throws(() => parseBoardPosts([{ ...posts[0], comments: [{}] }]), /invalid_response/);
});
test("only operators publish or pin announcements; members cannot convert notices", () => {
  const notice = { ...draft, category: "notice" as const, pinned: true };
  assert.throws(() => applyBoardCommand([], { type: "create", draft: notice }, member), /forbidden/);
  assert.throws(() => applyBoardCommand([], { type: "create", draft: { ...draft, pinned: true } }, admin), /invalid/);
  const posts = applyBoardCommand([], { type: "create", draft: notice }, admin);
  assert.throws(() => applyBoardCommand(posts, { type: "edit", id: posts[0].id, revision: 1, draft }, { ...admin, canPublishNotice: false }), /forbidden/);
  assert.equal(applyBoardCommand(posts, { type: "delete", id: posts[0].id, revision: 1 }, admin).length, 0);
});
test("post edits and deletion enforce ownership and reject stale revisions", () => {
  const posts = create(); const command = { type: "edit" as const, id: "post", revision: 1, draft: { ...draft, title: "Updated title" } };
  assert.throws(() => applyBoardCommand(posts, command, other), /forbidden/);
  const edited = applyBoardCommand(posts, command, member);
  assert.equal(edited[0].title, "Updated title"); assert.equal(edited[0].revision, 2); assert.equal(posts[0].title, draft.title);
  assert.throws(() => applyBoardCommand(edited, command, member), /conflict/);
  assert.throws(() => applyBoardCommand(edited, { type: "delete", id: "post", revision: 2 }, other), /forbidden/);
  assert.equal(applyBoardCommand(edited, { type: "delete", id: "post", revision: 2 }, member).length, 0);
});
test("comments support CRUD without permitting another member to edit or delete them", () => {
  const posts = applyBoardCommand(create(), { type: "comment", id: "post", body: " A helpful response " }, other, undefined, () => "comment");
  assert.equal(posts[0].comments[0].body, "A helpful response");
  const command = { type: "editComment" as const, id: "post", commentId: "comment", body: "Updated response", revision: 2 };
  assert.throws(() => applyBoardCommand(posts, command, member), /forbidden/);
  const edited = applyBoardCommand(posts, command, other); assert.equal(edited[0].comments[0].body, command.body);
  assert.throws(() => applyBoardCommand(edited, { type: "deleteComment", id: "post", commentId: "comment", revision: 3 }, member), /forbidden/);
  assert.equal(applyBoardCommand(edited, { type: "deleteComment", id: "post", commentId: "comment", revision: 3 }, admin)[0].comments.length, 0);
  for (const body of [" ", "x".repeat(1001)]) assert.throws(() => applyBoardCommand(posts, { type: "comment", id: "post", body }, other), /comment_length/);
});
test("search, ownership filters, pinned notices and discussion sorting compose", () => {
  const posts = applyBoardCommand(create(), { type: "create", draft: { ...draft, title: "Important notice", category: "notice", pinned: true } }, admin, "2026-09-01T00:00:00Z", () => "notice");
  const options = { category: "all", query: "", mine: false, sort: "newest" };
  assert.equal(selectBoardPosts(posts, options)[0].id, "notice");
  assert.deepEqual(selectBoardPosts(posts, { ...options, mine: true, userId: member.id }).map(p => p.id), ["post"]);
  assert.equal(selectBoardPosts(posts, { ...options, query: "IMPORTANT" }).length, 1);
  assert.equal(selectBoardPosts(posts, { ...options, category: "question" }).length, 0);
});
