let appPromise;

module.exports = async function handler(req, res) {
  if (!appPromise) {
    appPromise = import("../artifacts/api-server/dist/app.mjs").then((mod) => mod.default);
  }

  const app = await appPromise;
  return app(req, res);
};
