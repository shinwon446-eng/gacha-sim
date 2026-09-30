/** The same command contract is enforced by the browser adapter and the community API. */
export const BOARD_CATEGORIES = ["general", "question", "tips", "notice"] as const;
export type BoardCategory = typeof BOARD_CATEGORIES[number];
export interface BoardActor { id: string; name: string; canPublishNotice: boolean }
export interface BoardComment { id: string; authorId: string; authorName: string; body: string; createdAt: string; updatedAt?: string; source?: "member" | "example" }
export interface BoardPost {
  id: string; authorId: string; authorName: string; category: BoardCategory;
  title: string; body: string; pinned: boolean; createdAt: string; updatedAt?: string;
  revision: number; comments: BoardComment[];
  images?: string[];
  source?: "member" | "example";
}
export interface BoardDraft { title: string; body: string; category: BoardCategory; pinned: boolean; images?: string[] }
export interface BoardSnapshot { posts: BoardPost[]; canPublishNotice: boolean }
export type BoardCommand =
  | { type: "create"; draft: BoardDraft }
  | { type: "edit"; id: string; revision: number; draft: BoardDraft }
  | { type: "delete"; id: string; revision: number }
  | { type: "comment"; id: string; body: string }
  | { type: "editComment"; id: string; commentId: string; body: string; revision: number }
  | { type: "deleteComment"; id: string; commentId: string; revision: number };
export class BoardError extends Error {}
import { assertCommunityImages, assertCommunitySafeText } from "./communityModeration";
export const isExampleBoardContent = (content: { id: string; source?: string }) => content.source === "example" || content.id.startsWith("board_example_v1_");
export function validateDraft(draft: BoardDraft, actor: BoardActor): BoardDraft {
  if (!BOARD_CATEGORIES.includes(draft.category) || typeof draft.title !== "string" || typeof draft.body !== "string" || typeof draft.pinned !== "boolean") throw new BoardError("invalid");
  const title = draft.title.trim(); const body = draft.body.trim();
  if (title.length < 2 || title.length > 100 || body.length < 5 || body.length > 10000) throw new BoardError("length");
  try { assertCommunitySafeText(title, body); assertCommunityImages(draft.images); } catch { throw new BoardError("content_blocked"); }
  if ((draft.category === "notice" || draft.pinned) && !actor.canPublishNotice) throw new BoardError("forbidden");
  if (draft.pinned && draft.category !== "notice") throw new BoardError("invalid");
  return { title, body, category: draft.category, pinned: draft.pinned, ...(draft.images?.length ? { images: draft.images } : {}) };
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
    .sort((a, b) => Number(isExampleBoardContent(a)) - Number(isExampleBoardContent(b)) || Number(b.pinned) - Number(a.pinned) || (options.sort === "discussed" ? b.comments.length - a.comments.length : 0) || (options.sort === "oldest" ? 1 : -1) * (Date.parse(a.createdAt) - Date.parse(b.createdAt)) || a.id.localeCompare(b.id));
}
/** Reject corrupt persistence or malformed API responses rather than overwriting existing records. */
export function parseBoardPosts(value: unknown): BoardPost[] {
  if (!Array.isArray(value)) throw new BoardError("invalid_response");
  const string = (v: unknown): v is string => typeof v === "string";
  const date = (v: unknown) => string(v) && Number.isFinite(Date.parse(v));
  const ids = new Set<string>();
  for (const p of value) {
    if (!p || !string(p.id) || !p.id || ids.has(p.id) || !string(p.authorId) || !string(p.authorName) || !BOARD_CATEGORIES.includes(p.category) || !string(p.title) || p.title.length > 100 || !string(p.body) || p.body.length > 10000 || typeof p.pinned !== "boolean" || !date(p.createdAt) || (p.updatedAt !== undefined && !date(p.updatedAt)) || !Number.isInteger(p.revision) || p.revision < 1 || !Array.isArray(p.comments) || p.comments.length > 500) throw new BoardError("invalid_response");
    try { assertCommunitySafeText(p.title, p.body); assertCommunityImages(p.images); } catch { throw new BoardError("invalid_response"); }
    ids.add(p.id);
    if (p.source !== undefined && !["member", "example"].includes(p.source)) throw new BoardError("invalid_response");
    const comments = new Set<string>();
    for (const c of p.comments) {
      if (!c || !string(c.id) || comments.has(c.id) || !string(c.authorId) || !string(c.authorName) || !string(c.body) || c.body.length > 1000 || !date(c.createdAt) || (c.updatedAt !== undefined && !date(c.updatedAt))) throw new BoardError("invalid_response");
      comments.add(c.id);
      if (c.source !== undefined && !["member", "example"].includes(c.source)) throw new BoardError("invalid_response");
    }
  }
  return value as BoardPost[];
}

