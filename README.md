# PeerTube plugin Upload Limits

This plugin adds an instruction modal and limitations (file size, video bit rate, audio bit rate) for the file to upload. All these options are editable in plugin settings:

- **Instructions** formated in markdown
- **Maximum file size** in Mega octets / Mega bytes
- **Maximum video bit rate** in Mega bits per seconds
- **Maximum audio bit rate** in kilo bits per seconds

### Overall steps

- On client side, when limits are not fullfilled, the upload is not proceed and the user is notified with a PeerTube toast.
- On server side after uploading, when limits are not fullfilled, uploaded video / audio file is not accepted. See the server side checking as a **security validation**.

### Requirements

From Upload Limits v0.4.0, **PeerTube v2.2.0 or a newer version** is required.

### Dependencies

- Upload limits are checked both client and server side with [the JavaScript port of MediaInfo](https://mediainfo.js.org) using [WebAssembly](https://webassembly.org).

- Instructions are parsed and outputted in HTML only client side with [PeerTube markdownRender plugin helper](https://github.com/Chocobozzz/PeerTube/blob/master/support/doc/plugins/guide.md#markdown-renderer).

### Screenshots

<div style="display:flex;justify-content:space-evenly;align-items:center">
  <img style=max-width:230px src=https://raw.githubusercontent.com/kimsible/peertube-plugin-upload-limits/master/screenshots/sample-settings.png>

  <p style=max-width:280px>
    <img src=https://raw.githubusercontent.com/kimsible/peertube-plugin-upload-limits/master/screenshots/sample-alert-v2.2.png>
    <img src=https://raw.githubusercontent.com/kimsible/peertube-plugin-upload-limits/master/screenshots/sample-toast-video-bitrate.png>
    <img src=https://raw.githubusercontent.com/kimsible/peertube-plugin-upload-limits/master/screenshots/sample-toast-audio-bitrate.png>
  </p>
</div>


### Development

#### Run tests

```bash
$ npx ava -v
```

#### Dev with local PeerTube

Clone this repository :

```bash
$ git clone git@github.com:kimsible/peertube-plugin-upload-limits.git
$ cd peertube-plugin-upload-limits
$ git remote add me git@github.com:GITHUB_USER/peertube-plugin-upload-limits.git
```

In your local PeerTube :

```bash
$ nvm use 12                    # Make sure you're using Node.js 12
$ yarn install --pure-lockfile  # Install PeerTube dependencies
$ npm run dev                   # Run PeerTube dev client & server
$ npm run plugin:install -- \
  --plugin-path /path/to/repo # Install plugin from cloned repo
```

Then, in your cloned repo directory, you must create `.env` file and set :

```dosini
PEERTUBE_PATH=/path/to/local/PeerTube
```

At last, you can run :

```bash
$ nvm use 12   # Make sure you're using Node.js 12
$ npm install  # Install plugin dependencies
$ npm run dev  # Run watcher
```

Now, every **client-side plugin changes in the runtime code** will be watched and reloaded in your local PeerTube.

Note that for any **server-side plugin changes** the only way to hot-reload is to re-run in your local PeerTube from another terminal :

```bash
$ npm run plugin:install -- --plugin-path /path/to/repo
```

#### Test in a local PeerTube for production

Here is a small script to test the plugin locally in a full PeerTube docker setup ready for production :

```bash
#!/bin/sh
# sh install-peertube-plugin.sh [PLUGIN_NAME]

if [ -z $1 ]; then
  echo 'Usage: sh install-peertube-plugin.sh [PLUGIN_NAME]'
  exit 1
fi

PLUGIN_NAME=$1

# Get postgres user
POSTGRES_USER="`grep -E -o "POSTGRES_USER=(.+)" .env | sed -E "s/POSTGRES_USER=//g"`"

# Get postgres db
POSTGRES_DB="`grep -E -o "POSTGRES_DB=(.+)" .env | sed -E "s/POSTGRES_DB=//g"`"

# Install plugin
sudo docker-compose exec -u peertube -e NODE_CONFIG_DIR=/config -e NODE_ENV=production peertube npm run plugin:install -- --npm-name peertube-plugin-$PLUGIN_NAME

# Restart PeerTube
sudo docker-compose restart peertube
```
