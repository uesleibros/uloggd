class TwitchAuth {
  constructor(clientId, clientSecret) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.cachedToken = null
    this.tokenExpires = 0
  }

  async getToken() {
    if (this.cachedToken && Date.now() < this.tokenExpires) {
      return this.cachedToken
    }

    const response = await fetch(
      'https://id.twitch.tv/oauth2/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials'
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Twitch Auth failed: ${response.statusText}`)
    }

    const data = await response.json()
    this.cachedToken = data.access_token
    this.tokenExpires = Date.now() + (data.expires_in - 60) * 1000

    return this.cachedToken
  }
}

class TwitchClient {
  constructor(clientId, clientSecret) {
    this.clientId = clientId
    this.auth = new TwitchAuth(clientId, clientSecret)
    this.baseURL = 'https://api.twitch.tv/helix'
  }

  async request(endpoint, params = {}) {
    const token = await this.auth.getToken()
    const url = new URL(`${this.baseURL}/${endpoint}`)
    
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v))
      } else {
        url.searchParams.set(key, value)
      }
    })

    const response = await fetch(url, {
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`Twitch API error: ${response.statusText}`)
    }

    return response.json()
  }

  async getStream(username) {
    const data = await this.request('streams', { user_login: username })
    return data.data[0] || null
  }

  async getStreams(usernames) {
    const data = await this.request('streams', { user_login: usernames })
    return data.data
  }

  async getTopStreams(limit = 20, language = null) {
    const params = { first: limit }
    if (language) params.language = language
    
    const data = await this.request('streams', params)
    return data.data
  }

  async getUser(username) {
    const data = await this.request('users', { login: username })
    return data.data[0] || null
  }

  async getUsers(usernames) {
    const data = await this.request('users', { login: usernames })
    return data.data
  }

  async getGame(gameId) {
    const data = await this.request('games', { id: gameId })
    return data.data[0] || null
  }
}

const twitchClient = new TwitchClient(
  process.env.TWITCH_CLIENT_ID,
  process.env.TWITCH_CLIENT_SECRET
)

export default twitchClient
export { TwitchAuth, TwitchClient }
