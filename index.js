const fetch = require('node-fetch');

const {
  env: { CLOUDFLARE_API_TOKEN, CLOUDFLARE_API_KEY, CLOUDFLARE_ZONE_ID, CLOUDFLARE_EMAIL },
} = require('process');

let authMethod = 'na';
switch( true ) {
  case CLOUDFLARE_API_TOKEN && CLOUDFLARE_ZONE_ID:
    authMethod = 'TOKEN';
    break;

  case CLOUDFLARE_API_KEY && CLOUDFLARE_ZONE_ID && CLOUDFLARE_EMAIL:
    authMethod = 'KEY';
    break;
}

module.exports = {
  onPreBuild: ({ utils }) => {
    if( authMethod === 'na' ) {
      return utils.build.failBuild(
          'Could not determine auth method.  Please review the readme file and verify your environment variables'
      );
    } else {
      switch ( authMethod ) {
        case 'TOKEN':
          console.log('Using Cloudlflare API ' + authMethod +' method of authentication');
          break;

        case 'KEY':
          console.warn('Using Cloudlflare API ' + authMethod +' method of authentication.  Please review readme for instructions on updating to using recommended method of TOKEN authentication');
          break;
      }

    }
  },
  async onEnd({
    inputs,
    utils: {
      build: { failPlugin, failBuild },
    },
  }) {
    console.log('Preparing to trigger Cloudflare cache purge');
    let baseUrl = `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`;
    let headers;
    switch( authMethod ) {
      case 'TOKEN':
        headers = {
          'Authorization': 'Bearer ' + CLOUDFLARE_API_TOKEN,
          'Content-Type': 'application/json'
        };
        break;

      case 'KEY':
        headers = {
          'X-Auth-Email': CLOUDFLARE_EMAIL,
          'X-Auth-Key': CLOUDFLARE_API_KEY,
          'Content-Type': 'application/json'
        };
        break;
    }
    let body = { purge_everything: true };

    try {
      const { status, statusText } = await fetch(baseUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      });

      if (status != 200) {
        return failPlugin(
          "Cloudflare cache couldn't be purged. Status: " + status + " " + statusText
        );
      }
      console.log('Cloudflare cache purged successfully!');
    } catch (error) {
      return failBuild('Cloudflare cache purge failed', { error });
    }
  },
};
