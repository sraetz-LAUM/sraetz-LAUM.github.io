// main.js

$(function () {
    // ------------------------------
    // Helper: Update theme icon
    // ------------------------------
    function updateIcon() {
        const icon = document.getElementById("theme-icon") || document.getElementById("theme-toggle").querySelector("i");
        if (!icon) return;

        let theme = document.documentElement.getAttribute("data-theme");

        icon.style.opacity = 0;
        icon.style.transform = "rotate(-180deg)";

        setTimeout(() => {
            icon.classList.remove("fa-moon", "fa-sun");
            icon.classList.add(theme === "dark" ? "fa-sun" : "fa-moon");

            icon.style.opacity = 1;
            icon.style.transform = "rotate(0deg)";
        }, 150);
    }

    // ------------------------------
    // Helper: Swap images for dark/light
    // ------------------------------
    function swapDarkImages(theme, $scope) {
        const $els = $scope ? $($scope) : $(".cover-desktop[data-dark-src], .cover-mobile[data-dark-src], img[data-dark-src], div[data-dark-src]");

        $els.each(function() {
            const $el = $(this);

            const darkSrc = $el.attr("data-dark-src");
            const lightSrc = $el.attr("data-light-src") || $el.attr("src");

            const newSrc = (theme === "dark" && darkSrc) ? darkSrc : lightSrc;
            if (!newSrc) return;

            if ($el.is("img")) {
                if ($el.attr("src") !== newSrc) {
                    $el.stop(true).animate({ opacity: 0 }, 150, function () {
                        $el.attr("src", newSrc)
                           .one("load error", function() {
                               $el.animate({ opacity: 1 }, 150);
                           });
                    });
                }
            } else if ($el.is("div")) {
                const currentBg = $el.css("background-image").replace(/url\(["']?|["']?\)/g, '');
                if (currentBg !== newSrc) {
                    $el.stop(true).animate({ opacity: 0 }, 150, function () {
                        $el.css("background-image", `url('${newSrc}')`).animate({ opacity: 1 }, 150);
                    });
                }
            }
        });
    }

    // ------------------------------
    // Apply saved theme or system preference
    // ------------------------------
    let savedTheme = localStorage.getItem("theme");
    let systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    let initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

    document.documentElement.setAttribute("data-theme", initialTheme);
    swapDarkImages(initialTheme);
    updateIcon();

    // ------------------------------
    // Theme toggle button
    // ------------------------------
    $("#theme-toggle").on("click", () => {
        let theme = document.documentElement.getAttribute("data-theme");
        let newTheme = theme === "dark" ? "light" : "dark";

        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);

        updateIcon();
        swapDarkImages(newTheme);
    });

    window.addEventListener("pageshow", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
        swapDarkImages(currentTheme);
    });

    // ---------------------------------------------
    // Fix: Ensure lazy elements reappear on back navigation
    // ---------------------------------------------
    $(window).on("pageshow", function () {
        const currentTheme = document.documentElement.getAttribute("data-theme") || "light";

        // Reapply theme-dependent visuals
        swapDarkImages(currentTheme);
        updateTranslucentOverlays();

        // Force show() for any lazy-loaded but hidden elements
        $("img.lazy-loaded, div.lazy-loaded").each(function () {
            const $el = $(this);
            if ($el.css("display") === "none") {
                $el.css("display", "block"); // or flex if you ever use flex-based containers
            }
        });

        // Reinitialize LazyLoad in case something was skipped
        $("img.lazy:not(.lazy-loaded), div.lazy:not(.lazy-loaded)").each(function () {
            $(this).Lazy({ visibleOnly: true, ...lazyLoadOptions });
        });
    });

    // ------------------------------
    // Masonry grid & lazy-loading
    // ------------------------------
    var $grid = $('.grid').masonry({
        percentPosition: true,
        itemSelector: ".grid-item",
        columnWidth: ".grid-sizer"
    });

    const lazyLoadOptions = {
        scrollDirection: 'vertical',
        effect: 'fadeIn',
        effectTime: 300,
        placeholder: "",
        beforeLoad: function(element) {
            const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
            const darkSrc = element.attr("data-dark-src");
            const lightSrc = element.attr("data-light-src");

            if (currentTheme === "dark" && darkSrc) {
                element.attr("data-src", darkSrc);
            } else if (lightSrc) {
                element.attr("data-src", lightSrc);
            }
        },
        onError: function(element) {
            console.log('[lazyload] Error loading ' + element.data('src'));
        },
        afterLoad: function(element) {
            element.addClass('lazy-loaded');
            if (!element.hasClass('cover-mobile-bg')) {
                element.css('background-image', 'none');
            }
            const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
            swapDarkImages(currentTheme, element);
            $grid.masonry('layout');
        }
    };

    $('img.lazy, div.lazy:not(.always-load)').Lazy({ visibleOnly: true, ...lazyLoadOptions });
    $('div.lazy.always-load').Lazy({ visibleOnly: false, ...lazyLoadOptions });

    // Layout Masonry after each image loads
    $grid.imagesLoaded().progress(function () {
        const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
        swapDarkImages(currentTheme);
        $grid.masonry('layout');
    });

    // ------------------------------
    // Publication search/filter + keyword highlight
    // ------------------------------
    function searchPublications() {
        const input = document.getElementById("publication-search").value.toLowerCase();
        const keywords = input.split(/\s+/).filter(k => k.length); // split on spaces, remove empty

        const matchedIds = new Set();

        // --- 1. Check desktop cards ---
        document.querySelectorAll(".publication-card.cover-desktop").forEach(card => {
            const pubId = card.getAttribute("data-pub-id");
            const text = card.textContent.toLowerCase();
            const matches = keywords.every(kw => text.includes(kw)); // all keywords must match

            if (matches || keywords.length === 0) matchedIds.add(pubId);

            // Reset previous highlights
            card.querySelectorAll(".highlight").forEach(el => {
                el.outerHTML = el.textContent;
            });

            // Apply highlights
            if (matches && keywords.length > 0) {
                highlightText(card, keywords);
            }
        });

        // --- 2. Sync visibility for all cards ---
        document.querySelectorAll(".publication-card").forEach(card => {
            const pubId = card.getAttribute("data-pub-id");
            const isDesktop = card.classList.contains("cover-desktop");
            const isMobile = card.classList.contains("cover-mobile");
            const matches = matchedIds.has(pubId);

            if (window.innerWidth >= 768 && isDesktop) {
                // Medium and up → show only desktop cards
                card.style.setProperty('display', matches ? 'block' : 'none', 'important');
            } else if (window.innerWidth < 768 && isMobile) {
                // Small screens → show only mobile cards
                card.style.setProperty('display', matches ? 'block' : 'none', 'important');
            } else {
                // All other cards hidden
                card.style.setProperty('display', 'none', 'important');
            }
        });

        // --- 3. Relayout Masonry if exists ---
        if (typeof $grid !== "undefined") {
            $grid.masonry('layout');
        }
    }

    // --- 4. Bind input event ---
    const searchInput = document.getElementById("publication-search");
    if (searchInput) {
        searchInput.addEventListener("input", searchPublications);
    }

    // --- 5. Highlight helper (DOM-safe) ---
    function highlightText(node, keywords) {
        if (node.nodeType === 3) { // text node
            let text = node.nodeValue;
            let replaced = false;

            keywords.forEach(kw => {
                if (!kw) return;
                const regex = new RegExp(`(${kw})`, 'gi');
                if (regex.test(text)) {
                    const span = document.createElement('span');
                    span.innerHTML = text.replace(regex, '<span class="highlight">$1</span>');
                    node.parentNode.replaceChild(span, node);
                    replaced = true;
                }
            });
            return replaced;
        } else if (node.nodeType === 1 && node.childNodes && node.tagName !== 'MARK' && !node.classList.contains('highlight')) {
            Array.from(node.childNodes).forEach(child => highlightText(child, keywords));
        }
    }

    // To handle the resizing during a search
    window.addEventListener('resize', searchPublications);

    // ------------------------------
    // for the nav-bar year in publications page
    // ------------------------------
    // smooth scrolling and adjust the target so that the year is seen (not hidden by navbar
    document.querySelectorAll('#navbar-year a').forEach(anchor => {
      anchor.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          window.scrollTo({
            top: target.offsetTop - 60, // adjust offset for sticky header
            behavior: 'smooth'
          });
        }
      });
    });

    // ------------------------------
    // Keep active year visible in Scrollspy (even when no section is visible)
    // Handles both scroll directions
    // ------------------------------
    const navLinks = document.querySelectorAll("#navbar-year a");
    let lastActive = null;
    let lastScrollTop = window.scrollY;

    document.addEventListener("activate.bs.scrollspy", () => {
      const newActive = document.querySelector("#navbar-year .active");
      if (newActive) lastActive = newActive;
    });

    window.addEventListener("scroll", () => {
      const currentScroll = window.scrollY;
      const scrollingUp = currentScroll < lastScrollTop;
      lastScrollTop = currentScroll;

      const active = document.querySelector("#navbar-year .active");

      if (!active) {
        if (scrollingUp) {
          // find the last heading above the current viewport
          const years = Array.from(document.querySelectorAll("[id^='year-']"));
          for (let i = years.length - 1; i >= 0; i--) {
            const rect = years[i].getBoundingClientRect();
            if (rect.top < 100) { // a bit below the top threshold
              const link = document.querySelector(`#navbar-year a[href="#${years[i].id}"]`);
              if (link) {
                navLinks.forEach(l => l.classList.remove("active"));
                link.classList.add("active");
                lastActive = link;
              }
              break;
            }
          }
        } else if (lastActive) {
          // scrolling down → keep the last one highlighted
          lastActive.classList.add("active");
        }
      }
    });

});
