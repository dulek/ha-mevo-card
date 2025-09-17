class MevoCard extends HTMLElement {
    config;
    content;

    setConfig(config) {
        if (!config.stations || !Array.isArray(config.stations) || config.stations.length === 0) {
            throw new Error('Please define a list of stations!');
        }
        this.config = config;
    }

    set hass(hass) {
        const stations = this.config.stations;
        // done once
        if (!this.content) {
            this.innerHTML = `
                <ha-card>
                    <style>
                        .mevo-badges {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 8px;
                            margin: 8px 0;
                        }
                        .mevo-badge {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            background: var(--ha-card-background, #fff);
                            border-radius: 12px;
                            box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,0.1));
                            padding: 8px 12px;
                            min-width: 90px;
                        }
                        .mevo-badge-title {
                            font-size: 0.95em;
                            font-weight: 500;
                            margin-bottom: 4px;
                            text-align: center;
                        }
                        .mevo-badge-icons {
                            display: flex;
                            gap: 8px;
                            align-items: center;
                        }
                        .mevo-badge-icon {
                            display: flex;
                            align-items: center;
                            gap: 2px;
                            font-size: 1.1em;
                        }
                        .mevo-badge-unavail {
                            color: var(--error-color, #b71c1c);
                            font-size: 0.9em;
                        }
                    </style>
                    <div class="card-content">
                        <div class="mevo-badges"></div>
                    </div>
                </ha-card>
            `;
            this.content = this.querySelector('.mevo-badges');
        }
        // done repeatedly
        this.content.innerHTML = stations.map(entityId => {
            const state = hass.states[entityId];
            if (!state) {
                return `<div class="mevo-badge"><div class="mevo-badge-title">${entityId}</div><div class="mevo-badge-unavail">Unavailable</div></div>`;
            }
            const name = state.attributes.friendly_name || entityId;
            const bikes = state.attributes.bikes_available ?? '?';
            const ebikes = state.attributes.ebikes_available ?? '?';
            return `
                <div class="mevo-badge">
                    <div class="mevo-badge-title">${name}</div>
                    <div class="mevo-badge-icons">
                        <span class="mevo-badge-icon"><ha-icon icon="mdi:bicycle"></ha-icon> ${bikes}</span>
                        <span class="mevo-badge-icon"><ha-icon icon="mdi:bicycle-electric"></ha-icon> ${ebikes}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    static getStubConfig() {
        return { stations: ["sensor.mevo_station_1", "sensor.mevo_station_2"] };
    }
}

customElements.define('mevo-card', MevoCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "mevo-card",
    name: "Mevo Card",
    description: "Card working with Mevo Tricity bikes integration"
});
