    const nav = document.querySelector(".navbar");
    const navLinks = document.querySelector(".nav-links");
    const toggle = document.querySelector(".menu-toggle");

    // Scroll effect for navbar
    window.addEventListener("scroll", () => {
      if (window.scrollY > 20) {
        nav.classList.add("scrolled");
      } else {
        nav.classList.remove("scrolled");
      }
    });

    // Mobile menu toggle
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true" || false;
      toggle.setAttribute("aria-expanded", !expanded);
      navLinks.classList.toggle("open");
    });

    // Intersection Observer for animations
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // Only animate once
        }
      });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observer.observe(el);
    });

    // Hero slider
    const slides = Array.from(document.querySelectorAll('.hero-slider .slide'));
    const dots = Array.from(document.querySelectorAll('.slider-dots button'));
    let slideIndex = 0;
    let slideTimer;

    function showSlide(index) {
      if (!slides.length) return;
      slideIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle('active', i === slideIndex));
      dots.forEach((dot, i) => dot.classList.toggle('active', i === slideIndex));
    }

    function nextSlide() {
      showSlide(slideIndex + 1);
    }

    function startSlider() {
      clearInterval(slideTimer);
      slideTimer = setInterval(nextSlide, 5000);
    }

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        showSlide(idx);
        startSlider();
      });
    });

    if (slides.length) {
      showSlide(0);
      startSlider();
    }

    // Set current year
    document.getElementById("year").textContent = new Date().getFullYear();

    function setNavShadow() {
      nav.classList.toggle("scrolled", window.scrollY > 8);
    }

    function closeMenu() {
      navLinks.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        closeMenu();
      });
    });

    window.addEventListener("scroll", setNavShadow);
    setNavShadow();

  
