# Cœur Net

Outils de cardiologie gratuits pour les cardiologues tunisiens, pensés avec un cardiologue du CHU :
fonction diastolique (ASE 2025), compte rendu d'écho, consentement éclairé, décision partagée
(statine avec Globorisk Tunisie, TAVI), éducation du patient illustrée, scores de risque et quiz.

- Français par défaut, arabe standard (RTL) en option ; derja pour les écrans destinés au patient.
- Sans compte : les données restent dans le navigateur (export / import d'une sauvegarde).
- Fonctionne hors ligne (PWA) ; version .zip pour les PC sans Internet.

**Outil d'aide à la décision : ne remplace pas le jugement clinique.**

## Développement
```
node build.mjs           # src/ → dist/
node --test tests/*.test.mjs
```
Déployé automatiquement sur GitHub Pages à chaque push sur `main`.

## Crédits
Globorisk : Ueda P et al., Lancet Diabetes Endocrinol 2017 ; données issues du paquet R
[globorisk](https://github.com/boyercb/globorisk) (licence MIT).
