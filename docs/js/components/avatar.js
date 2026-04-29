export function renderAvatarContent(imageData, fallback, alt = 'avatar') {
  if (imageData) {
    return `<img class="avatar__image" src="${imageData}" alt="${alt}" />`;
  }
  return `<span class="avatar__label">${fallback}</span>`;
}
