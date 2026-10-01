import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  SCREENING_INPUT,
  screeningViews,
} from "../../lib/server-image-views.ts";

test("screening keeps a full colour view and adds bounded colour-neutral and crop views", async () => {
  // The red left half and blue right half make it possible to distinguish crops.
  const input = await sharp({
    create: { width: 600, height: 200, channels: 3, background: "#ff0000" },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 300,
            height: 200,
            channels: 3,
            background: "#0000ff",
          },
        })
          .png()
          .toBuffer(),
        left: 300,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
  const views = [];
  for await (const view of screeningViews(input)) views.push(view);
  assert.equal(views.length, 6);
  for (const view of views)
    assert.equal(view.length, SCREENING_INPUT * SCREENING_INPUT * 3);
  assert.notDeepEqual(views[0], views[2]);
  for (let pixel = 0; pixel < views[2].length; pixel += 3) {
    assert.equal(views[2][pixel], views[2][pixel + 1]);
    assert.equal(views[2][pixel], views[2][pixel + 2]);
  }
  assert(views[4][0] > views[4][2], "left crop retains the red content");
  assert(views[5][2] > views[5][0], "right crop retains the blue content");
  const square = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();
  const squareViews = [];
  for await (const view of screeningViews(square)) squareViews.push(view);
  assert.equal(squareViews.length, 4);
  assert(
    squareViews[0].every((value) => value === 255),
    "transparent pixels are screened as displayed on white",
  );
});
