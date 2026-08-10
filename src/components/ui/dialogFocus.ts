'use client'

import { useEffect, type RefObject } from 'react'

// 대화상자가 열렸을 때 키보드 초점을 안쪽에 묶어 둔다.
//
// 왜 필요한가: 모달 세 개(후기·시험일정·모드 안내) 모두 초점 관리가 없었다.
// 마우스로는 안 보이지만 키보드로 쓰면 이렇게 된다 —
//   1) 모달을 열어도 초점은 뒤 화면의 버튼에 그대로 남는다. Tab을 눌러도
//      모달이 아니라 뒤에 깔린 페이지를 훑는다(모달은 눈앞에 떠 있는데).
//   2) 계속 Tab하면 모달 밖으로 새어 나간다. 낭독기 사용자는 지금 무엇을
//      다루고 있는지 알 수 없다.
//   3) 닫아도 초점이 원래 자리로 안 돌아와 문서 맨 위로 튕긴다.
//
// aria-modal="true"만으로는 부족하다 — 그건 '이건 대화상자다'라고 알릴 뿐,
// Tab이 실제로 어디로 갈지는 바꾸지 않는다.

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * @param open   대화상자가 열려 있는가
 * @param ref    role="dialog"가 붙은 요소
 * @param onClose ESC를 눌렀을 때 호출(닫기 동작). 없으면 ESC는 무시한다.
 */
export function useDialogFocus(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose?: () => void,
): void {
  useEffect(() => {
    if (!open) return
    const root = ref.current
    if (!root) return

    // 열기 전에 초점이 있던 곳을 기억한다 — 닫을 때 여기로 돌려보낸다.
    const opener = document.activeElement as HTMLElement | null

    const focusables = () =>
      [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        el => el.offsetParent !== null || getComputedStyle(el).position === 'fixed',
      )

    // 안쪽 첫 요소로 옮긴다. 없으면 대화상자 자체(tabindex=-1)를 잡는다.
    const first = focusables()[0]
    if (first) first.focus()
    else {
      root.setAttribute('tabindex', '-1')
      root.focus()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const list = focusables()
      if (list.length === 0) return
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      const active = document.activeElement as HTMLElement | null
      // 양 끝에서 감아 돌려 모달 밖으로 못 나가게 한다.
      if (e.shiftKey && (active === firstEl || !root.contains(active))) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && (active === lastEl || !root.contains(active))) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // 닫힐 때 원래 자리로. 그 요소가 사라졌으면 아무 것도 하지 않는다.
      if (opener && document.contains(opener)) opener.focus()
    }
  }, [open, ref, onClose])
}
