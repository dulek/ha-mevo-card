class MevoCard extends HTMLElement {

    config;
    content;

    setConfig(config) {
        if (!config.station) {
            throw new Error('Please define a station!');
        }
        this.config = config;
    }

    set hass(hass) {
        const entityId = this.config.station;
        const state = hass.states[entityId];
        const stateStr = state ? state.state : 'unavailable';

        // done once
        if (!this.content) {
            // user makes sense here as every login gets it's own instance
            this.innerHTML = `
                <ha-card header="Mevo station">
                    <div class="card-content"></div>
                </ha-card>
            `;
            this.content = this.querySelector('div');
        }
        // done repeatedly
        this.content.innerHTML = `
            <p>The ${entityId} is ${stateStr}.</p>
        `;
    }

    static getStubConfig() {
        return { entity: "sun.sun" }
    }
}

customElements.define('mevo-card', MevoCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "mevo-card",
    name: "Mevo Card",
    description: "Card working with Mevo Tricity bikes integreation" // optional
});