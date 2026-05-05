import { getIcon } from './icons.js';

export function renderBottomNav(screen) {
  const activeScreen = screen === 'timeline' ? 'home' : screen;
  const isHomeActive = activeScreen === 'home';
  const isAlbumActive = activeScreen === 'search';
  const isRecordActive = activeScreen === 'record';
  const isMagazineActive = activeScreen === 'magazine';
  const isProfileActive = activeScreen === 'profile';

  if (!['home', 'timeline', 'search', 'record', 'magazine', 'profile'].includes(screen)) {
    return '';
  }

  return `
    <nav class="timeline-bottom-nav" aria-label="Primary navigation">
      <button class="timeline-bottom-nav__item ${isHomeActive ? 'is-active' : ''}" type="button" data-home-nav="home" aria-label="ホーム">
        <span class="timeline-bottom-nav__icon" aria-hidden="true">${getIcon('home')}</span>
        <span class="timeline-bottom-nav__label">ホーム</span>
      </button>
      <button class="timeline-bottom-nav__item ${isAlbumActive ? 'is-active' : ''}" type="button" data-home-nav="search" data-bottom-album aria-label="アルバム">
        <span class="timeline-bottom-nav__icon" aria-hidden="true">${getIcon('image')}</span>
        <span class="timeline-bottom-nav__label">アルバム</span>
      </button>
      <button class="timeline-bottom-nav__item ${isRecordActive ? 'is-active' : ''}" type="button" data-home-nav="record" aria-label="記録">
        <span class="timeline-bottom-nav__icon" aria-hidden="true">${getIcon('camera')}</span>
        <span class="timeline-bottom-nav__label">記録</span>
      </button>
      <button class="timeline-bottom-nav__item ${isMagazineActive ? 'is-active' : ''}" type="button" data-home-nav="magazine" aria-label="雑誌">
        <span class="timeline-bottom-nav__icon" aria-hidden="true">${getIcon('issue')}</span>
        <span class="timeline-bottom-nav__label">雑誌</span>
      </button>
      <button class="timeline-bottom-nav__item ${isProfileActive ? 'is-active' : ''}" type="button" data-home-nav="profile" aria-label="ふたり">
        <span class="timeline-bottom-nav__icon" aria-hidden="true">${getIcon('profile')}</span>
        <span class="timeline-bottom-nav__label">ふたり</span>
      </button>
    </nav>
  `;
}
