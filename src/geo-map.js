import './leaflet-src.js';  // a (very slightly) modified version of Leaflet for use as browser module
import './proj4-src.js';        // modified version of proj4; could be stripped down for mapml
import './proj4leaflet.js'; // not modified, seems to adapt proj4 for leaflet use. 
import './mapml.js';       // refactored URI usage, replaced with URL standard
import { MapLayer } from './layer.js';       

class GeoMap extends HTMLElement {
  static get observedAttributes() {
    return ['lat', 'lon', 'zoom', 'projection', 'width', 'height', 'controls'];
  }
  // see comments below regarding attributeChangedCallback vs. getter/setter 
  // usage.  Effectively, the user of the element must use the property, not
  // the getAttribute/setAttribute/removeAttribute DOM API, because the latter
  // calls don't result in the getter/setter being called (so you have to use
  // the getter/setter directly)
  get controls() {
    return this.hasAttribute('controls');
  }
  set controls(value) {
    const hasControls = Boolean(value);
    if (hasControls)
      this.setAttribute('controls', '');
    else
      this.removeAttribute('controls');
    this._toggleControls(hasControls);
  }
  get lat() {
    return this.hasAttribute("lat") ? this.getAttribute("lat") : "0";
  }
  set lat(val) {
    if (val) {
      this.setAttribute("lat", val);
    }
  }
  get lon() {
    return this.hasAttribute("lon") ? this.getAttribute("lon") : "0";
  }
  set lon(val) {
    if (val) {
      this.setAttribute("lon", val);
    }
  }
  get projection() {
    return this.hasAttribute("projection") ? this.getAttribute("projection") : "OSMTILE";
  }
  set projection(val) {
    if (val && (val === "OSMTILE" || val === "CBMTILE" || val === "APSTILE" || val === "WGS84")) {
      this.setAttribute('projection', val);
    }
  }
  get zoom() {
    return this.hasAttribute("zoom") ? this.getAttribute("zoom") : 0;
  }
  set zoom(val) {
    if (val) {
      var parsedVal = parseInt(val,10);
      if (!isNaN(parsedVal) && (parsedVal >= 0 && parsedVal <= 25)) {
        this.setAttribute('zoom', parsedVal);
      }
    }
  }
  get layers() {
    return this.getElementsByTagName('layer-');
  }
  constructor() {
    // Always call super first in constructor
    super();
    let tmpl = document.createElement('template');
    tmpl.innerHTML = 
    `<link rel="stylesheet" href="${new URL("mapml.css", import.meta.url).href}">` +
    `<link rel="stylesheet" href="${new URL("leaflet.css", import.meta.url).href}">`;
    let shadowRoot = this.attachShadow({mode: 'open'});
    this._container = document.createElement('div');
    // you have to include this otherwise you have to use quirks mode,
    // (by omitting the doctype), which is bad.
    this._container.style.height = "100vh";
    shadowRoot.appendChild(tmpl.content.cloneNode(true));
    shadowRoot.appendChild(this._container);
    
  }
  connectedCallback() {
//    console.log('Custom map element added to page.');
    if (this.isConnected) {

      // the dimension attributes win, if they're there. A map does not
      // have an intrinsic size, unlike an image or video, and so must 
      // have a defined width and height.
      var s = window.getComputedStyle(this),
        wpx = s.width, hpx=s.height, 
        w = parseInt(wpx.replace('px','')),
        h = parseInt(hpx.replace('px',''));

      if (wpx === "" || hpx === "") {
         return;
      }

      if (!this.width || this.width !== w) {
        this._container.style.width = wpx;
        this.width = w;
      } else {
        this._container.style.width = this.width+"px";
      }

      if (!this.height || this.height !== h) {
        this._container.style.height = h;
        this.height = h;
      } else {
        this._container.style.height = this.height+"px";
      }

      // create the Leaflet map if this is the first time attached is called
      if (!this._map) {
        this._map = L.map(this._container, {
          center: new L.LatLng(this.lat, this.lon),
          projection: this.projection,
          query: true,
          mapEl: this,
          crs: M[this.projection],
          zoom: this.zoom,
          zoomControl: false,
          // because the M.MapMLLayer invokes _tileLayer._onMoveEnd when
          // the mapml response is received the screen tends to flash.  I'm sure
          // there is a better configuration than that, but at this moment
          // I'm not sure how to approach that issue.  
          // See https://github.com/Maps4HTML/MapML-Leaflet-Client/issues/24 
          fadeAnimation: true
        });

        // the attribution control is not optional
        this._attributionControl =  this._map.attributionControl.setPrefix('<a href="https://www.w3.org/community/maps4html/" title="W3C Maps4HTML Community Group">Maps4HTML</a> | <a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>');

        // optionally add controls to the map
        if (this.controls) {
          this._layerControl = M.mapMlLayerControl(null,{"collapsed": true}).addTo(this._map);
          this._zoomControl = L.control.zoom().addTo(this._map);
        }

        this._setUpEvents();
        // this.fire('load', {target: this});
      }
    }
  }
  disconnectedCallback() {
    //this._removeEvents();
    delete this._map;
  }
  adoptedCallback() {
//    console.log('Custom map element moved to new page.');
  }
  attributeChangedCallback(name, oldValue, newValue) {
//    console.log('Attribute: ' + name + ' changed from: '+ oldValue + ' to: '+newValue);
    // "Best practice": handle side-effects in this callback
    // https://developers.google.com/web/fundamentals/web-components/best-practices
    // https://developers.google.com/web/fundamentals/web-components/best-practices#avoid-reentrancy
    // note that the example is misleading, since the user can't use
    // setAttribute or removeAttribute to set the property, they need to use
    // the property directly in their API usage, which kinda sucks
    /*
  const hasValue = newValue !== null;
  switch (name) {
    case 'checked':
      // Note the attributeChangedCallback is only handling the *side effects*
      // of setting the attribute.
      this.setAttribute('aria-checked', hasValue);
      break;
    ...
  }     */
  }
  _dropHandler(event) {
    event.preventDefault();
    // create a new <layer-> child of this <map> element
    this.appendChild(new MapLayer(event.dataTransfer.getData("text"), 'Layer', true));
  }
  _dragoverHandler(event) {
    function contains(list, value) {
      for( var i = 0; i < list.length; ++i ) {
        if(list[i] === value) return true;
      }
      return false;
    }
    // check if the thing being dragged is a URL
    var isLink = contains( event.dataTransfer.types, "text/uri-list");
    if (isLink) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }
  _removeEvents() {
    if (this._map) {
      this._map.off('preclick click dblclick mousemove mouseover mouseout mousedown mouseup contextmenu', false, this);
      this._map.off('load movestart move moveend zoomstart zoom zoomend', false, this);
      this.removeEventListener("drop", this._dropHandler, false);
      this.removeEventListener("dragover", this._dragoverHandler, false);
    }
  }
  _setUpEvents() {
    this.addEventListener("drop", this._dropHandler, false);
    this.addEventListener("dragover", this._dragoverHandler, false);
    this._map.on('load',
      function () {
        this.dispatchEvent(new CustomEvent('load', {detail: {target: this}}));
      }, this);
    this._map.on('preclick', 
      function (e) {
        this.dispatchEvent(new CustomEvent('preclick', {detail: 
          {lat: e.latlng.lat,     lon: e.latlng.lng, 
             x: e.containerPoint.x, y: e.containerPoint.y}
         }));
      }, this);
    this._map.on('click', 
      function (e) {
        this.dispatchEvent(new CustomEvent('click', {detail:
          {lat: e.latlng.lat,     lon: e.latlng.lng, 
             x: e.containerPoint.x, y: e.containerPoint.y}
         }));
      }, this);
    this._map.on('dblclick', 
      function (e) {
        this.dispatchEvent(new CustomEvent('dblclick', {detail:
          {lat: e.latlng.lat,     lon: e.latlng.lng, 
             x: e.containerPoint.x, y: e.containerPoint.y}
         }));
      }, this);
    this._map.on('mousemove', 
      function (e) {
        this.dispatchEvent(new CustomEvent('mousemove', {detail:
          {lat: e.latlng.lat,     lon: e.latlng.lng, 
             x: e.containerPoint.x, y: e.containerPoint.y}
         }));
      }, this);
    this._map.on('mouseover', 
      function (e) {
        this.dispatchEvent(new CustomEvent('mouseover', {detail:
          {lat: e.latlng.lat,     lon: e.latlng.lng, 
             x: e.containerPoint.x, y: e.containerPoint.y}
         }));
      }, this);
    this._map.on('mouseout', 
      function (e) {
        this.dispatchEvent(new CustomEvent('mouseout', {detail:
          {lat: e.latlng.lat,     lon: e.latlng.lng, 
             x: e.containerPoint.x, y: e.containerPoint.y}
         }));
      }, this);
    this._map.on('mousedown', 
      function (e) {
        this.dispatchEvent(new CustomEvent('mousedown', {detail:
          {lat: e.latlng.lat,     lon: e.latlng.lng, 
             x: e.containerPoint.x, y: e.containerPoint.y}
         }));
      },this);
    this._map.on('mouseup', 
      function (e) {
        this.dispatchEvent(new CustomEvent('mouseup', {detail:
          {lat: e.latlng.lat,     lon: e.latlng.lng, 
             x: e.containerPoint.x, y: e.containerPoint.y}
         }));
      }, this);
    this._map.on('contextmenu', 
      function (e) {
        this.dispatchEvent(new CustomEvent('contextmenu', {detail:
          {lat: e.latlng.lat,     lon: e.latlng.lng, 
             x: e.containerPoint.x, y: e.containerPoint.y}
         }));
      }, this);      
    this._map.on('movestart', 
      function () {
        this._updateMapCenter();
        this.dispatchEvent(new CustomEvent('movestart', {detail: 
          {target: this}}));
      }, this);      
    this._map.on('move', 
      function () {
        this._updateMapCenter();
        this.dispatchEvent(new CustomEvent('move', {detail: 
          {target: this}}));
      }, this);      
    this._map.on('moveend', 
      function () {
        this._updateMapCenter();
        this.dispatchEvent(new CustomEvent('moveend', {detail: 
          {target: this}}));
      }, this);      
    this._map.on('zoomstart', 
      function () {
        this._updateMapCenter();
        this.dispatchEvent(new CustomEvent('zoomstart', {detail: 
          {target: this}}));
      }, this);      
    this._map.on('zoom', 
      function () {
        this._updateMapCenter();
        this.dispatchEvent(new CustomEvent('zoom', {detail: 
          {target: this}}));
      }, this);      
    this._map.on('zoomend', 
      function () {
        this._updateMapCenter();
        this.dispatchEvent(new CustomEvent('zoomend', {detail: 
          {target: this}}));
      }, this);      
  }
  _toggleControls(controls) {
    if (this._map) {
      if (controls && !this._layerControl) {
        this._zoomControl = L.control.zoom().addTo(this._map);
        this._layerControl = M.mapMlLayerControl(null,{"collapsed": true}).addTo(this._map);
        for (var i=0;i<this.layers.length;i++) {
          if (!this.layers[i].hidden) {
            this._layerControl.addOverlay(this.layers[i]._layer, this.layers[i].label);
            this._map.on('moveend', this.layers[i]._validateDisabled,  this.layers[i]);
            this.layers[i]._layerControl = this._layerControl;
          }
        }
      } else if (this._layerControl) {
        this._map.removeControl(this._layerControl);
        this._map.removeControl(this._zoomControl);
        delete this._layerControl;
        delete this._zoomControl;      }
    }
  }
  _widthChanged(width) {
    this.style.width = width+"px";
    this._container.style.width = width+"px";
    if (this._map) {
        this._map.invalidateSize(false);
    }
  }
  _heightChanged(height) {
    this.style.height = height+"px";
    this._container.style.height = height+"px";
    if (this._map) {
        this._map.invalidateSize(false);
    }
  }
  zoomTo(lat, lon, zoom) {
    zoom = zoom||this.zoom;
    var location = new L.LatLng(lat,lon);
    this._map.setView(location, zoom);
    this.zoom = zoom;
    this.lat = location.lat;
    this.lon = location.lng;
  }
  _updateMapCenter() {
    // remember to tell Leaflet event handler that 'this' in here refers to
    //  something other than the map in this case the custom polymer element
    this.lat = this._map.getCenter().lat;
    this.lon = this._map.getCenter().lng;
    this.zoom = this._map.getZoom();
  }
  _ready() {
    // when used in a custom element, the leaflet script element is hidden inside
    // the import's shadow dom.
    // this might not work and may not be necessary in standard custom elements
    L.Icon.Default.imagePath = (function () {
      var imp = document.querySelector('link[rel="import"][href*="web-map.html"]'),
        doc = imp ? imp.import : document,
        scripts = doc.getElementsByTagName('script'),
        leafletRe = /[\/^]leaflet[\-\._]?([\w\-\._]*)\.js\??/;

      var i, len, src, path;

      for (i = 0, len = scripts.length; i < len; i++) {
        src = scripts[i].src;
        if (src.match(leafletRe)) {
          path = src.split(leafletRe)[0];
          return (path ? path + '/' : '') + 'images';
        }
      }
    }());
    if (this.hasAttribute('name')) {
      var name = this.getAttribute('name');
      if (name) {
        this.poster = document.querySelector('img[usemap='+'"#'+name+'"]');
        // firefox has an issue where the attribution control's use of
        // _container.innerHTML does not work properly if the engine is throwing
        // exceptions because there are no area element children of the image map
        // for firefox only, a workaround is to actually remove the image...
        if (this.poster) {
          if (L.Browser.gecko) {
            this.poster.removeAttribute('usemap');
          }
          this._container.appendChild(this.poster);
        }
      }
    }
  }
}

// need to provide options { extends: ... }  for custom built-in elements
window.customElements.define('geo-map', GeoMap);
window.customElements.define('layer-', MapLayer);
