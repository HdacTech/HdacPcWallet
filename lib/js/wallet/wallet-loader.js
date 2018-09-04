var urljoin = require('url-join');
var networks = require('./lib/js/networks.js');

var WalletLoader = function(wallet, explorer) {
    var callback;
    var change = 0, address_index = 0;

    var load = function(request) {
        switch (request.id) {
            case C.REQUEST_ADDR:
                loadAddress(request.callback);
                break;
            case C.REQUEST_UNSPENT:
                loadUnspent(request.addresses, request.callback);
                break;
            case C.REQUEST_TX_HISTORY:
                loadTxHistory(request.addresses, request.from, request.to, request.callback);
                break;
        }
    };

    var loadAddress = function(cb) {
        callback = cb;
        change = 0;
        address_index = 0;

        checkAddress(getAddress(change, address_index))
    };

    var checkAddress = function(address) {
        var params = {
            address: address
        };

        var endpoint = explorer.endpoints['address'].stringify(params);
        var explorer_url = urljoin(explorer.rootUrl, endpoint);

        var opt = {
            type : 'get',
            dataType : 'json',
            url : explorer_url,
            cache : false,
            data : ''
        };

        return $.ajax(opt).done(onCheckAddressResult);
    }

    var onCheckAddressResult = function(data, state, xhr) {
        if (state === 'success') {
            var addressnode = {
                "address" : data.addrStr,
                "n_tx" : data.txApperances,
                "balance" : data.balanceSat
            };

            var isExternalAddr = (change === 0)
            if (isExternalAddr) {
                if (!isExistAddrInWallet(addressnode.address)) {
                    wallet.external_addresses.push(addressnode);
                }

                if (addressnode.n_tx > 0) {
                    address_index++;
                } else {
                    change++;
                    address_index = 0;
                }

                return checkAddress(getAddress(change, address_index));
            }
            else {
                if (!isExistAddrInWallet(addressnode.address)) {
                    wallet.internal_addresses.push(addressnode);
                }

                if (addressnode.n_tx > 0 || address_index < (C.MAX_INTERNAL_ADDR_COUNT - 1)) {
                    address_index++;
                    return checkAddress(getAddress(change, address_index));
                }
                else {
                    wallet.txPath = PathUtils.getPath(change, address_index);

                    if (typeof callback !== 'function') {
                        return;
                    }

                    callback({
                        isSuccess: true,
                        requestId: C.REQUEST_ADDR
                    });
                }
            }
        } else {
            if (typeof callback !== 'function') {
                return;
            }

            callback({
                isSuccess: false,
                requestId: C.REQUEST_ADDR
            });
        }
    }

    function isExistAddrInWallet(address) {
        let i;
        for(i in wallet.internal_addresses) {
            if (address === wallet.internal_addresses[i].address)
                return true;
        }

        for(i in wallet.external_addresses) {
            if (address === wallet.external_addresses[i].address)
                return true;
        }

        return false;
    }

    var loadUnspent = function(addresses, cb) {
        callback = cb;
        checkUnspent(addresses)
    };

    function checkUnspent(addresses) {
        try {
            addresses = (addresses instanceof Array ? addresses : [addresses]).join(',');

            var params = {
                addrs: addresses
            };

            var endpoint = explorer.endpoints['unspent'].stringify(params);
            var apiUrl = urljoin(explorer.rootUrl, endpoint);
            var opt = {
                type : 'get',
                dataType : 'json',
                url : apiUrl,
                cache : false,
                error : onUnspentError
            };

            return $.ajax(opt).done(onCheckUnspentResult);
        } catch (err) {
            callback({
                isSuccess: false,
                requestId: C.REQUEST_UNSPENT
            });
        }
    }

    function onCheckUnspentResult (data, state, xhr) {
        var result = {
            isSuccess: false,
            requestId: C.REQUEST_UNSPENT
        };

        if (state === 'success') {
            try {
                var sum_amount = 0;
                for(var idx in data) {
                    var unspent = data[idx];
                    if (existUnspent(unspent))
                        continue;

                    var unspent_value = {
                        "txid"         : unspent.txid,
                        "address"      : unspent.address,
                        "scriptPubKey" : unspent.scriptPubKey,
                        "balance"      : unspent.satoshis,
                        "path"         : PathUtils.getPathFromAddress(wallet, unspent.address),
                        "confirmations": unspent.confirmations,
                        "vout"         : unspent.vout
                    };

                    wallet.unspent_values.push(unspent_value);

                    sum_amount = sum_amount + unspent.amount;
                }

                wallet.balance = sum_amount;
                result['isSuccess'] = true;
                callback(result);
            } catch (e) {
                callback(result);
            }
        } else {
            callback(result);
        }
    }

    var onUnspentError = function() {
        var result = {
            isSuccess: false,
            requestId: C.REQUEST_UNSPENT
        };
        callback(result);
    }

    var loadTxHistory = function(addresses, from, to, cb) {
        callback = cb;
        checkTxHistory(addresses, from, to);
    };

    function checkTxHistory(addresses, from, to) {
        addresses = (addresses instanceof Array ? addresses : addresses).join(',');
        var params = {
            addrs: addresses,
            from: from,
            to: to
        };

        var opt = {
            type : 'get',
            dataType : 'json',
            url : '',
            cache : false
        };

        try {
            var endpoint = explorer.endpoints['multiaddr'].stringify(params);
            var apiUrl = urljoin(explorer.rootUrl, endpoint);
            opt.url = apiUrl;

            return $.ajax(opt).done(onCheckTxHistory);
        } catch (err) {
            callback(false);
        }
    }

    function onCheckTxHistory(data, state, xhr) {
        var result = {
            isSuccess: false,
            requestId: C.REQUEST_TX_HISTORY
        };

        if (state === 'success') {
            try {
                wallet.txHistory = data.items;
                result['isSuccess'] = true;
                callback(result);
            } catch (e) {
                callback(result);
            }
        } else {
            callback(result);
        }
    }

    var getAddress = function(change, address_index) {
        var hdMaster = bitcoin.HDNode.fromSeedHex(wallet.seedHex, networks.hdac);
        var node = hdMaster.deriveHardened(44).
                            deriveHardened(C.CoinIndex.HDAC).
                            deriveHardened(0).
                            derive(change).
                            derive(address_index);

        return node.keyPair.getAddress();
    }

    var existUnspent = function(unspent) {
        for(var idx in wallet.unspent_values) {
            var cachedUnspent = wallet.unspent_values[idx];
            if ((cachedUnspent.txid === unspent.txid)
                && (cachedUnspent.vout === unspent.vout)) {
                return true;
            }
        }

        return false;
    }

    return {
        load: load
    }
};