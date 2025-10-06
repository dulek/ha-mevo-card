class MevoCard extends HTMLElement {
    config;
    content;

    setConfig(config) {
        if (!config.stations || !Array.isArray(config.stations) || config.stations.length === 0) {
            throw new Error('Please define a list of stations!');
        }
        this.config = config;
    }

    static getStubConfig() {
        return {
            stations: [
                {
                    entity: "sensor.stacja_12345",
                    name: "Foobar"
                },
            ],
            title: "Mevo Stations"
        };
    }

    set hass(hass) {
        const stations = this.config.stations;
        // done once
        if (!this.content) {
            this.innerHTML = `
                <ha-card">
                    <div class="card-content">
                        <div class="chip-container"></div>
                    </div>
                    <style>
                        .card-content {
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
                    </style>
                </ha-card>
            `;
            this.content = this.querySelector('.chip-container');
        }
        // done repeatedly
        this.content.innerHTML = stations.map(station => {
            const state = hass.states[station.entity];
            if (!state) {
                return `<div class="mevo-badge"><div class="mevo-badge-title">${station}</div><div class="mevo-badge-unavail">Unavailable</div></div>`;
            }
            const name = station.name || state.attributes.friendly_name || entityId;
            const bikes = state.attributes.bikes_available ?? '?';
            const ebikes = state.attributes.ebikes_available ?? '?';
            return `
                <div class="mevo-badge">
                    <div class="mevo-badge-title">${name}</div>
                    <div class="mevo-badge-icons">
                        <span class="mevo-badge-icon ${(bikes === 0) ? 'mevo-badge-unavail': ''}"><ha-state-icon icon="mdi:bicycle"></ha-state-icon> ${bikes}</span>
                        <span class="mevo-badge-icon ${(ebikes === 0) ? 'mevo-badge-unavail': ''}"><ha-state-icon icon="mdi:bicycle-electric"></ha-state-icon> ${ebikes}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

customElements.define('mevo-card', MevoCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "mevo-card",
    name: "Mevo Card",
    description: "Card working with Mevo Tricity bikes integration"
});
