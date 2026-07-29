import assert from "node:assert/strict";
import test from "node:test";
import {
  COMMENT_MAX_CHARACTERS,
  commentCharacterCount,
  containsDisallowedCommentControls,
  isValidCommentBody,
  limitCommentInput,
  normalizeCommentBody,
} from "../../lib/comments";

test("comments preserve intentional lines while trimming boundary whitespace", () => {
  assert.equal(
    normalizeCommentBody("  primeira linha\r\nsegunda linha\n"),
    "primeira linha\nsegunda linha",
  );
  assert.equal(isValidCommentBody("Não apareça mais no meu perfil\n"), true);
});

test("comment length matches database Unicode code-point counting", () => {
  assert.equal(commentCharacterCount("jogo 🎮"), 6);
  assert.equal(commentCharacterCount("🎮".repeat(COMMENT_MAX_CHARACTERS)), 500);
  assert.equal(
    commentCharacterCount(limitCommentInput("🎮".repeat(501))),
    COMMENT_MAX_CHARACTERS,
  );
});

test("comments allow line breaks and tabs but reject other control codes", () => {
  assert.equal(containsDisallowedCommentControls("linha 1\n\tlinha 2"), false);
  assert.equal(containsDisallowedCommentControls("texto\u0007oculto"), true);
  assert.equal(isValidCommentBody("texto\u0007oculto"), false);
  assert.equal(isValidCommentBody(" \n\t "), false);
});
