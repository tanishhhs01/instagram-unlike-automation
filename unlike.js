;(async () => {
  const BATCH = 100;               // items per round (original: 80)
  const CLICK_DELAY = 25;          // ms between checkbox clicks (original: 100)
  const PAUSE_BETWEEN_BATCHES = 2000; // raise this if Instagram says "Try again later"

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const waitFor = async (fn, timeout = 15000, step = 100) => {
    const t = Date.now();
    while (Date.now() - t < timeout) {
      const v = fn();
      if (v) return v;
      await sleep(step);
    }
    return null;
  };

  const boxes = () => [...document.querySelectorAll('[aria-label="Toggle checkbox"]')];
  const byText = (sel, texts) =>
    [...document.querySelectorAll(sel)].find(e => e.offsetParent && texts.includes(e.textContent.trim()));
  const getSelectBtn = () =>
    document.querySelectorAll('div.wbloks_1 > span')[2] || byText('span, div[role="button"]', ['Select']);
  const scrollMore = () => {
    window.scrollTo(0, document.body.scrollHeight);
    boxes().pop()?.scrollIntoView({ block: 'end' }); // also scrolls the inner grid
  };

  let total = 0, failures = 0;

  while (failures < 3) {
    // Enter select mode (skip if already in it)
    if (!boxes().length) {
      const sel = await waitFor(getSelectBtn, 15000);
      if (!sel) { console.log('Select button not found.'); break; }
      sel.click();
    }

    if (!(await waitFor(() => boxes().length, 8000))) {
      console.log('No items left (or none loaded).');
      failures++;
      continue;
    }

    // Load more items until we have a full batch
    for (let i = 0; i < 5 && boxes().length < BATCH; i++) {
      const n = boxes().length;
      scrollMore();
      if (!(await waitFor(() => boxes().length > n, 2500))) break;
    }

    const batch = boxes().slice(0, BATCH);
    for (const b of batch) { b.click(); await sleep(CLICK_DELAY); }

    const unlike = byText('span', ['Unlike', 'Gefällt mir nicht mehr']);
    if (!unlike) { console.log('Unlike button not found.'); failures++; continue; }
    unlike.click();

    const confirm = await waitFor(() => document.querySelector('button[tabindex="0"]'), 5000);
    if (!confirm) { console.log('Confirm button not found.'); failures++; continue; }
    confirm.click();

    // Only count the batch if the items actually disappeared
    const done = await waitFor(() => !document.body.contains(batch[0]) || !boxes().length, 10000);
    if (done) {
      failures = 0;
      total += batch.length;
      console.log(`Unliked ${total} so far`);
    } else {
      failures++;
      console.log('Batch did not go through, retrying...');
    }
    await sleep(PAUSE_BETWEEN_BATCHES);
  }
  console.log(`Finished. Unliked ${total}.`);
})();