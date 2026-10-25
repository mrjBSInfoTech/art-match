// Read-only real-browser regression check against the local Vite/backend pair.
import assert from "node:assert/strict";
import { connectPaymentBrowser } from "./paymongoBrowserProbe.js";

const catalog = await fetch("http://localhost:5000/api/buyer/artworks").then(response => response.json());
const artwork = catalog.find(item => item.image);
assert.ok(artwork, "An existing artwork image is needed for the browser check");
const browser = await connectPaymentBrowser();
const { targetId } = await browser.send("Target.createTarget", { url: "http://localhost:5173" });
browser.close();
const page = await connectPaymentBrowser(9333, targetId);
const imageResponses = [];
page.on("Network.responseReceived", ({ response }) => {
  const url = new URL(response.url);
  if (url.pathname.startsWith("/api/artwork-image-url/") || url.pathname.startsWith("/uploads/seller/uploadArtwork/")) {
    imageResponses.push({ path: url.pathname, status: response.status });
  }
});
try {
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1800, deviceScaleFactor: 1, mobile: false });
  await new Promise(resolve => setTimeout(resolve, 1500));
  await page.evaluate(`(async () => {
    // A stale buyer session must not prevent seller/admin images from loading.
    localStorage.setItem('buyer_token', 'expired-image-regression-fixture');
    const React = (await import('/node_modules/.vite/deps/react.js')).default;
    const ReactDOM = await import('/node_modules/.vite/deps/react-dom_client.js');
    const createRoot = ReactDOM.createRoot || ReactDOM.default.createRoot;
    const paths = [
      '/src/components/seller/Artwork/ArtworkCard.jsx',
      '/src/components/admin/Artwork/ArtworkCard.jsx',
      '/src/components/seller/Profile/ProfileCard.jsx',
      '/src/components/seller/Storefront/StorefrontCard.jsx',
    ];
    const components = await Promise.all(paths.map(path => import(path).then(module => module.default)));
    const artwork = ${JSON.stringify(artwork)};
    const labels = ['seller-artwork', 'admin-artwork', 'seller-profile', 'seller-storefront'];
    const container = document.createElement('section');
    container.id = 'artwork-image-regression';
    Object.assign(container.style, { position: 'fixed', inset: '0', zIndex: '99999', background: '#fff', overflow: 'auto', padding: '24px' });
    document.body.append(container);
    window.artworkImageTestRoot = createRoot(container);
    window.artworkImageTestRoot.render(React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' } },
      components.map((Component, index) => React.createElement('div', { id: labels[index], key: index },
        React.createElement(Component, { artworks: [artwork], artwork, pinnedArtworkIds: [], savingPinId: null, onPinToggle() {} })))
    ));
  })()`);
  let images = [];
  for (let attempt = 0; attempt < 25; attempt++) {
    images = await page.evaluate(`['seller-artwork','admin-artwork','seller-profile','seller-storefront'].map(id => {
      const image = document.querySelector('#' + id + ' img');
      return { role: id, loaded: !!image && image.complete && image.naturalWidth > 0 && image.src.startsWith('blob:') };
    })`);
    if (images.every(image => image.loaded)) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(images.every(image => image.loaded), JSON.stringify(images));
  const previews = [];
  for (const [label, path, props] of [
    ["seller-details", "/src/components/seller/Artwork/ArtworkInfo.jsx", { open: true, selectedArtwork: { ...artwork, first_name: "Image", last_name: "Test", student_number: "TEST", course: "TEST" } }],
    ["admin-details", "/src/components/admin/Artwork/ArtworkInfo.jsx", { open: true, selectedArtwork: artwork }],
    ["seller-edit-preview", "/src/components/seller/Artwork/ArtworkForm.jsx", { open: true, selectedArtwork: artwork }],
    ["absolute-b2-url", "/src/components/common/ArtworkImage.jsx", { image: "https://example-b2.invalid/app-uploads/seller/uploadArtwork/" + encodeURIComponent(artwork.image) }],
    ["local-file-preview", "/src/components/common/ArtworkImage.jsx", { image: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>' }],
  ]) {
    await page.evaluate(`(async () => {
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const Component = (await import(${JSON.stringify(path)})).default;
      window.artworkImageTestRoot.render(React.createElement(Component, { ...${JSON.stringify(props)}, handleClose() {}, onSubmit() {}, alt: 'Artwork regression preview' }));
    })()`);
    let loaded = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      loaded = await page.evaluate(`(() => {
        const image = document.querySelector(${JSON.stringify(props.open ? ".MuiDialog-root img" : "#artwork-image-regression img")});
        return !!image && image.complete && image.naturalWidth > 0 && image.src.startsWith(${JSON.stringify(label === "local-file-preview" ? "data:image/" : "blob:")});
      })()`);
      if (loaded) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    previews.push({ role: label, loaded });
    assert.ok(loaded, label + " must display the artwork image");
  }
  assert.ok(imageResponses.some(response => response.path.startsWith("/api/artwork-image-url/") && response.status === 200));
  assert.ok(imageResponses.some(response => response.path.startsWith("/uploads/seller/uploadArtwork/") && response.status === 200));
  console.log(JSON.stringify({ checks: [...images, ...previews],
    successfulSignedImages: imageResponses.filter(response => response.path.startsWith("/uploads/seller/uploadArtwork/") && response.status === 200).length,
    staleBuyerSessionIsolated: true }, null, 2));
} finally {
  await page.evaluate("window.artworkImageTestRoot?.unmount(); document.getElementById('artwork-image-regression')?.remove(); localStorage.removeItem('buyer_token');").catch(() => {});
  await page.send("Target.closeTarget", { targetId }).catch(() => {});
  page.close();
}
