var wallet = function() {
    this.account_label = '';
    this.path = '';
    this.txPath = '';
    this.balance = 0;
    this.internal_addresses = [];
    this.external_addresses = [];
    this.unspent_addresses = [];
    this.unspent_values = [];
    this.nextTxAddr = '';
    this.seedHex = '';
    this.txHistory = [];
};

module.exports = wallet