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
                        .chip-container {
                            display: flex;
                            flex-direction: row;
                            align-items: flex-start;
                            justify-content: flex-start;
                            flex-wrap: wrap;
                            margin-bottom: calc(-1 * var(--chip-spacing));
                        }
                        .chip-container.align-end {
                            justify-content: flex-end;
                        }
                        .chip-container.align-center {
                            justify-content: center;
                        }
                        .chip-container.align-justify {
                            justify-content: space-between;
                        }
                        /*.chip-container * {
                            margin-bottom: var(--chip-spacing);
                        }
                        .chip-container *:not(:last-child) {
                            margin-right: var(--chip-spacing);
                        }
                        .chip-container[rtl] *:not(:last-child) {
                            margin-right: initial;
                            margin-left: var(--chip-spacing);
                        }*/
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
                            align-items: center;
                            gap: 2px;
                            font-size: 1.1em;
                            padding-right: 10px;
                        }
                        .mevo-badge-unavail {
                            color: var(--error-color, #b71c1c);
                            font-size: 0.9em;
                        }
                    </style>
                    <div class="card-content">
                        <div class="chip-container align-justify"></div>
                    </div>
                </ha-card>
            `;
            this.content = this.querySelector('.chip-container');
        }
        // done repeatedly
        this.content.innerHTML = stations.map(station => {
            const state = hass.states[station.entity];
            if (!state) {
                return `<div class="ha-badge"><div class="mevo-badge-title">${entityId}</div><div class="mevo-badge-unavail">Unavailable</div></div>`;
            }
            const name = station.name || state.attributes.friendly_name || entityId;
            const bikes = state.attributes.bikes_available ?? '?';
            const ebikes = state.attributes.ebikes_available ?? '?';
            return `
                <ha-badge>
                    <div class="mevo-badge-title">${name}</div>
                    <div class="mevo-badge-icons">
                        <span class="mevo-badge-icon"><ha-state-icon icon="mdi:bicycle"></ha-state-icon> ${bikes}</span>
                        <span class="mevo-badge-icon"><ha-state-icon icon="mdi:bicycle-electric"></ha-state-icon> ${ebikes}</span>
                    </div>
                </ha-badge>
            `;
        }).join('');
    }

    static getStubConfig() {
        return {
            stations: [
                {
                    entity: "sensor.mevo_station_12345",
                    name: "Foobar"
                },
            ]
        };
    }
}

customElements.define('mevo-card', MevoCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "mevo-card",
    name: "Mevo Card",
    description: "Card working with Mevo Tricity bikes integration"
});
