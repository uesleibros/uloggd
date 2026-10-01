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
  assert(views.length <= 7);
  assert.equal(
    new Set(views.map((view) => view.toString("base64"))).size,
    views.length,
  );
  for (const view of views)
    assert.equal(view.length, SCREENING_INPUT * SCREENING_INPUT * 3);
  const monochrome = views.find((view) => {
    for (let pixel = 0; pixel < view.length; pixel += 3)
      if (view[pixel] !== view[pixel + 1] || view[pixel] !== view[pixel + 2])
        return false;
    return true;
  });
  assert(monochrome, "a colour-neutral view remains available");
  assert.notDeepEqual(views[0], monochrome);
  assert(
    views.some((view) => view[0] > view[2] && view.at(-3)! > view.at(-1)!),
    "left crop retains the red content",
  );
  assert(
    views.some((view) => view[2] > view[0] && view.at(-1)! > view.at(-3)!),
    "right crop retains the blue content",
  );
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
  assert.equal(
    squareViews.length,
    1,
    "identical model inputs are screened once",
  );
  assert(
    squareViews[0].every((value) => value === 255),
    "transparent pixels are screened as displayed on white",
  );
});

test("uniform borders cannot replace the view of the actual content", async () => {
  const content = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "#d16030" },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="50" height="50"><rect width="50" height="50" fill="#285fa3"/></svg>',
        ),
        left: 25,
        top: 25,
      },
    ])
    .png()
    .toBuffer();
  const expected = await sharp(content)
    .resize(SCREENING_INPUT, SCREENING_INPUT)
    .removeAlpha()
    .raw()
    .toBuffer();
  for (const background of ["#ffffff", "#000000"]) {
    const bordered = await sharp(content)
      .extend({ top: 100, bottom: 100, left: 100, right: 100, background })
      .png()
      .toBuffer();
    const views = [];
    for await (const view of screeningViews(bordered)) views.push(view);
    assert(views.length <= 7);
    assert(
      views.some((view) => view.equals(expected)),
      "the content is also screened without its border",
    );
  }
});

test("tiny and uniformly coloured images still have a valid model input", async () => {
  for (const size of [1, 2, 8]) {
    const input = await sharp({
      create: { width: size, height: size, channels: 3, background: "#000000" },
    })
      .png()
      .toBuffer();
    const views = [];
    for await (const view of screeningViews(input)) views.push(view);
    assert.equal(views.length, 1);
    assert.equal(views[0].length, SCREENING_INPUT * SCREENING_INPUT * 3);
  }
});
