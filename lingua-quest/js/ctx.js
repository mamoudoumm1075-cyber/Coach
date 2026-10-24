/* Contexte partagé entre les modules d’interface (rempli par app.js au démarrage). */
export const ctx = {
  S: null,
  save() {},
  go() {},
  refresh() {},
  afterRun() {}
};
