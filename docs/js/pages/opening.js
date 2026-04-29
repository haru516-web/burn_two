export function renderOpening(underlayHtml = '') {
  return `
    <section class="opening-screen">
      <div class="opening-screen__underlay" aria-hidden="true">
        ${underlayHtml}
      </div>
      <div class="opening-screen__inner">
        <div class="opening-screen__stage" aria-label="BURN">
          <canvas class="opening-screen__canvas" id="openingCanvas"></canvas>
        </div>
      </div>
    </section>
  `;
}
