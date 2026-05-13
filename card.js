import {
    LitElement, html, css, nothing,
} from "https://unpkg.com/lit@3.1.0/index.js?module";

const VERSION = "0.1.0";

console.info(
    `%c MEVO-CARD %c v${VERSION} `,
    "color: white; background: #00b8d4; font-weight: 700;",
    "color: #00b8d4; background: white; font-weight: 700;",
);

let _leafletPromise = null;
function loadLeaflet() {
    if (!_leafletPromise) {
        _leafletPromise = import(
            "https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js"
        ).then((mod) => mod.default || mod);
    }
    return _leafletPromise;
}

let _haMapPromise = null;
function ensureHaMap() {
    if (customElements.get("ha-map")) return Promise.resolve();
    if (_haMapPromise) return _haMapPromise;
    _haMapPromise = (async () => {
        const helpers = await window.loadCardHelpers();
        await helpers.createCardElement({ type: "map", entities: [] });
    })();
    return _haMapPromise;
}

class MevoCard extends LitElement {
    static properties = {
        hass: { attribute: false },
        _config: { state: true },
        _mapLayers: { state: true },
    };

    static styles = css`
        .chip-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-evenly;
            gap: 30px;
            padding: 16px;
        }
        .mevo-badge-title {
            font-size: 1.1em;
            font-weight: 500;
            margin-bottom: 4px;
            text-align: center;
        }
        .mevo-badge-icons {
            display: flex;
            gap: 20px;
            align-items: center;
        }
        .mevo-badge-icon {
            align-items: center;
            gap: 5px;
            font-size: 1.1em;
            display: flex;
            line-height: 100%;
        }
        .mevo-badge-unavail {
            color: var(--error-color, #b71c1c);
        }
        .mevo-badge-low {
            color: var(--warning-color, #ff9800);
        }
        .mevo-badge-link {
            color: inherit;
            text-decoration: none;
            cursor: pointer;
        }
        ha-map {
            display: block;
            height: var(--mevo-map-height, 350px);
            border-radius: 0 0 var(--ha-card-border-radius, 12px)
                var(--ha-card-border-radius, 12px);
            overflow: hidden;
        }
    `;

    setConfig(config) {
        if (!config.stations
            || !Array.isArray(config.stations)
            || config.stations.length === 0) {
            throw new Error("Please define a list of stations!");
        }
        let extra = config.extra ?? [];
        if (typeof extra === "string") extra = [extra];
        const view = config.view === "map" ? "map" : "list";
        this._config = {
            ...config,
            view,
            extra,
            stations: config.stations.map((s) =>
                typeof s === "string" ? { entity: s } : s),
        };
        this._fitDone = false;
    }

    static getStubConfig() {
        return {
            stations: [
                { entity: "sensor.station_gda001" },
                { entity: "sensor.station_gda002" },
            ],
            title: "Mevo Stations",
        };
    }

    getCardSize() {
        if (!this._config) return 1;
        if (this._config.view === "map") return 5;
        return 1 + Math.ceil(this._config.stations.length / 4);
    }

    getLayoutOptions() {
        if (this._config?.view === "map") {
            return {
                grid_columns: 4,
                grid_rows: 5,
                grid_min_columns: 2,
                grid_min_rows: 3,
            };
        }
        return {
            grid_columns: 4,
            grid_rows: "auto",
            grid_min_columns: 2,
            grid_min_rows: 1,
        };
    }

    static getConfigElement() {
        return document.createElement("mevo-card-editor");
    }

    shouldUpdate(changedProps) {
        if (changedProps.has("_config")) return true;
        if (changedProps.has("_mapLayers")) return true;
        if (!changedProps.has("hass")) return false;
        const oldHass = changedProps.get("hass");
        if (!oldHass || !this._config) return true;
        return this._config.stations.some((station) => (
            oldHass.states[station.entity]
                !== this.hass.states[station.entity]
        ));
    }

    updated(changedProps) {
        super.updated(changedProps);
        if (this._config?.view !== "map") return;
        this._refreshMarkers();
    }