/** Editorial conversation examples, not customer testimonials or transaction evidence.
 * Fixed IDs/dates keep reloads from inventing new activity. Every surface must retain the source label.
 */
export function createBoardExamples(): BoardPost[] {
  const threads: [BoardCategory, string, string, string[]][] = [
    ["notice", "게시판 이용 안내는 이렇게 작성해요", "자유게시판 첫 공지의 작성 예시입니다. 질문은 어떤 화면에서 무엇이 궁금했는지 적어주면 답하기 쉬워요. 이 글과 아래 대화는 운영팀이 구성한 예시이며 실제 회원 활동이 아닙니다.", ["질문 제목에 네트워크나 상품 이름 넣는 것도 좋겠네요.", "개인정보는 캡처 전에 꼭 가리기. 이거 은근 잊어버림."]],
    ["notice", "후기 사진 올리기 전 확인할 것", "공지 형식 예시입니다. 상품 사진에는 주소 라벨, 전화번호, 운송장 번호가 보이지 않게 해주세요. 게시글과 예시 댓글은 실제 배송이나 당첨을 증명하지 않습니다.", ["박스 뒷면에도 주소 붙어 있을 수 있어서 양쪽 다 봐야 함.", "보증서 올릴 때도 시리얼은 가리는 게 낫겠네요.", "상품만 깔끔하게 찍어도 충분할 듯."]],
    ["general", "처음 보는 서비스는 일단 규칙부터 읽는 편", "솔직히 좋은 말만 있으면 더 의심하게 됨 ㅋㅋ 박스 가격이랑 확률표, 페이백 기준부터 비교해보는 쪽. 다른 사람 후기도 좋지만 내 예산이 먼저인 듯.", ["나도 버튼 누르기 전에 구성품부터 펼쳐봄.", "맞음. 좋은 결과 캡처 몇 장이 전체 결과는 아니니까.", "궁금한 건 질문으로 남겨두는 게 편하더라.", "예산 정하고 보는 게 제일 현실적."]],
    ["question", "에어팟 맥스랑 프로, 출퇴근에는 뭐가 편할까요?", "헤드폰 디자인은 맥스가 취향인데 가방 부피가 걱정됨. 이어폰은 잃어버릴까 신경 쓰이고… 출퇴근 짐 많은 분들은 어떤 기준으로 고름?", ["무게부터 생각해보면 선택 빨라질 듯.", "여름에 쓸 건지까지 같이 보면 좋음.", "디자인이냐 휴대성이냐 영원한 고민 ㅋㅋ", "매장에서 둘 다 착용해보는 게 제일 정확.", "가방에 케이스 넣을 공간도 은근 중요함."]],
    ["tips", "확률표 볼 때 퍼센트 옆 자리수도 봐야 함", "0.1%랑 0.01%는 화면에서 비슷해 보여도 열 배 차이잖아요. 구성품 이름보다 확률 숫자를 먼저 확인하는 습관이 필요할 듯. 체감이랑 표는 따로 보자.", ["작은 숫자일수록 그냥 넘어가기 쉬움.", "연속으로 안 나왔다고 다음 결과가 보장되는 건 아니고.", "후기만 보고 확률 판단하면 표본이 한쪽으로 쏠리지.", "횟수랑 지출액은 따로 기록하는 게 낫겠네.", "계산기 켜서 확인하는 편이 마음 편함.", "맞아. 기대랑 숫자는 분리해서 봐야지."]],
    ["general", "시계 구경하다가 취향만 확실해짐", "처음엔 큼직한 다이버만 봤는데 계속 보니까 작은 필드워치도 괜찮네. 사진이랑 손목 위 느낌이 다를 것 같아서 크기부터 찾아보는 중.", ["손목 둘레랑 러그 길이까지 봐야 함.", "사진으로는 다 예뻐 보이는 게 함정 ㅋㅋ"]],
    ["question", "출금할 때 네트워크 먼저 고르는 게 맞죠?", "주소는 복사해 놓았는데 받는 쪽 네트워크랑 보내는 쪽이 같아야 하는 거죠? 속도보다 주소랑 네트워크 안 틀리는 게 더 신경 쓰임.", ["네트워크 이름부터 양쪽에서 비교해보세요.", "주소 앞부분만 보고 같다고 판단하면 안 됨.", "처리 시간은 건마다 다를 수 있으니 특정 시간으로 단정하지 않는 게 좋겠네요."]],
    ["tips", "사진 후기 쓰면 이런 순서가 읽기 편할 듯", "상품 전체 사진 → 마음에 드는 부분 → 아쉬운 부분 순으로 쓰면 보기 편하더라고요. 무조건 좋다는 말보다 내 사용 목적에 맞았는지가 더 궁금함.", ["단점 한 줄이 오히려 정보량 많음.", "크기 비교할 물건 옆에 놓는 것도 좋죠.", "사진에 다른 사람 얼굴 나오면 가려야 하고.", "배경 복잡하면 정작 상품이 안 보이더라."]],
    ["general", "아이패드 고르는 기준이 점점 바뀌는 중", "처음엔 큰 화면이면 다 좋을 줄 알았는데 책상보다 소파에서 보는 시간이 더 많음. 결국 무게랑 손으로 들고 쓰는 시간을 생각하게 되네.", ["사용 장소부터 정하면 선택 쉬워짐.", "가끔 들고 나갈 거면 가방 크기도 중요.", "키보드까지 붙이면 무게가 또 달라짐.", "스펙표만 볼 때랑 실제 용도가 다르죠.", "나도 화면 크기만 보던 습관 바꿔야겠네."]],
    ["question", "실물 신청 전에 배송 조건 어디까지 확인하세요?", "관부가세나 배송 가능 지역은 상품하고 받는 곳에 따라 다를 수 있잖아요. 게시판 답만 믿기보다 신청 화면이랑 배송 정책을 같이 보는 게 맞겠죠?", ["네, 내 주소 기준 안내가 제일 중요해요.", "예전에 본 댓글이 현재 조건이랑 같다는 보장은 없으니까.", "보증이나 반품 조건도 같이 확인하면 좋겠네요.", "정확한 건 해당 주문 정보로 문의하는 편이 낫겠죠.", "국가 바뀌면 조건도 다시 확인해야 함.", "질문할 땐 주소 전체 말고 국가 정도만 적는 게 안전해요."]],
    ["tips", "페이백 기준이 구매 금액인지 상품 가치인지 먼저 확인", "90%라는 숫자만 보면 헷갈릴 수 있어서 적어봄. 어떤 금액을 기준으로 계산하는지 확인하고, 예상 금액이랑 실제 확인 화면의 금액을 비교하는 게 좋겠어요.", ["기준 금액 안 보고 비율만 보면 착각하기 쉬움.", "반복하면 차감되는 금액도 누적되니 총액으로 봐야겠네요."]],
    ["general", "맥북은 성능보다 들고 다닐 무게부터 고민", "영상 작업도 안 하는데 고성능 모델 보면 괜히 눈길 감 ㅋㅋ 근데 매일 들고 다닐 거면 가벼운 모델이 내 용도에는 더 맞을 수도 있겠네.", ["사용하는 프로그램부터 적어보면 정리됨.", "충전기 무게도 같이 계산해야 함.", "성능 숫자가 높다고 무조건 나한테 좋은 건 아니니까."]],
    ["question", "PS5 놓을 자리는 어디가 나을까요?", "TV장 안에 넣으려 했는데 공간이 좀 좁아 보이네요. 깔끔하게 두는 것도 좋지만 통풍 생각하면 밖에 두는 쪽이 나을지 고민 중.", ["제조사 설치 안내의 여유 공간부터 확인해보세요.", "케이블 나오는 자리까지 생각해야 깔끔함.", "먼지 청소하기 편한 위치도 중요하죠.", "사진만 보고 배치했다가 선 때문에 다시 옮기기도 함."]],
    ["tips", "질문 글 제목에 이것만 적어도 답하기 편함", "상품 이름 / 궁금한 기능 / 확인한 화면. 세 가지가 있으면 같은 질문을 다시 물을 일이 줄어들 듯. 계정 정보나 비밀번호는 글에 쓰지 말고요.", ["제목이 질문입니다 한 줄이면 뭘 봐야 할지 모르겠음 ㅋㅋ", "오류 메시지는 개인정보 가리고 옮기면 좋죠.", "언제부터 그랬는지도 도움 됨.", "모바일인지 PC인지도 같이 적으면 더 좋고.", "해결되면 해결 방법도 남겨주면 다음 사람이 편해요."]],
    ["general", "골드바 사진 보다가 실물 크기가 궁금해짐", "그램 숫자로는 크기가 잘 안 와닿네요. 같은 무게라도 모양이 다를 수 있으니 치수랑 제품 정보를 같이 봐야겠다는 생각. 사진은 원근감이 있으니까.", ["옆에 자 놓은 사진이 제일 직관적일 듯.", "무게랑 순도 표기를 따로 확인하면 좋겠네요.", "보관 방법도 미리 생각해두면 좋고.", "크기만으로 가치를 판단하면 안 되죠.", "제품마다 포장도 다를 수 있으니까.", "공식 규격 확인이 먼저겠네요."]],
    ["question", "OTP 바꿀 때 기존 휴대폰부터 정리하면 안 되겠죠?", "휴대폰 바꾸기 전에 계정 복구 방법부터 확인하는 중. 인증 앱만 옮기면 끝인지 서비스별로 다시 확인해야 하는지 헷갈림. 복구 코드는 게시판에 공유하면 안 되겠죠.", ["네, 복구 정보는 절대 공개하면 안 됩니다.", "기존 기기 지우기 전에 새 기기로 인증되는지 확인하는 게 좋아요."]],
    ["tips", "후기에 쓸 숫자는 화면 보고 그대로 적기", "상품 가치랑 실제 받은 금액을 섞어 쓰면 읽는 사람도 헷갈림. 기록할 때 금액의 기준이 뭔지 같이 적으면 좋겠어요. 기억만 믿고 숫자 적는 건 피하는 편.", ["수수료 제외 전후 금액 구분하면 좋겠네요.", "날짜도 함께 있으면 조건 확인할 때 도움 됨.", "영수증 캡처는 개인정보부터 가리기."]],
    ["general", "주말엔 새 기기보다 책상 정리부터 해야겠다", "장바구니만 정리하다가 책상 보니까 선이 난리네 ㅋㅋ 일단 쓸 공간부터 만들어놓고 뭘 둘지 생각해야겠음. 예쁜 세팅 사진은 수납이 절반인 듯.", ["케이블 타이 몇 개만 써도 달라지죠.", "안 쓰는 충전기부터 빼는 게 시작임.", "공간 비우면 의외로 필요한 것도 줄어듦.", "책상 깊이가 진짜 중요하더라."]],
    ["question", "후기에는 첫인상하고 장기 사용기를 나눠 쓰는 게 낫나요?", "아직 오래 써보지도 않았는데 내구성까지 단정하는 건 좀 아닌 것 같아서요. 첫인상 먼저 남기고 나중에 수정하는 방식도 괜찮겠죠?", ["그게 더 구체적이고 읽기 편하죠.", "언제 수정했는지 같이 적으면 좋겠네요.", "처음 좋았던 부분이 나중엔 달라질 수도 있으니까.", "사용 기간이 있으면 비교할 때 도움이 됨.", "확인 못 한 건 확인 못 했다고 적는 게 제일 좋음."]],
    ["tips", "보관함에 둔 상품은 날짜도 같이 확인", "상품 이름만 보고 닫기 쉬운데 보관 기한도 확인해두는 게 좋겠네요. 어떤 선택을 할지 아직 못 정했다면 획득일과 현재 안내를 같이 보는 식으로요.", ["날짜가 있으면 나중에 다시 볼 때 편하죠.", "알림만 기다리기보다 직접 확인하는 습관이 좋음.", "설명 바뀌었는지도 체크하고.", "처리 전에 확인 화면을 한 번 더 읽는 편.", "모바일에서 숫자 작으면 확대해서 보는 것도 괜찮고.", "급하게 결정하지 않도록 미리 확인하자는 얘기죠."]],
  ];
  const names = ["테더사냥꾼", "반포자이꿈나무", "1달러전사", "시계덕후99", "야수의심장", "강남직장인", "퇴근후산책", "책상정리중", "숫자부터봄", "민트초코파", "주말집돌이", "가벼운가방", "구경하는사람", "질문많은초보", "기록하는습관", "오늘도커피", "천천히고르자", "작은손목", "소파와태블릿", "사진한장"];
  const epoch = Date.parse("2026-09-30T00:00:00.000Z");
  return threads.map(([category, title, body, comments], index) => {
    const id = `board_example_v1_${String(index + 1).padStart(2, "0")}`;
    const at = epoch - index * 5 * 3600000;
    return { id, source: "example", authorId: `${id}_author`, authorName: `예시 · ${names[index]}`, category, title, body, pinned: category === "notice", createdAt: new Date(at).toISOString(), revision: 1,
      comments: comments.map((text, n) => ({ id: `${id}_comment_${n + 1}`, source: "example", authorId: `${id}_reader_${n}`, authorName: `예시 · ${names[(index + n + 3) % names.length]}`, body: text, createdAt: new Date(at + (n + 1) * 60000).toISOString() })) };
  });
}
