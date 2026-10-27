import { afterEach, describe, expect, it } from 'vitest';
import { onPageTransitionEnd } from '../../pages/+onPageTransitionEnd';
import { onPageTransitionStart } from '../../pages/+onPageTransitionStart';

const transitionClass = 'is-page-transitioning';

afterEach(() => {
  document.body.classList.remove(transitionClass);
});

describe('Vike page transition hooks', () => {
  it('shows the progress indicator when navigation starts', () => {
    onPageTransitionStart();

    expect(document.body).toHaveClass(transitionClass);
  });

  it('hides the progress indicator when navigation ends', () => {
    document.body.classList.add(transitionClass);

    onPageTransitionEnd();

    expect(document.body).not.toHaveClass(transitionClass);
  });
});