    render() {
        if (!this._config || !this.hass) return nothing;
        const body = this._config.view === "map"
            ? this._renderMap()
            : html`
                <div class="chip-container">
                    ${this._config.stations.map(
                        (station) => this._renderStation(station))}
                </div>
            `;
        return html`
            <ha-card .header=${this._config.title || nothing}>
                ${body}
            </ha-card>
        `;
    }

    _renderMap() {
        return html`
            <ha-map
                .hass=${this.hass}
                .entities=${[]}
                .layers=${this._mapLayers || []}
                .zoom=${this._config.zoom ?? 13}
            ></ha-map>
        `;
    }

    async _refreshMarkers() {
        const token = ++this._markerToken;
        const [L] = await Promise.all([loadLeaflet(), ensureHaMap()]);
        if (token !== this._markerToken) return;
        if (!this.hass || !this._config) return;

        this._L = L;
        const markers = [];
        const latlngs = [];
        for (const station of this._config.stations) {
            const state = this.hass.states[station.entity];
            if (!state) continue;
            const lat = state.attributes.latitude;
            const lng = state.attributes.longitude;
            if (typeof lat !== "number" || typeof lng !== "number") continue;

            const name = station.name
                || state.attributes.friendly_name
                || station.entity;
            const bikes = state.attributes.bikes_available ?? "?";
            const ebikes = state.attributes.ebikes_available ?? "?";
            const rentalUri = state.attributes.rental_uri;
            const attrs = [
                `bikes="${bikes}"`,
                `ebikes="${ebikes}"`,
            ].join(" ");
            const icon = L.divIcon({
                html: `<mevo-map-marker ${attrs}></mevo-map-marker>`,
                className: "mevo-map-marker-wrapper",
                iconSize: null,
            });
            const marker = L.marker([lat, lng], { icon, title: name });
            marker.bindTooltip(name, {
                direction: "top",
                offset: [0, -8],
                opacity: 0.95,
            });
            if (rentalUri) {
                marker.on("click", () => {
                    window.open(rentalUri, "_blank", "noopener");
                });
            }
            markers.push(marker);
            latlngs.push([lat, lng]);
        }

        if (!this._layersEqual(this._mapLayers, markers)) {
            this._mapLayers = markers;
        }
        if (!this._fitDone && latlngs.length > 0) {
            this._pendingFit = latlngs;
            // Defer the fitBounds until ha-map has consumed the new layers.
            await this.updateComplete;
            this._fitBounds();
        }
    }

    _layersEqual(a, b) {
        if (!a || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i += 1) {
            const al = a[i].getLatLng();
            const bl = b[i].getLatLng();
            if (al.lat !== bl.lat || al.lng !== bl.lng) return false;
            const ah = a[i].options.icon?.options.html;
            const bh = b[i].options.icon?.options.html;
            if (ah !== bh) return false;
        }
        return true;
    }

