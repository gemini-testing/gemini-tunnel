# Changelog

# 1.3.0 - 2016-08-31

* Add `tunnel.user` config option; it could be overriden by `GEMINI_TUNNEL_USER` environment variable

# 1.2.1 - 2016-07-14

* Fix issue with dropped url path after host replacement

# 1.2.0 - 2016-03-10

* Added ability to pass Function as a localport

# 1.1.0 - 2016-02-18

* Tunnel module extracted to separate package

# 1.0.3 - 2015-10-22

* Added opts validation step: if opts is not an object, plugin will do nothing

# 1.0.2 - 2015-10-22

* Resulting root url protocol now may be configured using option `protocol`. It is no longer picked from old root url. Default value for protocol is `http`.

## 1.0.1 - 2015-10-21

* Fixed bug when protocol from old root url was not added to result root url

## 1.0.0

* Initial release
