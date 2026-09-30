export const homeCopy = {
  ko: {
    heroEyebrow: "당신의 다음 발견",
    heroLine1: "언제까지,",
    heroLine2: "남의 당첨소식에 배 아파 하실건가요?",
    heroBody: "갖고 싶던 시계부터 눈여겨보던 테크까지.\n\n부러움은 이제 그만. 이번엔 당신의 당첨을 도전해보세요.",
    explore: "박스 고르기",
    collectionEyebrow: "갖고 싶다는 말, 언제까지 혼잣말로만?",
    collectionTitle: "당신의 위시리스트, 눈으로만 보실 건가요?",
    collectionBody: "첫 시작은 가볍게, 부담 없이 시작하세요.",
    reviewEyebrow: "상품 후기",
    reviewTitle: "대체 뭐가 나왔길래, 후기까지 남겼을까요?",
    reviewBody: "회원들이 직접 공개한 상품 후기. 가볍게 구경하러 왔다가, 갖고 싶은 게 늘어날지도 모릅니다.",
    guideEyebrow: "HOW IT WORKS",
    guideTitle: "이제, 당신이 열 차례.",
    guideBody: "고르고, 열고, 결정하세요. 딱 세 단계.",
    guideMore: "이용 방법 보기",
    steps: [
      ["갖고 싶은 그 상품, 어떤 박스에 있나요?", "가격과 구성품, 상품별 획득 확률을 확인하고\n가장 눈길이 가는 박스를 선택하세요."],
      ["설마 나한테? 열어보면 알게 됩니다.", "개봉 전 총 결제 금액을 확인하고 결과를 만나보세요. 개봉 결과는 보관함에서 다시 확인할 수 있습니다."],
      ["실물로 받을까요, 환급액으로 전환할까요?", "받은 상품의 실물 배송을 신청하거나,\n표시된 환급액으로 전환하세요. 마지막 선택은 당신의 몫입니다."],
    ],
    proofEyebrow: "기대는 마음껏. 확인은 빈틈없이.",
    proofTitle: "공정하다는 말, 그냥 믿지 마세요.",
    proofBody: "개봉 전 시드 해시와 개봉 후 기록을 비교하고, 같은 입력으로 같은 결과가 재현되는지 직접 확인하세요. 믿을지는, 검증한 다음 결정하세요.",
    verify: "직접 검증하기",
  },
  en: {
    heroEyebrow: "YOUR NEXT DISCOVERY", heroLine1: "How long will you", heroLine2: "watch everyone else win?", heroBody: "From the watch you have wanted to the tech you have been eyeing.\n\nEnough envy. It is time to go for your own win.", explore: "Choose a box",
    collectionEyebrow: "How long will your wishlist stay unspoken?", collectionTitle: "Is your wishlist staying on the screen?", collectionBody: "Start light and take your first step with ease.",
    reviewEyebrow: "PRODUCT REVIEWS", reviewTitle: "What could they have unboxed to leave a review?", reviewBody: "Product reviews shared by members. Come for a quick look; you may leave with a longer wishlist.",
    guideEyebrow: "HOW IT WORKS", guideTitle: "Now it is your turn to open.", guideBody: "Choose, open, and decide. Three simple steps.", guideMore: "How it works",
    steps: [["Which box holds the item you want?", "Check the price, contents, and item-by-item odds, then choose the box that catches your eye."], ["Could it be yours? Open it to find out.", "Review the total purchase amount before opening, then meet your result. You can revisit it anytime in your inventory."], ["Physical delivery or cashback?", "Request delivery for your item or convert it to the listed cashback amount. The final choice is yours."]],
    proofEyebrow: "Expect freely. Verify thoroughly.", proofTitle: "Do not just take fairness at its word.", proofBody: "Compare the pre-open seed hash with the opening record and confirm that identical inputs reproduce the same result. Decide after you verify it.", verify: "Verify it yourself",
  },
  zh: {
    heroEyebrow: "下一次发现", heroLine1: "还要多久，", heroLine2: "只看着别人的中奖消息？", heroBody: "从心仪的腕表到一直关注的科技产品。\n\n别再羡慕了，这次就为自己的中奖而挑战。", explore: "选择盲盒",
    collectionEyebrow: "想拥有的话，还要默默说多久？", collectionTitle: "愿望清单，只打算看着吗？", collectionBody: "从轻松的第一步开始，没有负担。",
    reviewEyebrow: "商品评价", reviewTitle: "究竟开到了什么，才会留下评价？", reviewBody: "会员亲自公开的商品评价。轻松看看，愿望清单可能会变得更长。",
    guideEyebrow: "使用方法", guideTitle: "现在，轮到你打开了。", guideBody: "选择、打开、决定。只需三步。", guideMore: "查看使用方法",
    steps: [["心仪的商品在哪个盲盒里？", "确认价格、内容和各商品获得概率，选择最吸引你的盲盒。"], ["会是我吗？打开就知道了。", "打开前确认总支付金额，然后查看结果。结果可随时在保管箱中再次确认。"], ["收取实物，还是转换为返现？", "申请实物配送，或转换为标示的返现金额。最后由你决定。"]],
    proofEyebrow: "尽情期待。严谨确认。", proofTitle: "公平，不该只靠相信。", proofBody: "比较开箱前的种子哈希和开箱后记录，亲自确认相同输入能否复现相同结果。验证后再决定是否相信。", verify: "亲自验证",
  },
} as const;

export function copyFor(locale: string) {
  return homeCopy[locale === "en" || locale === "zh" ? locale : "ko"];
}
