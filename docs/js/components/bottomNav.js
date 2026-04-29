import { getIcon } from './icons.js';

export function renderBottomNav(screen) {
  const activeScreen = screen === 'timeline' ? 'home' : screen;
  const isTimelineActive = activeScreen === 'home';
  const isProfileActive = activeScreen === 'profile';

  if (!['home', 'timeline', 'search', 'profile'].includes(screen)) {
    return '';
  }

  return `
    <nav class="timeline-bottom-nav" aria-label="Primary navigation">
      <button class="timeline-bottom-nav__item ${isTimelineActive ? 'is-active' : ''}" type="button" data-home-nav="home" aria-label="ホーム">
        <span class="timeline-bottom-nav__icon" aria-hidden="true">${getIcon('home')}</span>
        <span class="timeline-bottom-nav__label">ホーム</span>
      </button>
      <button class="timeline-bottom-nav__item timeline-bottom-nav__item--compose" type="button" data-home-nav="compose" aria-label="編集">
        <span class="timeline-bottom-nav__icon" aria-hidden="true">${getIcon('post')}</span>
        <span class="timeline-bottom-nav__label">編集</span>
      </button>
      <button class="timeline-bottom-nav__item ${isProfileActive ? 'is-active' : ''}" type="button" data-home-nav="profile" aria-label="ふたり">
        <span class="timeline-bottom-nav__icon" aria-hidden="true">${getIcon('profile')}</span>
        <span class="timeline-bottom-nav__label">ふたり</span>
      </button>
    </nav>
  `;
}
