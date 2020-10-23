module.exports = function(RED) {

  const axios = require('axios')

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

  const ConfigNode = function(config) {
    RED.nodes.createNode(this, config)
    this.host = config.clientId
    this.port = config.clientSecret
    this.refreshToken = config.refreshToken

    refreshAccessToken(config)
  }
  RED.nodes.registerType('google-da-config', ConfigNode)

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