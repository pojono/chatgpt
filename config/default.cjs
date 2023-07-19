module.export = {
  "debug": 1, // debug level: 0 - no debug, 1 - debug, 2 - verbose debug
  "bot": {
    "token": process.env['TELEGRAM_BOT_TOKEN'],
    "groupIds": [], // allowed group ids, leave empty to allow all
    "userIds": [], // allowed user ids, leave empty to allow all
    "chatCmd": "/chat",
    "queue": true
  },
  "api": {
    "type": "official", // "browser", "official", "unofficial": the type of the chatgpt api to use
    "official": {
      // Please refer to "https://github.com/transitive-bullshit/chatgpt-api/blob/main/docs/classes/ChatGPTAPI.md#parameters"
      "apiKey": process.env['OPENAI_API_KEY'],
      "apiBaseUrl": "",
      "completionParams": {},
      "maxModelTokens": 0, // set to 0 to use default
      "maxResponseTokens": 0, // set to 0 to use default
      "timeoutMs": 60000 // set to 0 to disable
    }
  },
}
