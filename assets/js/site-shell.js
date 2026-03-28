(function () {
  const body = document.body;
  const basePath = body.getAttribute("data-base-path") || ".";
  const section = body.getAttribute("data-section") || "home";

  const href = function (path) {
    return basePath + "/" + path;
  };

  const headerMount = document.getElementById("site-header");
  const footerMount = document.getElementById("site-footer");

  if (headerMount) {
    headerMount.innerHTML =
      '<header class="site-header">' +
      '  <div class="header-inner">' +
      '    <a class="brand" href="' + href('index.html') + '">' +
      '      <span class="brand-mark" aria-hidden="true">' +
      '        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.4"/>' +
      '          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.4"/>' +
      '        </svg>' +
      '      </span>' +
      '      <span>' +
      '        <h1>Global Vision</h1>' +
      '        <small>powered by META-GENIUSZ System</small>' +
      '      </span>' +
      '    </a>' +
      '    <nav class="main-nav">' +
      '      <a data-id="home" href="' + href('index.html') + '">Start</a>' +
      '      <a data-id="absolut" href="' + href('absolut/index.html') + '">Absolut</a>' +
      '      <a data-id="rooms" href="' + href('rooms/index.html') + '">Pokoje</a>' +
      '      <a data-id="member" href="' + href('member/index.html') + '">Member</a>' +
      '      <a data-id="admin" href="' + href('admin/index.html') + '">Admin</a>' +
      '    </nav>' +
      '  </div>' +
      '</header>';

    headerMount.querySelectorAll(".main-nav a").forEach(function (link) {
      if (link.getAttribute("data-id") === section) {
        link.classList.add("active");
      }
    });
  }

  if (footerMount) {
    footerMount.innerHTML =
      '<footer class="site-footer">' +
      '  <div class="footer-inner">' +
      '    <div>mtaquestwebsidex.com — oficjalna platforma Global Vision</div>' +
      '    <div class="quick-links">' +
      '      <a href="' + href('absolut/index.html') + '">ABSOLUT</a>' +
      '      <a href="' + href('rooms/index.html') + '">Pokoje</a>' +
      '      <a href="' + href('member/index.html') + '">Strefa Właściciela</a>' +
      '    </div>' +
      '    <div>Copyright © 2024 Global Vision & META-GENIUSZ System</div>' +
      '  </div>' +
      '</footer>';
  }
})();
