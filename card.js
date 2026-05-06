import {
    LitElement, html, css, nothing,
} from "https://unpkg.com/lit@3.1.0/index.js?module";

const VERSION = "0.1.0";

console.info(
    `%c MEVO-CARD %c v${VERSION} `,
    "color: white; background: #00b8d4; font-weight: 700;",
    "color: #00b8d4; background: white; font-weight: 700;",
);

class MevoCard extends LitElement {
    static properties = {
        hass: { attribute: false },
        _config: { state: true },
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
    `;

    setConfig(config) {
        if (!config.stations
            || !Array.isArray(config.stations)
            || config.stations.length === 0) {
            throw new Error("Please define a list of stations!");
        }
        this._config = config;
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
        return 1 + Math.ceil(this._config.stations.length / 4);
    }

    getLayoutOptions() {
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
        if (!changedProps.has("hass")) return false;
        const oldHass = changedProps.get("hass");
        if (!oldHass || !this._config) return true;
        return this._config.stations.some((station) => (
            oldHass.states[station.entity]
                !== this.hass.states[station.entity]
        ));
    }

    render() {
        if (!this._config || !this.hass) return nothing;
        return html`
            <ha-card .header=${this._config.title || nothing}>
                <div class="chip-container">
                    ${this._config.stations.map(
                        (station) => this._renderStation(station))}
                </div>
            </ha-card>
        `;
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
        const extra = this._config.extra;
        if (extra === "docks") {
            return html`
                <span class="mevo-badge-icon">
                    <ha-state-icon icon="mdi:parking"></ha-state-icon>
                    ${state.attributes.docks_available ?? "?"}
                </span>
            `;
        }
        if (extra === "capacity") {
            return html`
                <span class="mevo-badge-icon">
                    <ha-state-icon icon="mdi:counter"></ha-state-icon>
                    ${state.attributes.capacity ?? "?"}
                </span>
            `;
        }
        return nothing;
    }
}

class MevoCardEditor extends LitElement {
    static properties = {
        hass: { attribute: false },
        _config: { state: true },
        _helpersLoaded: { state: true },
    };

    constructor() {
        super();
        this._helpersLoaded = false;
        this._loadHelpers();
    }

    async _loadHelpers() {
        if (customElements.get("ha-entity-picker")) {
            this._helpersLoaded = true;
            return;
        }
        const helpers = await window.loadCardHelpers();
        const probe = await helpers.createCardElement({
            type: "entities", entities: [],
        });
        if (probe.constructor.getConfigElement) {
            await probe.constructor.getConfigElement();
        }
        this._helpersLoaded = true;
    }

    static styles = css`
        .row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }
        .row ha-entity-picker {
            flex: 2;
        }
        .row ha-textfield {
            flex: 1;
        }
        ha-textfield {
            display: block;
            margin-bottom: 12px;
        }
        .stations-header {
            font-weight: 500;
            margin: 12px 0 8px;
        }
        .add-button {
            margin-top: 8px;
            background: transparent;
            border: 1px solid var(--primary-color, #03a9f4);
            color: var(--primary-color, #03a9f4);
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font: inherit;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.0892857143em;
            font-size: 0.875rem;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .add-button:hover {
            background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.08);
        }
    `;

    setConfig(config) {
        this._config = config;
    }

    render() {
        if (!this.hass || !this._config || !this._helpersLoaded) return nothing;
        const stations = this._config.stations || [];
        return html`
            <ha-textfield
                label="Title (optional)"
                .value=${this._config.title || ""}
                @input=${this._titleChanged}
            ></ha-textfield>
            <div class="stations-header">Stations</div>
            ${stations.map((station, index) => html`
                <div class="row">
                    <ha-entity-picker
                        .hass=${this.hass}
                        .value=${station.entity || ""}
                        .includeDomains=${["sensor"]}
                        .entityFilter=${MevoCardEditor._isMevoSensor}
                        allow-custom-entity
                        @value-changed=${(e) =>
                            this._stationChanged(index, "entity", e.detail.value)}
                    ></ha-entity-picker>
                    <ha-textfield
                        label="Name (optional)"
                        .value=${station.name || ""}
                        @input=${(e) =>
                            this._stationChanged(index, "name", e.target.value)}
                    ></ha-textfield>
                    <ha-icon-button
                        label="Remove"
                        @click=${() => this._removeStation(index)}
                    >
                        <ha-icon icon="mdi:delete"></ha-icon>
                    </ha-icon-button>
                </div>
            `)}
            <button
                class="add-button"
                type="button"
                @click=${this._addStation}
            >
                <ha-icon icon="mdi:plus"></ha-icon>
                Add station
            </button>
        `;
    }

    static _isMevoSensor(stateObj) {
        return "bikes_available" in stateObj.attributes
            || "ebikes_available" in stateObj.attributes;
    }

    _emitConfig(newConfig) {
        this._config = newConfig;
        this.dispatchEvent(new CustomEvent("config-changed", {
            detail: { config: newConfig },
            bubbles: true,
            composed: true,
        }));
    }

    _titleChanged(e) {
        const value = e.target.value;
        const newConfig = { ...this._config };
        if (value) newConfig.title = value;
        else delete newConfig.title;
        this._emitConfig(newConfig);
    }

    _stationChanged(index, key, value) {
        const stations = [...(this._config.stations || [])];
        const station = { ...stations[index] };
        if (value) station[key] = value;
        else delete station[key];
        stations[index] = station;
        this._emitConfig({ ...this._config, stations });
    }

    _addStation() {
        const stations = [
            ...(this._config.stations || []),
            { entity: "" },
        ];
        this._emitConfig({ ...this._config, stations });
    }

    _removeStation(index) {
        const stations = (this._config.stations || [])
            .filter((_, i) => i !== index);
        this._emitConfig({ ...this._config, stations });
    }
}

customElements.define("mevo-card", MevoCard);
customElements.define("mevo-card-editor", MevoCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "mevo-card",
    name: "Mevo Card",
    description: "Card working with Mevo Tricity bikes integration",
});