    async _fitBounds() {
        if (!this._pendingFit || this._pendingFit.length === 0) return;
        const haMap = this.renderRoot.querySelector("ha-map");
        if (!haMap || !this._L) return;
        if (haMap.updateComplete) await haMap.updateComplete;
        // ha-map sets up Leaflet asynchronously in firstUpdated;
        // poll briefly for leafletMap to appear.
        for (let i = 0; i < 30 && !haMap.leafletMap; i += 1) {
            await new Promise((r) => setTimeout(r, 50));
        }
        if (!haMap.leafletMap) return;
        const bounds = this._L.latLngBounds(this._pendingFit);
        haMap.leafletMap.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 });
        this._pendingFit = null;
        this._fitDone = true;
    }

    constructor() {
        super();
        this._markerToken = 0;
    }

    _renderStation(station) {
        const state = this.hass.states[station.entity];
        const title = station.name || station.entity;

        if (!state) {
            return html`
                <div class="mevo-badge">
                    <div class="mevo-badge-title">${title}</div>
                    <div class="mevo-badge-unavail">Unavailable</div>
                </div>
            `;
        }

        const name = station.name
            || state.attributes.friendly_name
            || station.entity;
        const bikes = state.attributes.bikes_available ?? "?";
        const ebikes = state.attributes.ebikes_available ?? "?";
        const rentalUri = state.attributes.rental_uri;

        const body = html`
            <div class="mevo-badge-title">${name}</div>
            <div class="mevo-badge-icons">
                <span class="mevo-badge-icon ${MevoCard._tierClass(bikes)}">
                    <ha-state-icon icon="mdi:bicycle"></ha-state-icon>
                    ${bikes}
                </span>
                <span class="mevo-badge-icon ${MevoCard._tierClass(ebikes)}">
                    <ha-state-icon icon="mdi:bicycle-electric"></ha-state-icon>
                    ${ebikes}
                </span>
                ${this._renderExtra(state)}
            </div>
        `;

        if (rentalUri) {
            return html`
                <a class="mevo-badge mevo-badge-link" href=${rentalUri}>
                    ${body}
                </a>
            `;
        }
        return html`<div class="mevo-badge">${body}</div>`;
    }

    static _tierClass(count) {
        if (count === 0) return "mevo-badge-unavail";
        if (typeof count === "number" && count <= 2) return "mevo-badge-low";
        return "";
    }

    _renderExtra(state) {
        const extra = this._config.extra || [];
        return extra.map((kind) => {
            if (kind === "docks") {
                return html`
                    <span class="mevo-badge-icon">
                        <ha-state-icon icon="mdi:parking"></ha-state-icon>
                        ${state.attributes.docks_available ?? "?"}
                    </span>
                `;
            }
            if (kind === "capacity") {
                return html`
                    <span class="mevo-badge-icon">
                        <ha-state-icon icon="mdi:counter"></ha-state-icon>
                        ${state.attributes.capacity ?? "?"}
                    </span>
                `;
            }
            return nothing;
        });
    }
}

class MevoMapMarker extends LitElement {
    static properties = {
        bikes: {},
        ebikes: {},
    };

    static styles = css`
        :host {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: var(--card-background-color, white);
            color: var(--primary-text-color, #212121);
            border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
            border-radius: 14px;
            padding: 3px 8px;
            font-size: 13px;
            font-weight: 500;
            line-height: 1;
            white-space: nowrap;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
            transform: translate(-50%, -100%);
            margin-top: -4px;
        }
        .count {
            display: inline-flex;
            align-items: center;
            gap: 3px;
        }
        .unavail {
            color: var(--error-color, #b71c1c);
        }
        .low {
            color: var(--warning-color, #ff9800);
        }
        ha-icon {
            --mdc-icon-size: 16px;
        }
    `;

    render() {
        return html`
            <span class="count ${MevoMapMarker._tier(this.bikes)}">
                <ha-icon icon="mdi:bicycle"></ha-icon>${this.bikes}
            </span>
            <span class="count ${MevoMapMarker._tier(this.ebikes)}">
                <ha-icon icon="mdi:bicycle-electric"></ha-icon>${this.ebikes}
            </span>
        `;
    }

    static _tier(value) {
        const n = Number(value);
        if (n === 0) return "unavail";
        if (Number.isFinite(n) && n <= 2) return "low";
        return "";
    }
}

const BASE_SCHEMA = [
    { name: "title", selector: { text: {} } },
    {
        name: "view",
        selector: {
            select: {
                mode: "dropdown",
                options: [
                    { value: "list", label: "List" },
                    { value: "map", label: "Map" },
                ],
            },
        },
    },
    {
        name: "extra",
        selector: {
            select: {
                multiple: true,
                options: [
                    { value: "docks", label: "Docks available" },
                    { value: "capacity", label: "Capacity" },
                ],
            },
        },
    },
];

const STATION_DETAIL_SCHEMA = [
    { name: "name", selector: { text: {} } },
];

const ADD_STATION_SELECTOR = (excluded) => ({
    entity: {
        filter: { integration: "mevo" },
        exclude_entities: excluded,
    },
});

