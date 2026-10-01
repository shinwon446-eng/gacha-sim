export function reviewValueNotice(locale: string): string {
  if (locale === "ko") return "후기 작성은 100 USDT($100) 이상 가치의 당첨 상품만 가능합니다.";
  if (locale === "zh") return "中奖商品价值达到 100 USDT 后，即可撰写评价。";
  return "Win an item worth at least 100 USDT to write a review.";
}
