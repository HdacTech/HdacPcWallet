var UrlPattern = require('url-pattern')

module.exports = {
  address: new UrlPattern('/addr/:address'),
  unspent: new UrlPattern('/addrs/:addrs/utxo'),
  multiaddr: new UrlPattern('/addrs/:addrs/txs?from=:from&to=:to'),
  pushtx: new UrlPattern('/tx/send'),
  
  block: new UrlPattern('/block/:hash'),
  block_index: new UrlPattern('/block-index/:height'),
  tx: new UrlPattern('/tx/:txid'),
  balance: new UrlPattern('/addr/:address/balance'),
  totalReceived: new UrlPattern('/addr/:address/totalReceived'),
  totalSent: new UrlPattern('/addr/:address/totalSent'),
  unconfirmedBalance: new UrlPattern('/addr/:address/unconfirmedBalance')
}
