# 가챠서비

간단한 가챠(뽑기) 시뮬레이터입니다. 등급별 확률 테이블로 아이템을 뽑고,
최고 등급이 일정 횟수 동안 나오지 않으면 보장(천장)으로 지급합니다.

## 사용법

```python
from gacha import Gacha, summarize

g = Gacha(seed=42)
print(g.pull())              # "R", "SR", "SSR" 중 하나
print(summarize(g.pull_many(100)))
```

## 기본 확률

| 등급 | 확률 |
|------|------|
| SSR  | 3%   |
| SR   | 12%  |
| R    | 85%  |

보장(천장)은 기본 90회입니다. 최고 등급이 89회 연속 나오지 않으면 90번째 뽑기는 무조건 최고 등급입니다.

## 테스트 실행

```bash
python -m unittest -v
```

## 요구 사항

- Pyhton 3.10 이상 (외부 의존성 없음)
