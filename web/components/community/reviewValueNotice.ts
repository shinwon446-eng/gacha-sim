export function reviewValueNotice(locale: string): string {
  if (locale === "ko") return "100 USDT 이상 상품 당첨 시 후기를 작성하고 보너스를 받을 수 있습니다";
  if (locale === "zh") return "中奖商品价值达到 100 USDT 后，即可撰写评价并获得奖励。";
  return "Win an item worth at least 100 USDT to write a review and receive a bonus.";
}
