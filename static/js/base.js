window.addEventListener('resize', windowResize);

const desc = document.getElementById("description");

function windowResize() {
    if (desc) desc.style.maxWidth = `${window.innerWidth - 210}px`;
}

windowResize();
