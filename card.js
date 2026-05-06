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
        this._config = {
            ...config,
            stations: config.stations.map((s) =>
                typeof s === "string" ? { entity: s } : s),
        };
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

const EDITOR_SCHEMA = [
    { name: "title", selector: { text: {} } },
    {
        name: "extra",
        selector: {
            select: {
                mode: "dropdown",
                options: [
                    { value: "docks", label: "Docks available" },
                    { value: "capacity", label: "Capacity" },
                ],
            },
        },
    },
    {
        name: "stations",
        required: true,
        selector: {
            entity: {
                multiple: true,
                filter: { integration: "mevo" },
            },
        },
    },
];


class MevoCardEditor extends LitElement {
    static properties = {
        hass: { attribute: false },
        _config: { state: true },
    };

    setConfig(config) {
        this._config = config;
    }

    render() {
        if (!this.hass || !this._config) return nothing;
        return html`
            <ha-form
                .hass=${this.hass}
                .data=${this._asFormData()}
                .schema=${EDITOR_SCHEMA}
                .computeLabel=${MevoCardEditor._computeLabel}
                @value-changed=${this._valueChanged}
            ></ha-form>
        `;
    }

    _asFormData() {
        const stations = this._config.stations || [];
        return {
            title: this._config.title || "",
            extra: this._config.extra || "",
            stations: stations.map((s) =>
                typeof s === "string" ? s : s.entity),
        };
    }

    static _computeLabel(schema) {
        switch (schema.name) {
            case "title": return "Title";
            case "extra": return "Extra indicator";
            case "stations": return "Stations";
            default: return schema.name;
        }
    }

    _valueChanged(e) {
        const formData = e.detail.value;
        const oldStations = this._config.stations || [];
        const newStations = (formData.stations || []).map((entity) => {
            const existing = oldStations.find((s) =>
                (typeof s === "string" ? s : s.entity) === entity);
            if (existing && typeof existing === "object" && existing.name) {
                return existing;
            }
            return { entity };
        });

        const newConfig = { ...this._config, stations: newStations };
        if (formData.title) newConfig.title = formData.title;
        else delete newConfig.title;
        if (formData.extra) newConfig.extra = formData.extra;
        else delete newConfig.extra;

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

window.customCards = window.customCards || [];
window.customCards.push({
    type: "mevo-card",
    name: "Mevo Card",
    description: "Card working with Mevo Tricity bikes integration",
});
