import unittest

from gacha import Gacha, summarize


class GachaTest(unittest.TestCase):
    def test_pull_returns_known_rarity(self):
        g = Gacha(seed=1)
        for _ in range(50):
            self.assertIn(g.pull(), g.rates)

    def test_pull_many_length(self):
        g = Gacha(seed=1)
        self.assertEqual(len(g.pull_many(10)), 10)

    def test_pull_many_rejects_zero(self):
        with self.assertRaises(ValueError):
            Gacha().pull_many(0)

    def test_invalid_rates_rejected(self):
        with self.assertRaises(ValueError):
            Gacha(rates={"SSR": 10.0, "R": 50.0})

    def test_top_rarity_is_lowest_rate(self):
        self.assertEqual(Gacha().top_rarity, "SSR")

    def test_seed_makes_results_reproducible(self):
        a = Gacha(seed=42).pull_many(20)
        b = Gacha(seed=42).pull_many(20)
        self.assertEqual(a, b)

    def test_summarize_counts(self):
        self.assertEqual(summarize(["R", "R", "SSR"]), {"R": 2, "SSR": 1})


if __name__ == "__main__":
    unittest.main()