const MDI_DRAG = "M7,19V17H9V19H7M11,19V17H13V19H11M15,19V17H17V19H15M7,15V13H9V15H7M11,15V13H13V15H11M15,15V13H17V15H15M7,11V9H9V11H7M11,11V9H13V11H11M15,11V9H17V11H15M7,7V5H9V7H7M11,7V5H13V7H11M15,7V5H17V7H15Z";
const MDI_PENCIL = "M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z";
const MDI_DELETE = "M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z";
const MDI_ARROW_LEFT = "M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z";


class MevoCardEditor extends LitElement {
    static properties = {
        hass: { attribute: false },
        _config: { state: true },
        _editIndex: { state: true },
        _pickerReady: { state: true },
    };

    static styles = css`
        .stations-header {
            display: block;
            font-weight: 500;
            margin: 16px 0 8px;
        }
        .row {
            display: flex;
            align-items: center;
            padding: 4px 0;
        }
        .row + .row {
            border-top: 1px solid var(--divider-color);
        }
        .handle {
            cursor: move;
            padding-right: 8px;
            color: var(--secondary-text-color);
        }
        .info {
            flex: 1;
            min-width: 0;
            margin: 0 8px;
            overflow: hidden;
        }
        .info .primary {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .info .secondary {
            font-size: 0.85em;
            color: var(--secondary-text-color);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .add {
            margin-top: 8px;
        }
        .sub-header {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .sub-header .title {
            font-weight: 500;
            margin-left: 4px;
        }
    `;

    setConfig(config) {
        this._config = config;
    }

    connectedCallback() {
        super.connectedCallback();
        this._loadPicker();
    }

    async _loadPicker() {
        if (customElements.get("ha-entity-picker")) {
            this._pickerReady = true;
            return;
        }
        if (window.loadCardHelpers) {
            const helpers = await window.loadCardHelpers();
            const card = await helpers.createCardElement({
                type: "entities",
                entities: [],
            });
            try {
                await card.constructor.getConfigElement?.();
            } catch (e) { /* ignore */ }
        }
        this._pickerReady = customElements.get("ha-entity-picker") !== undefined;
    }

    render() {
        if (!this.hass || !this._config) return nothing;
        if (this._editIndex !== undefined) return this._renderSubEditor();
        return this._renderMain();
    }

    _renderMain() {
        const stations = this._stations();
        return html`
            <ha-form
                .hass=${this.hass}
                .data=${{
                    title: this._config.title || "",
                    view: this._config.view || "list",
                    extra: this._asExtraArray(),
                }}
                .schema=${BASE_SCHEMA}
                .computeLabel=${MevoCardEditor._computeLabel}
                @value-changed=${this._baseChanged}
            ></ha-form>
            <span class="stations-header">Stations</span>
            <ha-sortable
                handle-selector=".handle"
                @item-moved=${this._stationMoved}
            >
                <div>
                    ${stations.map((station, idx) =>
                        this._renderRow(station, idx))}
                </div>
            </ha-sortable>
            ${this._pickerReady ? html`
                <ha-entity-picker
                    class="add"
                    .hass=${this.hass}
                    .label=${"Add station"}
                    .value=${""}
                    .entityFilter=${this._addFilter()}
                    @value-changed=${this._addStation}
                ></ha-entity-picker>
            ` : nothing}
        `;
    }

    _renderRow(station, idx) {
        const state = this.hass.states[station.entity];
        const primary = station.name
            || state?.attributes?.friendly_name
            || station.entity;
        const secondary = station.name
            ? `${state?.attributes?.friendly_name || station.entity}`
            : station.entity;
        return html`
            <div class="row">
                <ha-svg-icon class="handle" .path=${MDI_DRAG}></ha-svg-icon>
                <div class="info">
                    <div class="primary">${primary}</div>
                    <div class="secondary">${secondary}</div>
                </div>
                <ha-icon-button
                    .label=${"Edit"}
                    .path=${MDI_PENCIL}
                    @click=${() => this._editStation(idx)}
                ></ha-icon-button>
                <ha-icon-button
                    .label=${"Remove"}
                    .path=${MDI_DELETE}
                    @click=${() => this._removeStation(idx)}
                ></ha-icon-button>
            </div>
        `;
    }

