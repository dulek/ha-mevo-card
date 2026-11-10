# Mevo Card (legacy standalone version)

Starting with [ha-mevo](https://github.com/dulek/ha-mevo) v0.9.3, this card is
bundled with the integration. Install `ha-mevo` for new setups. This repository
is kept for existing users of the standalone card.

To migrate, remove this card from the Marketplace or HACS before updating
`ha-mevo`. Remove any manually configured `/local/mevo-card/card.js` or
`/hacsfiles/ha-mevo-card/card.js` resource, then restart Home Assistant. Your
existing `type: custom:mevo-card` dashboard configuration can stay as it is.

Lovelace card for the [ha-mevo](https://github.com/dulek/ha-mevo)
integration. Displays a compact row of badges with available bikes and
e-bikes for each Mevo station you monitor.

![Mevo Card screenshot](screenshot-list.png)

![Mevo Card screenshot with map](screenshot-map.png)

## Configuration

Add the card from the dashboard editor (search for *Mevo Card*) or
paste this into your dashboard YAML:

```yaml
type: custom:mevo-card
title: Mevo Stations
stations:
  - sensor.station_gda001
  - entity: sensor.station_gda002
    name: Plac Solidarności
```

Switch to map view by adding `view: map`:

```yaml
type: custom:mevo-card
title: Mevo Stations
view: map
stations:
  - sensor.station_gda001
  - sensor.station_gda002
```

### Options

| Option     | Type   | Default | Description                                             |
| ---------- | ------ | ------- | ------------------------------------------------------- |
| `title`    | string | _none_  | Header rendered at the top of the card.                 |
| `view`     | string | `list`  | `list` for chip badges, `map` for a Leaflet map.        |
| `stations` | list   | _req._  | Stations to display.                                    |
| `extra`    | list   | _none_  | Extra indicators per badge: any of `docks`, `capacity` (list view only). |
| `home`     | string | _none_  | Optional entity ID (zone, person, or device_tracker) shown as a home marker on the map and included in auto-fit / fixed-zoom centering. |
| `zoom`     | number | _none_  | Exact zoom level (map view only). When set, disables auto-fit and centers on the stations' (and home, if set) midpoint at this zoom. Omit for auto-fit. |

Each entry under `stations` is either an entity ID string, or an
object with these fields:

| Option   | Type   | Default                                | Description                          |
| -------- | ------ | -------------------------------------- | ------------------------------------ |
| `entity` | string | _req._                                 | The Mevo sensor entity ID.           |
| `name`   | string | sensor's friendly name → entity ID     | Override the badge title.            |

The card reads `bikes_available` and `ebikes_available` from each
sensor's attributes. Counts of `0` are highlighted in the theme's
error color. Map view additionally requires `latitude` and
`longitude` attributes on each sensor, which the
[ha-mevo](https://github.com/dulek/ha-mevo) integration provides.

## Compatibility

Requires the [ha-mevo](https://github.com/dulek/ha-mevo) integration
(or any sensor exposing `bikes_available` / `ebikes_available`
attributes).

## Support

For issues or feature requests, open an issue on GitHub.
