export const homeCopy = {
  ko: {
    heroEyebrow: "당신의 다음 발견", heroLine1: "열어보는 순간,", heroLine2: "새로운 가능성.", heroBody: "갖고 싶던 시계부터 매일의 테크까지. 취향에 맞는 박스를 고르고, 다음 발견을 만나보세요.", explore: "박스 고르기",
    collectionEyebrow: "박스 컬렉션", collectionTitle: "당신의 위시리스트, 눈으로만 보실 건가요?", collectionBody: "첫 시작은 가볍게, 부담 없이 시작하세요.",
    reviewEyebrow: "회원 공개 후기", reviewTitle: "대체 뭐가 나왔길래, 후기까지 남겼을까요?", reviewBody: "회원들이 직접 공개한 상품 후기. 가볍게 구경하러 왔다가, 갖고 싶은 게 늘어날지도 모릅니다.",
    guideEyebrow: "VOILA 이용 방법", guideTitle: "이제, 당신이 열 차례.", guideBody: "고르고, 열고, 결정하세요. 딱 세 단계.", guideMore: "이용 방법 보기",
    steps: [["갖고 싶은 그 상품, 어떤 박스에 있나요?", "가격과 구성품, 상품별 획득 확률을 확인하고 가장 눈길이 가는 박스를 선택하세요."], ["설마 나한테? 열어보면 알게 됩니다.", "개봉 전 총 결제 금액을 확인하고, 결과를 만나보세요. 개봉 결과는 보관함에서 다시 확인할 수 있습니다."], ["실물로 받을까요, 환급액으로 전환할까요?", "받은 상품의 실물 배송을 신청하거나, 표시된 환급액으로 전환하세요. 마지막 선택은 당신의 몫입니다."]],
    proofEyebrow: "공정성 검증", proofTitle: "확인할 수 있는 믿음.", proofBody: "개봉 전 시드 해시와 개봉 후 기록을 비교합니다. 공정성 검증기에서 같은 입력이 같은 결과를 만드는지 직접 확인하세요.", verify: "직접 검증하기",
  },
  en: {
    heroEyebrow: "YOUR NEXT DISCOVERY", heroLine1: "The moment you open,", heroLine2: "new possibilities.", heroBody: "From the watch you have wanted to the tech you use every day. Choose a box that fits your taste and discover what comes next.", explore: "Choose a box",
    collectionEyebrow: "BOX COLLECTION", collectionTitle: "Is your wishlist staying on the screen?", collectionBody: "Start light and take your first step with ease.",
    reviewEyebrow: "MEMBER REVIEWS", reviewTitle: "What could they have unboxed to leave a review?", reviewBody: "Member-shared product reviews. Come for a quick look; you may leave with a longer wishlist.",
    guideEyebrow: "HOW VOILA WORKS", guideTitle: "Now it is your turn to open.", guideBody: "Choose, open, and decide. Three simple steps.", guideMore: "How it works",
    steps: [["Which box holds the item you want?", "Check the price, contents, and item-by-item odds, then choose the box that catches your eye."], ["Could it be yours? Open it to find out.", "Review the total purchase amount before opening, then meet your result. You can revisit it anytime in your inventory."], ["Physical delivery or cashback?", "Request delivery for your item or convert it to the listed cashback amount. The final choice is yours."]],
    proofEyebrow: "FAIRNESS, VERIFIED", proofTitle: "Trust you can verify.", proofBody: "Compare the pre-open seed hash with the opening record. Use the fairness verifier to confirm that identical inputs produce the same result.", verify: "Verify it yourself",
  },
  zh: {
    heroEyebrow: "你的下一次发现", heroLine1: "打开的瞬间，", heroLine2: "新的可能。", heroBody: "从心仪的腕表到日常科技产品，选择契合品味的盲盒，发现下一份惊喜。", explore: "选择盲盒",
    collectionEyebrow: "盲盒系列", collectionTitle: "心愿清单，只想停留在屏幕上吗？", collectionBody: "轻松开始，毫无负担地迈出第一步。",
    reviewEyebrow: "会员公开评价", reviewTitle: "究竟开到了什么，才会留下评价？", reviewBody: "会员亲自公开的商品评价。随意看看，心愿清单可能会更长。",
    guideEyebrow: "VOILA 使用方式", guideTitle: "现在，轮到你打开。", guideBody: "选择、打开、决定，只需三步。", guideMore: "了解流程",
    steps: [["心仪的商品藏在哪个盲盒里？", "查看价格、内容物和各商品的获得概率，选择最吸引你的盲盒。"], ["会是我吗？打开就知道。", "打开前确认总支付金额，然后揭晓结果。你可随时在保管箱中再次查看。"], ["收取实物，还是转换为返现？", "可为获得的商品申请实物配送，也可按标示金额转换为返现。最后由你决定。"]],
    proofEyebrow: "公平性验证", proofTitle: "可验证的信任。", proofBody: "对比开启前的种子哈希与开启记录。使用公平性验证器，亲自确认相同输入是否产生相同结果。", verify: "亲自验证",
  },
} as const;

export function copyFor(locale: string) { return homeCopy[locale === "en" || locale === "zh" ? locale : "ko"]; }
