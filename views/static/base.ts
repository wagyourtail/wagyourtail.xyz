window.addEventListener('resize', windowResize);

declare const pageContent: HTMLElement

function windowResize() {
    pageContent.style.height = `${window.innerHeight - 75}px`;
    (<HTMLElement>document.getElementById("content")).style.width = `${window.innerWidth - 210}px`;
}

windowResize();
