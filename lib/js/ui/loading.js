var networks = require('./lib/js/networks.js');
var endpoints = require('./lib/js/explorer/endpoints.js');
var wallet = require('./lib/js/wallet/wallet.js');
var BLOCKEXPLORER = require('./lib/js/explorer/blockexplorer.js');

var blockExplorer;
var walletLoader;

$(document).ready(function () {
    initLoading();
});

function loadWallet() {
    walletLoader.load({
            id: C.REQUEST_ADDR,
            callback: loaderCallback
    });
}

function loaderCallback(result) {
    if (!result.isSuccess) {
        showAlertDialog(i18next.t('loading.msg_loading_fail'), function() {
            goHome();
        });
        return;
    }

    if (result.requestId === C.REQUEST_ADDR) {
        setNextAddress(wallet.txPath);

        walletLoader.load({
            id: C.REQUEST_UNSPENT,
            addresses : getWalletaddresses(false),
            callback  : loaderCallback
        });
    }
    else if (result.requestId === C.REQUEST_UNSPENT) {
        walletLoader.load({
            id: C.REQUEST_TX_HISTORY,
            addresses : getWalletaddresses(false),
            from      : 0,
            to        : 50,
            callback  : loaderCallback
        });
    }
    else if (result.requestId === C.REQUEST_TX_HISTORY) {
        window.location.replace("./main.html");
    }
}

function getAddress(change, address_index) {
    var hdMaster = bitcoin.HDNode.fromSeedHex(wallet.seedHex, networks.hdac);
    var node = hdMaster.deriveHardened(44).deriveHardened(C.CoinIndex.HDAC).deriveHardened(0).derive(change).derive(address_index);

    return node.keyPair.getAddress();
}

function getWalletaddresses(unspent) {
    var addresses = [];
    if (unspent) {
        for(var idx in wallet.internal_addresses) {
            if (wallet.internal_addresses[idx].balance > 0)
                addresses.push(wallet.internal_addresses[idx].address)
        }

        for(var idx in wallet.external_addresses) {
            if (wallet.external_addresses[idx].balance > 0)
                addresses.push(wallet.external_addresses[idx].address)
        }
    } else {
        for(var idx in wallet.internal_addresses) {
            addresses.push(wallet.internal_addresses[idx].address)
        }

        for(var idx in wallet.external_addresses) {
            addresses.push(wallet.external_addresses[idx].address)
        }
    }

    return addresses;
}

function setNextAddress(path) {
    var splitPath = path.split('/');
    var change = parseInt(splitPath[3]);
    var address_index = parseInt(splitPath[4]);
    if (change === 0) {
        change = 1;
        address_index = 0;
    } else {
        address_index++;
        if (address_index >= C.MAX_INTERNAL_ADDR_COUNT) {
            address_index = 0;
        }
    }

    wallet.txPath = PathUtils.getPath(change, address_index);
    wallet.nextTxAddr = getAddress(change, address_index);
}

function showAlertDialog(msg, callbackOk) {
    var $confirm = $("#alertDialog");
    $confirm.modal('show');
    $("#lblAlert").html(msg);
    $("#btnConfirmOK").off('click').click(function() {
        if (callbackOk !== null) {
            callbackOk();
        }
        $confirm.modal("hide");
    });
}

function goHome() {
    initWallet();
    window.location.replace("./landing.html");
}

function initWallet() {
    wallet.account_label = '';
    wallet.path = PathUtils.getPath(0, 0);
    wallet.txPath = PathUtils.getPath(0, 0);
    wallet.nextTxAddr = '';
    wallet.balance = 0;
    wallet.internal_addresses = [];
    wallet.external_addresses = [];
    wallet.unspent_values = [];
    wallet.txHistory = [];
}

function initLoading () {
    blockExplorer = new BLOCKEXPLORER(endpoints);
    walletLoader = new WalletLoader(wallet, blockExplorer);

    initWallet();
    loadWallet();
}
