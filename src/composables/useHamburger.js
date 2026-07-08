import { ref } from "vue";

/**
 * useHamburger — 햄버거 메뉴 상태 관리를 위한 컴포저블.
 *
 * 메뉴의 열림/닫힘 상태(burgerEaten)와 이를 토글하는 함수를 제공한다.
 */
export function useHamburger() {
    const burgerEaten = ref(false); // 햄버거 메뉴가 열려 있는지 여부

    /** 햄버거 메뉴 상태를 토글한다. */
    function toggleHamburger() {
        burgerEaten.value = !burgerEaten.value
    }

    return {
        burgerEaten,
        toggleHamburger
    };
};