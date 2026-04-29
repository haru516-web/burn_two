export function renderTopTabs(active) {
  const tabs = [
    { key: 'following', label: 'フォロー' },
    { key: 'recommended', label: 'おすすめ' },
  ];

  return `
    <div class="top-tabs" role="tablist" aria-label="タイムライン切り替え">
      ${tabs.map((tab) => `
        <button class="top-tabs__button ${active === tab.key ? 'is-active' : ''}" data-tab="${tab.key}" role="tab" aria-selected="${active === tab.key}">
          ${tab.label}
        </button>
      `).join('')}
    </div>
  `;
}
