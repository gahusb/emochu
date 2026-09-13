// Reference counting makes parent/child modal cleanup safe in either order.
// No document access until a client-side effect acquires the lock.
let lockCount = 0;
let previousOverflow = '';

export function lockBodyScroll(): () => void {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount === 0) document.body.style.overflow = previousOverflow;
  };
}
