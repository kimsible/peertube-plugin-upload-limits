# PeerTube plugin Upload Limits

This plugin adds an instructions alert above the upload form and upload limits (file size, video bit rate, audio bit rate) for a media input. All these are editable in plugin settings :

- **Instructions** formated in markdown
- **Maximum file size** in Mega octets / Mega bytes
- **Maximum video bit rate** in Mega bits per seconds
- **Maximum audio bit rate** in kilo bits per seconds

### Overall steps

- On client side, when limits are not fullfilled, the upload is not proceed and the user is notified with a PeerTube toast.
- On server side after uploading, when limits are not fullfilled, uploaded video / audio file is not accepted. See the server side checking as a **security validation**.

### URL and Torrent import

Unfortunately, no limits for import with URL or torrent for the moment.

### Dependencies

- Upload limits are checked both client and server side with [the JavaScript port of MediaInfo](https://mediainfo.js.org/) using [WebAssembly](https://webassembly.org/).

- Instructions are parsed and outputted in HTML only client side with [Marked.js](https://marked.js.org).

### Screenshots

<div style=text-align:center>
  <img src=https://raw.githubusercontent.com/kimsible/peertube-plugin-upload-limits/master/screenshots/sample-alert.png>
  <img src=https://raw.githubusercontent.com/kimsible/peertube-plugin-upload-limits/master/screenshots/sample-toast.png>
</div>

<div style=text-align:center>
  <img src=https://raw.githubusercontent.com/kimsible/peertube-plugin-upload-limits/master/screenshots/sample-spinner.png>
  <img src=https://raw.githubusercontent.com/kimsible/peertube-plugin-upload-limits/master/screenshots/sample-admin.png>
</div>

### Development

#### Run tests

```bash
$ npx ava -v
```

#### Test locally

Test locally with the official docker setup installed with [install-peertube](https://github.com/kimsible/install-peertube).


Small script to test the plugin :
```bash
#!/bin/bash

PLUGIN_NAME=peertube-plugin-upload-limits
PLUGIN_PATH=/var/peertube/docker-volume/data/plugins/$PLUGIN_NAME

# Build client
npx webpack --mode=development

# Clean existing plugin path
sudo rm -rf $PLUGIN_PATH
sudo mkdir -p $PLUGIN_PATH

# Copy new files
sudo cp -R . $PLUGIN_PATH

# Go to peertube dir
cd /var/peertube

# Get postgres user
POSTGRES_USER="`grep -E -o "POSTGRES_USER=(.+)" .env | sed -E "s/POSTGRES_USER=//g"`"

# Get postgres db
POSTGRES_DB="`grep -E -o "POSTGRES_DB=(.+)" .env | sed -E "s/POSTGRES_DB=//g"`"

# Uninstall existing plugin
docker-compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB -c "delete from plugin where name = 'upload-limits'"

# Install plugin
docker-compose exec -u peertube -e NODE_CONFIG_DIR=/config -e NODE_ENV=production peertube npm run plugin:install -- --plugin-path /data/plugins/$PLUGIN_NAME

# Restart PeerTube
systemctl restart peertube
```
