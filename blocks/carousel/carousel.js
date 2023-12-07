function createCarousel() {
  const carouselWrappers = document.querySelectorAll('.carousel-wrapper');

  carouselWrappers.forEach((carouselWrapper) => {
    const carousel = carouselWrapper.querySelector('.carousel');

    // Create left and right arrows
    const leftArrow = document.createElement('div');
    leftArrow.className = 'arrow chevron-left';

    const rightArrow = document.createElement('div');
    rightArrow.className = 'arrow chevron-right';

    const numSlides = [...carousel.querySelectorAll(':scope > div > div')].length;

    if (numSlides > 1) {
      // Fetch SVG files
      fetch('/icons/chevron-left.svg')
        .then((response) => response.text())
        .then((svgContent) => {
          leftArrow.innerHTML = svgContent;

          // Attach event listener to left arrow
          leftArrow.addEventListener('click', () => {
            const itemWidth = carouselWrapper.offsetWidth;
            const scrollAmount = itemWidth;

            carousel.scrollLeft -= scrollAmount;
          });
        });

      fetch('/icons/chevron-right.svg')
        .then((response) => response.text())
        .then((svgContent) => {
          rightArrow.innerHTML = svgContent;

          // Attach event listener to right arrow
          rightArrow.addEventListener('click', () => {
            const itemWidth = carouselWrapper.offsetWidth;
            const scrollAmount = itemWidth;

            carousel.scrollLeft += scrollAmount;
          });
        });

      // Append arrows to the carousel wrapper
      carouselWrapper.appendChild(leftArrow);
      carouselWrapper.appendChild(rightArrow);
    } else {
      carouselWrapper.classList.add('carousel-single-slide');
    }
  });
}

export default async function decorate() {
  createCarousel();
}
