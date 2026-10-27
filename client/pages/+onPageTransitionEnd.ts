export function onPageTransitionEnd(): void {
  document.body.classList.remove('is-page-transitioning');
}
