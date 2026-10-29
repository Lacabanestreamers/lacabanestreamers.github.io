// Bouton « Ne pas être compté » de la page Confidentialité (fichier à part : la CSP n'autorise aucun script en ligne).
// GoatCounter (count.v4.js) ne compte rien quand localStorage.skipgc === 't' (même règle que le Site)
(function () {
  var b = document.getElementById('gc-toggle'), s = document.getElementById('gc-state');
  function off() { try { return localStorage.getItem('skipgc') === 't'; } catch (e) { return false; } }
  function maj() {
    b.textContent = off() ? 'Être compté de nouveau' : 'Ne pas être compté';
    b.setAttribute('aria-pressed', String(off()));
    s.textContent = off() ? 'Tes visites ne sont pas comptées sur ce navigateur.' : 'Tes visites sont comptées, de façon anonyme.';
  }
  b.addEventListener('click', function () {
    try { if (off()) localStorage.removeItem('skipgc'); else localStorage.setItem('skipgc', 't'); } catch (e) { /* stockage bloqué */ }
    maj();
  });
  maj();
})();