    _renderSubEditor() {
        const stations = this._stations();
        const station = stations[this._editIndex];
        if (!station) {
            this._editIndex = undefined;
            return nothing;
        }
        const state = this.hass.states[station.entity];
        const fallback = state?.attributes?.friendly_name || station.entity;
        return html`
            <div class="sub-header">
                <ha-icon-button
                    .label=${"Back"}
                    .path=${MDI_ARROW_LEFT}
                    @click=${this._exitSubEditor}
                ></ha-icon-button>
                <span class="title">${fallback}</span>
            </div>
            <ha-form
                .hass=${this.hass}
                .data=${{ name: station.name || "" }}
                .schema=${STATION_DETAIL_SCHEMA}
                .computeLabel=${() => "Custom name"}
                @value-changed=${this._stationDetailChanged}
            ></ha-form>
        `;
    }

    _stations() {
        return (this._config.stations || []).map((s) =>
            typeof s === "string" ? { entity: s } : s);
    }

    _asExtraArray() {
        let extra = this._config.extra ?? [];
        if (typeof extra === "string") extra = [extra];
        return extra;
    }

    _addFilter() {
        const used = new Set(this._stations().map((s) => s.entity));
        return (stateObj) => {
            if (used.has(stateObj.entity_id)) return false;
            const reg = this.hass.entities?.[stateObj.entity_id];
            return reg?.platform === "mevo";
        };
    }

    static _computeLabel(schema) {
        switch (schema.name) {
            case "title": return "Title";
            case "view": return "View";
            case "extra": return "Extra indicators";
            default: return schema.name;
        }
    }

    _baseChanged(e) {
        const formData = e.detail.value;
        const newConfig = { ...this._config };
        if (formData.title) newConfig.title = formData.title;
        else delete newConfig.title;
        if (formData.view && formData.view !== "list") {
            newConfig.view = formData.view;
        } else {
            delete newConfig.view;
        }
        if (formData.extra && formData.extra.length > 0) {
            newConfig.extra = formData.extra;
        } else {
            delete newConfig.extra;
        }
        this._fireChange(newConfig);
    }

    _stationMoved(e) {
        const { oldIndex, newIndex } = e.detail;
        const stations = this._stations();
        const [moved] = stations.splice(oldIndex, 1);
        stations.splice(newIndex, 0, moved);
        this._fireChange({ ...this._config, stations });
    }

    _addStation(e) {
        e.stopPropagation();
        const entity = e.detail.value;
        if (!entity) return;
        const stations = [...this._stations(), { entity }];
        e.target.value = "";
        this._fireChange({ ...this._config, stations });
    }

    _removeStation(idx) {
        const stations = this._stations();
        stations.splice(idx, 1);
        this._fireChange({ ...this._config, stations });
    }

    _editStation(idx) {
        this._editIndex = idx;
    }

    _exitSubEditor() {
        this._editIndex = undefined;
    }

    _stationDetailChanged(e) {
        const formData = e.detail.value;
        const stations = this._stations();
        const station = { ...stations[this._editIndex] };
        if (formData.name) station.name = formData.name;
        else delete station.name;
        stations[this._editIndex] = station;
        this._fireChange({ ...this._config, stations });
    }

    _fireChange(newConfig) {
        this._config = newConfig;
        this.dispatchEvent(new CustomEvent("config-changed", {
            detail: { config: newConfig },
            bubbles: true,
            composed: true,
        }));
    }
}

customElements.define("mevo-card", MevoCard);
customElements.define("mevo-card-editor", MevoCardEditor);
customElements.define("mevo-map-marker", MevoMapMarker);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "mevo-card",
    name: "Mevo Card",
    description: "Card working with Mevo Tricity bikes integration",
});
