/* Referencni vrstva CSU HUZ 2025. Ceny, provoz a dostupnost nejsou overeny. */
(function () {
  "use strict";
  window.createCsuHuzLayer = function (map, onStatus) {
    const layer = L.layerGroup();
    let pending = null, loaded = false;
    const path = "./csu_huz_2025-06-01.geojson?v=20261120-csu1";
    const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
    const status = (msg, isError) => {
      if (typeof onStatus === "function") onStatus(msg, !!isError);
    };
    function popup(props) {
      const p = props || {};
      let s = "<b>" + esc(p.name) + "</b> <small>ČSÚ HUZ 2025</small>";
      s += "<br>ID ČSÚ: " + esc(p.id);
      s += "<br>Adresa: " + esc(p.adresa);
      s += "<br>Obec: " + esc(p.obec);
      s += "<br>Kategorie: " + esc(p.kategorie);
      if (p.kapacita) s += "<br>Kapacita (interval lůžek, ČSÚ): " + esc(p.kapacita);
      s += "<br>Automatické třídění: " + (p.typ === "N" ? "předběžně nový" : "možná shoda / duplicita");
      if (p.shoda_master) s += "<br>Navržená vazba: " + esc(p.shoda_master) + " (NEOVĚŘENA)";
      return s + "<br><small>Datový stav 1. 6. 2025; bod adresy. Neprokazuje aktuální provoz, cenu, dostupnost ani zahrnutí do MASTER.</small>";
    }
    async function load() {
      if (loaded) return;
      if (pending) return pending;
      pending = (async () => {
        status("Načítám 3 497 referenčních bodů ČSÚ HUZ…", false);
        const response = await fetch(path, {cache: "no-store"});
        if (!response.ok) throw new Error("GeoJSON ČSÚ HTTP " + response.status);
        const data = await response.json();
        if (data.type !== "FeatureCollection" || data.features?.length !== 3497 || data.metadata?.point_count !== 3497)
          throw new Error("Nekompletní nebo nesprávný soubor ČSÚ HUZ");
        const renderer = L.canvas({padding: 0.4});
        for (let i = 0; i < data.features.length; i++) {
          const f = data.features[i], xy = f.geometry?.coordinates, p = f.properties || {};
          if (f.geometry?.type !== "Point" || !Array.isArray(xy) ||
              !Number.isFinite(xy[0]) || !Number.isFinite(xy[1]))
            throw new Error("Neplatná poloha ČSÚ na indexu " + i);
          const circle = L.circleMarker([xy[1], xy[0]], {
            radius: 4, color: "#087d7a", fillColor: "#36c9bb",
            weight: 1, fillOpacity: 0.74, renderer
          });
          circle.bindPopup(popup(p));
          circle.addTo(layer);
          if (i % 250 === 249) await new Promise(resolve => setTimeout(resolve, 0));
        }
        loaded = true;
        status("ČSÚ HUZ: načteno 3 497 referenčních bodů (stav 1. 6. 2025). Vrstva nemění pokrytí MASTER.", false);
      })().catch(error => {
        layer.clearLayers();
        if (map.hasLayer(layer)) map.removeLayer(layer);
        status("Chyba vrstvy ČSÚ HUZ: " + error.message, true);
      }).finally(() => {pending = null;});
      return pending;
    }
    map.on("overlayadd", event => {if (event.layer === layer) void load();});
    return {layer, load, get loaded() {return loaded;}};
  };
})();
