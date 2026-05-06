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
        ha-card {
            padding: 5px;
        }
        .chip-container {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: space-evenly;
            gap: 30px;
        }
        .mevo-badge {
            margin: 5px;
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
                { entity: "sensor.stacja_12345", name: "Foobar" },
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
            <ha-card>
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

        return html`
            <div class="mevo-badge">
                <div class="mevo-badge-title">${name}</div>
                <div class="mevo-badge-icons">
                    <span class="mevo-badge-icon ${
                        bikes === 0 ? "mevo-badge-unavail" : ""}">
                        <ha-state-icon icon="mdi:bicycle"></ha-state-icon>
                        ${bikes}
                    </span>
                    <span class="mevo-badge-icon ${
                        ebikes === 0 ? "mevo-badge-unavail" : ""}">
                        <ha-state-icon icon="mdi:bicycle-electric"></ha-state-icon>
                        ${ebikes}
                    </span>
                </div>
            </div>
        `;
    }
}

customElements.define("mevo-card", MevoCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "mevo-card",
    name: "Mevo Card",
    description: "Card working with Mevo Tricity bikes integration",
});
