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

#### Dev with local PeerTube

Clone this repository :

```bash
$ git clone git@github.com:kimsible/peertube-plugin-upload-limits.git
$ cd peertube-plugin-upload-limits
$ git remote add me git@github.com:GITHUB_USER/peertube-plugin-upload-limits.git
```

In your local PeerTube :

```bash
$ nvm use 10                    # Make sure you're using Node.js 10
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
$ nvm use 10   # Make sure you're using Node.js 10
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
