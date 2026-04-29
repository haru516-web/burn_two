export function renderInvite() {
  return `
    <section class="page invite-screen">
      <form class="invite-card" data-invite-form>
        <div class="invite-card__copy">
          <p class="invite-card__eyebrow">Invitation</p>
          <h1 class="invite-card__title">招待コード</h1>
        </div>
        <label class="invite-card__field">
          <input
            class="invite-card__input"
            type="text"
            name="inviteCode"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="4"
            pattern="[0-9０-９]{4}"
            placeholder="0000"
            aria-label="4桁の招待コード"
            data-invite-code
          />
        </label>
        <p class="invite-card__error" data-invite-error hidden>コードが違います</p>
      </form>
    </section>
  `;
}
