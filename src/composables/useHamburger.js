import { ref } from "vue";

export function useHamburger() {
    const burgerEaten = ref(false);

    function toggleHamburger() {
        burgerEaten.value = !burgerEaten.value
    }

    return {
        burgerEaten,
        toggleHamburger
    };
};