const PROXY_CONFIG = [
  {
      context: [
        '/oauth', '/user', '/feeditem', '/pagemonitor'
      ],
      target: 'http://localhost:3000',
      secure: false
  }
]

module.exports = PROXY_CONFIG;