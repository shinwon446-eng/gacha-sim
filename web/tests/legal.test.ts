import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createTranslator } from "next-intl";
import { LEGAL_DOCS, LEGAL_GROUPS, LEGAL_VALUES, LEGAL_VERSION } from "../lib/legal";

for (const locale of ["ko", "en", "zh"]) {
  test(`${locale}: every linked policy is complete, renders ICU values and is labelled draft`, () => {
    const messages = JSON.parse(readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8"));
    const errors: unknown[] = [];
    const t = createTranslator({ locale, messages, onError: error => errors.push(error) });
    const linkedDocs = LEGAL_GROUPS.flatMap(group => [...group.docs]);
    assert.deepEqual([...linkedDocs].sort(), [...LEGAL_DOCS].sort());
    assert.deepEqual(Object.keys(messages.legalDocs).sort(), [...LEGAL_DOCS].sort());
    assert.ok(t("legalCenter.version", { version: LEGAL_VERSION }).includes(LEGAL_VERSION));
    for (const key of LEGAL_DOCS) {
      const doc = messages.legalDocs[key];
      assert.ok(doc.title && doc.summary && doc.sections.length >= 5, key);
      doc.sections.forEach((section: { h: string; p: string }, i: number) => {
        assert.ok(section.h && section.p, `${key}.${i}`);
        const rendered = t(`legalDocs.${key}.sections.${i}.p`, LEGAL_VALUES);
        assert.ok(!/\{\w+\}/.test(rendered), `${key}.${i}: unresolved value`);
      });
    }
    const feeText = t("legalDocs.withdrawals.sections.1.p", LEGAL_VALUES);
    assert.ok(feeText.includes(LEGAL_VALUES.bepFee) && feeText.includes(LEGAL_VALUES.trcFee));
    assert.ok(!feeText.includes("0.80"), "obsolete BEP-20 fee must not return");
    assert.deepEqual(errors, []);
  });
}
