var needle = require('needle');

needle.defaults({
  open_timeout: 60000,
  // user_agent: 'nanoRSS',
  follow_max: 10,
  decode_response: true,
  compressed: true,
  rejectUnauthorized: false,
  follow_set_cookies: true
});
