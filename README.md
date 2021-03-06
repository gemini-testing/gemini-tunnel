# gemini-tunnel

[![Build Status](https://travis-ci.org/gemini-testing/gemini-tunnel.svg)](https://travis-ci.org/gemini-testing/gemini-tunnel)

Plugin for setting up ssh tunnel while running tests with Gemini.

## Installation

`npm install gemini-tunnel`

## Configuration

- __host__ Address of remote host to which tunnel which will be established.
- __ports__ Ports range on remote host, port will be picked randomly from this range. If required to set specific port, __min__ and __max__ values must same.
- __ports.min__ Min port number.
- __ports.max__ Max port number.
- __localport__ Available port on local machine.
- __user__ (optional) User to connect to remote host
- __enabled__ (optional) Determines is plugin enabled. If option set as `false`, plugin will do nothing, otherwise plugin will work.
- __retries__ (optional) Number of attempts to establish tunnel. Defaults to 5 times.
- __protocol__ (optional) Protocol which will be used in resulting root url. Defaults to `http`
- __hostDecorator__ (optional) Function which can be used to decorate hostname before it will be written into rootUrl

Set the configuration to your `.gemini.js`

```js
system: {
  plugins: {
    gemini-tunnel: {
      host: 'remote_host_address',
      user: 'user',
      ports: {
        min: 8000,
        max: 8100
      },
      localport: 8080,
      enabled: true,
      retries: 3,
      protocol: 'https',
      hostDecorator: (baseHost) => { // hostname from the original rootUrl
        return /^m\./.test(baseHost)
          ? 'm.remote_host_address'
          : 'remote_host_address'
      }
    }
  }
}
```

If passed config is not an object, plugin will do nothing.
