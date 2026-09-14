"""간단한 가챠(뽑기) 시뮬레이터.

등급별 확률 테이블을 기반으로 아이템을 뽑고,
일정 횟수 동안 최고 등급이 나오지 않으면 보장(천장)으로 최고 등급을 지급한다.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field


# 등급 이름 -> 확률(%). 합계는 100이어야 한다.
DEFAULT_RATES: dict[str, float] = {
    "SSR": 3.0,
    "SR": 12.0,
    "R": 85.0,
}

# 최고 등급이 이 횟수 동안 나오지 않으면 다음 뽑기에서 보장
DEFAULT_PITY = 90


@dataclass
class Gacha:
    rates: dict[str, float] = field(default_factory=lambda: dict(DEFAULT_RATES))
    pity: int = DEFAULT_PITY
    seed: int | None = None

    def __post_init__(self) -> None:
        total = sum(self.rates.values())
        if abs(total - 100.0) > 1e-9:
            raise ValueError(f"확률 합계는 100이어야 합니다 (현재 {total})")
        if self.pity < 1:
            raise ValueError("pity는 1 이상이어야 합니다")
        self._rng = random.Random(self.seed)
        self._since_top = 0  # 최고 등급이 마지막으로 나온 뒤 뽑은 횟수

    @property
    def top_rarity(self) -> str:
        """확률이 가장 낮은 등급을 최고 등급으로 본다."""
        return min(self.rates, key=self.rates.get)

    @property
    def pulls_since_top(self) -> int:
        return self._since_top

    def pull(self) -> str:
        """아이템 하나를 뽑아 등급을 돌려준다."""
        if self._since_top >= self.pity - 1:
            result = self.top_rarity
        else:
            names = list(self.rates)
            weights = [self.rates[n] for n in names]
            result = self._rng.choices(names, weights=weights, k=1)[0]

        if result == self.top_rarity:
            self._since_top = 0
        else:
            self._since_top += 1
        return result

    def pull_many(self, n: int) -> list[str]:
        """n번 연속으로 뽑는다."""
        if n < 1:
            raise ValueError("n은 1 이상이어야 합니다")
        return [self.pull() for _ in range(n)]


def summarize(results: list[str]) -> dict[str, int]:
    """뽑기 결과 목록을 등급별 개수로 집계한다."""
    counts: dict[str, int] = {}
    for r in results:
        counts[r] = counts.get(r, 0) + 1
    return counts


if __name__ == "__main__":
    g = Gacha()
    print(summarize(g.pull_many(100)))
