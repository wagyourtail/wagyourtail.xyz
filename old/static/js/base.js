window.addEventListener('resize', windowResize);

function windowResize() {
    pageContent.style.height = `${window.innerHeight - 75}px`;
    document.getElementById("content").style.width = `${window.innerWidth - 210}px`;
}

windowResize();
