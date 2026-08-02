"use strict";
/* ============================================================
Quest Idle — ui/onboarding-view.js
Petit tutoriel d'accueil (4 diapositives), affiché automatiquement
une seule fois après la toute première création de personnage (voir
confirmHeroSelection en modal-view.js). Peut être revu à tout moment
depuis les Paramètres ("Revoir le tutoriel").
============================================================ */

var onboardingStep = 0;

var ONBOARDING_SLIDES = [
  {
    icon: "⚔️",
    title: "Tape pour attaquer",
    text: "Appuie sur l'ennemi à l'écran pour lui infliger des dégâts. Ton héros attaque aussi tout seul grâce à l'auto DPS, même sans y toucher."
  },
  {
    icon: "📈",
    title: "Deviens plus fort",
    text: "La Boutique, les Talents et l'Équipement font grandir tes stats. Les boss laissent parfois tomber du butin — ou achète-en directement à l'échoppe."
  },
  {
    icon: "☰",
    title: "Le Menu",
    text: "Le bouton \"Menu\" en bas à droite regroupe tous les écrans : Carte du monde, Donjon, Village, Bestiaire, Ascension, et bien plus encore."
  },
  {
    icon: "🌀",
    title: "L'Ascension",
    text: "Quand la progression ralentit, ascensionne : tu repars de zéro mais gagnes de l'Aether, une monnaie permanente qui te rend plus fort pour toujours."
  }
];

function buildOnboardingHTML() {
  var slide = ONBOARDING_SLIDES[onboardingStep];
  var isLast = onboardingStep === ONBOARDING_SLIDES.length - 1;

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu onboarding-card">';
  h += '    <div class="onboarding-icon">' + slide.icon + '</div>';
  h += '    <div class="onboarding-title">' + esc(slide.title) + '</div>';
  h += '    <div class="onboarding-text">' + esc(slide.text) + '</div>';

  h += '    <div class="onboarding-dots">';
  ONBOARDING_SLIDES.forEach(function (s, i) {
    h += '<span class="onboarding-dot' + (i === onboardingStep ? ' is-active' : '') + '"></span>';
  });
  h += '    </div>';

  h += '    <div class="onboarding-actions">';
  if (!isLast) {
    h += '<button class="settings-btn" type="button" onclick="skipOnboarding()">Passer</button>';
    h += '<button class="settings-btn primary" type="button" onclick="nextOnboardingStep()">Suivant</button>';
  } else {
    h += '<button class="settings-btn primary onboarding-full-width" type="button" onclick="closeOnboarding()">Commencer l\u2019aventure !</button>';
  }
  h += '    </div>';

  h += '  </div>';
  h += '</div>';
  return h;
}

/* Ouvre le tutoriel. `force` = true permet de le rouvrir manuellement
   (bouton "Revoir le tutoriel" des Paramètres) même s'il a déjà été
   vu — sans ce paramètre, ne s'affiche qu'une seule fois par partie. */
function openOnboarding(force) {
  if (!force && game.hasSeenOnboarding) return;
  onboardingStep = 0;
  var host = document.getElementById("onboarding-root");
  if (host) host.innerHTML = buildOnboardingHTML();
}

function nextOnboardingStep() {
  onboardingStep = Math.min(ONBOARDING_SLIDES.length - 1, onboardingStep + 1);
  var host = document.getElementById("onboarding-root");
  if (host) host.innerHTML = buildOnboardingHTML();
}

function skipOnboarding() {
  closeOnboarding();
}

function closeOnboarding() {
  game.hasSeenOnboarding = true;
  var host = document.getElementById("onboarding-root");
  if (host) host.innerHTML = "";
  saveGame();
}

window.openOnboarding = openOnboarding;
window.nextOnboardingStep = nextOnboardingStep;
window.skipOnboarding = skipOnboarding;
window.closeOnboarding = closeOnboarding;
window.buildOnboardingHTML = buildOnboardingHTML;
