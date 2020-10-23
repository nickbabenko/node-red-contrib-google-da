module.exports = function(RED) {

  const axios = require('axios')
  const { google } = require('googleapis')
  const crypto = require("crypto")
  const url = require('url')

  const TOKEN_REFRESH_INTERVAL = 3540

  let accessToken = null

  const request = async (path, method, data = {}) => {
    if (!accessToken) {
      throw Error('Unable to make request, no access token available')
    }
    return axios({
      url: `https://smartdevicemanagement.googleapis.com/v1/${path}`,
      method,
      data,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
    })
  }

  const refreshAccessToken = async config => {
    try {
      const response = await axios({
        url: 'https://www.googleapis.com/oauth2/v4/token',
        method: 'POST',
        data: {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: config.refreshToken,
          grant_type: 'refresh_token',
        },
      })
      accessToken = response.access_token
    } catch (e) {
      console.error(`Failed to renew access token with error ${e.message}`)
    }
    setTimeout(() => refreshAccessToken(config), TOKEN_REFRESH_INTERVAL)
  }

  RED.httpAdmin.get('/google-da-credentials/auth', function(req, res){
    console.log('google-credentials/auth');
    if (!req.query.projectId
      || !req.query.clientId
      || !req.query.clientSecret
      || !req.query.id
      || !req.query.callback) {
        res.send(400);
        return;
    }
    const nodeId = req.query.id
    const callback = req.query.callback
    const credentials = {
      projectId: req.query.projectId,
      clientId: req.query.clientId,
      clientSecret: req.query.clientSecret,
    };

    const csrfToken = crypto.randomBytes(18).toString('base64').replace(/\//g, '-').replace(/\+/g, '_')
    credentials.csrfToken = csrfToken
    credentials.callback = callback
    res.cookie('csrf', csrfToken)
    res.redirect(url.format({
      protocol: 'https',
      hostname: 'nestservices.google.com',
      pathname: `partnerconnections/${credentials.projectId}/auth`,
      query: {
        access_type: 'offline',
        prompt: 'consent',
        scope: 'https://www.googleapis.com/auth/sdm.service',
        response_type: 'code',
        client_id: credentials.clientId,
        redirect_uri: callback,
        state: `${nodeId}:${csrfToken}`,
      }
    }))
    RED.nodes.addCredentials(nodeId, credentials)
  });

  RED.httpAdmin.get('/google-credentials/auth/callback', function(req, res) {
    console.log('google-credentials/auth/callback')
    if (req.query.error) {
        return res.send('google.error.error', {
          error: req.query.error,
          description: req.query.error_description
        })
    }
    var [ nodeId, csrfToken ] = req.query.state.split(':')
    var credentials = RED.nodes.getCredentials(nodeId)
    if (!credentials || !credentials.clientId || !credentials.clientSecret) {
      console.log('credentials not present?')
      return res.send("google.error.no-credentials")
    }
    if (csrfToken !== credentials.csrfToken) {
      return res.status(401).send("google.error.token-mismatch")
    }

    const oauth2Client = new google.auth.OAuth2(
        credentials.clientId,
        credentials.clientSecret,
        credentials.callback
    );

    oauth2Client.getToken(req.query.code)
      .then((value) => {
          credentials.accessToken = value.tokens.access_token
          credentials.refreshToken = value.tokens.refresh_token
          credentials.expireTime = value.tokens.expires_in
          credentials.tokenType = value.tokens.token_type
          credentials.displayName = value.tokens.scope.substr(0, 40)

          delete credentials.csrfToken;
          delete credentials.callback;
          RED.nodes.addCredentials(node_id, credentials)
          res.send('Authorized')
      })
      .catch((error) => {
          return res.send('Could not receive tokens')
      })
  })

  const ConfigNode = function(config) {
    RED.nodes.createNode(this, config)
    this.host = config.clientId
    this.port = config.clientSecret
    this.refreshToken = config.refreshToken

    refreshAccessToken(config)
  }
  RED.nodes.registerType('google-da-config', ConfigNode, {
    credentials: {
      displayName: { type: 'text' },
      clientId: { type: 'text' },
      clientSecret: { type:'password' },
      accessToken: { type:'password' },
      refreshToken: { type:'password' },
      expireTime: { type:'password' },
    }
  })

  const GetStructuresNode = function(config) {
    RED.nodes.createNode(this, config)
    this.on('input', async (_, send, done) => {
      const path = `enterprises/${config.projectId}/structures${config.structureId ? `/${config.structureId}` : ''}`
      const payload = await request(path, 'GET')
      send({
        msg: {
          payload,
        },
      })
      done()
    })
  }
  RED.nodes.registerType('google-da-get-structures', GetStructuresNode)

  const GetRoomsNode = function(config) {
    RED.nodes.createNode(this, config)
    this.on('input', async (_, send, done) => {
      const path = `enterprises/${config.projectId}/structures${config.structureId}/rooms/${config.roomId ? `/${config.roomId}` : ''}`
      const payload = await request(path, 'GET')
      send({
        msg: {
          payload,
        },
      })
      done()
    })
  }
  RED.nodes.registerType('google-da-get-rooms', GetRoomsNode)

  const GetDevicesNode = function(config) {
    RED.nodes.createNode(this, config)
    this.on('input', async (_, send, done) => {
      const path = `enterprises/${config.projectId}/devices${config.deviceId ? `/${config.deviceId}` : ''}`
      const payload = await request(path, 'GET')
      send({
        msg: {
          payload,
        },
      })
      done()
    })
  }
  RED.nodes.registerType('google-da-get-devices', GetDevicesNode)

}