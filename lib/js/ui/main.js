var networks = require('./lib/js/networks.js');
var endpoints = require('./lib/js/explorer/endpoints.js');
var wallet = require('./lib/js/wallet/wallet.js');
var userDataMgr = require('./lib/js/utils/userdata-mgr.js');
var coinSelect = require('./lib/js/utils/coinSelect.js');

var urljoin = require('url-join');
var gui = require('nw.gui');
var bs58 = require('bs58');

var blockExplorer;
var walletLoader;

var txFee;

var _DEFINE = {
    hdac_min_tx_fee: 0.01,
}

$(document).ready(function () {
    var BLOCKEXPLORER = require('./lib/js/explorer/blockexplorer.js');
    blockExplorer = new BLOCKEXPLORER(endpoints);
    walletLoader = new WalletLoader(wallet, blockExplorer);

    initMain();
    initReceive();
    initSend();
});

$(function(){
    $('.sideBar-item').click(function () {
        var targetId = $(this).attr("data-targetId");
        var prevId = $('.dashboard_content:visible').attr('id');
        if (targetId === prevId) {
            return;
        }

        $('.sideBar-item').each(function () {
            $(this).attr('data-select', "");
        });

        $(this).attr('data-select', 'selected');

        $('#' + prevId).hide();
        $('#' + targetId).show();

        if (prevId === 'dashboard_receive') {
            initReceive();
        }
        else if (prevId === 'dashboard_send') {
            initSend();
        }
    });

    $('#btn_config').click(function () {
        var $setting = $("#setting_popup");
        $setting.modal('show');
        $(".btn_close").off('click').click(function() {
            $setting.modal("hide");
        });
    });

    $('.setting_menu_item').click(function (){
        var $menuItem = $(this);
        var item = $menuItem.attr('data-name');
        var $target;
        switch(item) {
            case 'reset':
                $target = $('#setting_reset');
                $('#check-understand').parent().removeClass('selected');
                $('#btnReset').addClass('disable');
                break;
        }

        showChildModal($target, 'setting_popup');
    });

    $('.modal-prev').click(function() {
        var prevBtn = $(this);
        showParentModal(prevBtn);
    });

    $('#btn_make_qrCode').click(function () {
        var address = wallet.external_addresses[0].address;
        var inputAmount = $('#recv_amount').val();
        $('.qr').attr("src", makeQRCode(143, address, inputAmount));
    });

    $('#mailTo').click(function () {
        $('#input_email').val("");
        var $confirm = $("#inputEmailDialog");
        $confirm.modal('show');
        $("#sendEmail").off('click').click(function() {
            var email = $('#input_email').val();
            var subject = "Wallet address";
            var message = wallet.external_addresses[0].address;

            window.location.href = "mailto:" + email + "?"
                + "subject=" + encodeURIComponent(subject)
                + "&body=" + encodeURIComponent(message);

            $confirm.modal("hide");
        });
    });

    $(document).on('click', '.transItem', function () {
        var $transItem = $(this);
        var address = $transItem.find('.list_address').text();
        var amount = $transItem.find('.list_amount').text();
        var time = $transItem.find('.list_date').text();
        var fee = $transItem.attr('data-fee');
        var txId = $transItem.attr('data-txId');

        var addressLabel = $('#detail-label-address');
        if (address.search('FROM') !== -1) {
            addressLabel.text("From");
            address = address.slice(4).trim();
        }
        else {
            addressLabel.text("To");
            address = address.slice(2).trim();
        }

        amount = amount.replace('+ ', "");
        amount = amount.replace('- ', "");
        amount = amount.slice(0, amount.search(' '));

        if (isNaN(amount)) {
            amount = 0;
        }

        if (isNaN(fee)) {
            fee = 0;
        }

        $('#detail-address').text(address);
        $('#detail-amount').text(amount);
        $('#detail-fee').text(fee);
        $('#detail-time').text(time);
        $('#detail-txId').text(txId);

        $('#trans-detail-view').modal('show');
    });

    $('#link-coin-explorer').click(function () {
        var txId = $('#detail-txId').text();
        linkCoinExplorer(txId);
    });

    $(":input:radio[name=send_fee]").click(function(){
        var inputValue = $("#txt_inputCoin").val();
        inputValue = parseFloat(inputValue);

        var id = $(this).attr('id');
        if (id === 'fee_user') {
            $('.fee_input_wrapper').css('visibility', 'visible');
        }
        else {
            $('.fee_input_wrapper').css('visibility', 'hidden');
            $('#input_fee_user').val(0);
        }

        if (id === "low") {
            $(".send_fee_alert").text(i18next.t('main.low_fee_alert'));
            $(".send_fee_alert").css("visibility", 'visible');
        }
        else {
            $(".send_fee_alert").css("visibility", 'hidden');
        }

        var fee = getSelectedFee();

        if (inputValue > 0) {
            var totalCoin = parseFloat((fee + inputValue).toFixed(8));
            $('#totalCoin').text(totalCoin);

            txFee = fee;
        }
        else {
            $('#totalCoin').text(0);
        }
    });

    $('#recv_amount').on('change keydown keyup paste', function () {
        var amount = $(this).val();
        if (!amount) {
            amount = 0;
        }

        if (!(event.keyCode >=37 && event.keyCode<=40)) {
            $(this).val(CommonUtils.filterNumberOnly(amount));
        }

        setTimeout(function () {
            var address = wallet.external_addresses[0].address;
            var size = 143;
            $('.qr').attr("src", makeQRCode(size, address, amount));
        }, 500);
    });

    $('#txt_inputCoin').on('change keydown keyup paste', function () {
        var inputValue = $(this).val();

        if (event && !(event.keyCode >= 37 && event.keyCode <= 40)) {
            $(this).val(CommonUtils.filterNumberOnly(inputValue));
        }

        inputValue = parseFloat(inputValue);
        if (inputValue > 0) {
            txFee = getSelectedFee();
            var totalCoin = parseFloat((txFee + inputValue).toFixed(8));
            $('#totalCoin').text(totalCoin);
        }
        else {
            $('#totalCoin').text("0");
        }
    });

    $('#input_fee_user').on('change keydown keyup paste', function () {
        var inputFee = $('#input_fee_user').val();
        if (!(event.keyCode >=37 && event.keyCode<=40)) {
            $(this).val(CommonUtils.filterNumberOnly(inputFee));
        }

        if (isNaN(inputFee) || inputFee === '') {
            inputFee = 0;
        }

        var inputValue = $("#txt_inputCoin").val();
        inputValue = parseFloat(inputValue);
        inputFee = parseFloat(inputFee);

        if (inputFee > 0) {
            var txtFeeAlert;
            if (!isAcceptableFee(inputFee)) {
                txtFeeAlert = i18next.t('main.invalid_fee');
            }
            else if (_DEFINE.hdac_min_tx_fee === inputFee) {
                txtFeeAlert = i18next.t('main.low_fee_alert');
            }

            if (txtFeeAlert) {
                $(".send_fee_alert").text(txtFeeAlert);
                $(".send_fee_alert").css("visibility", 'visible');
            }
            else {
                $(".send_fee_alert").css("visibility", 'hidden');
            }
        }
        else {
            $(".send_fee_alert").css("visibility", 'hidden');
        }

        var totalCoin = parseFloat((inputFee + inputValue).toFixed(8));
        $('#totalCoin').text(totalCoin);

        txFee = inputFee;
    });

    $("#bt_max").click(function(){
        var balance = wallet.balance,
            totalQuan, maxQuan;

        if (balance <= 0) {
            $("#txt_inputCoin").val(0);
            $('#totalCoin').text(0);
            return;
        }

        txFee = getSelectedFee();
        maxQuan = balance - txFee;
        if (maxQuan <= 0) {
            CommonUtils.showSnackBar(i18next.t('main.check_fee'));
            return;
        }

        maxQuan = parseFloat(maxQuan.toFixed(8));

        $("#txt_inputCoin").val(maxQuan);
        totalQuan = parseFloat((maxQuan + txFee).toFixed(8));
        $('#totalCoin').text(totalQuan);
    });

    $('#id_submit').click(function(){
        if (!checkSubmitValidation()) {
            return;
        }

        showConfirmDialog(
            i18next.t('main.msg_send_confirm'),
            onSubmitBtnClickEventHandler,
            null
        );
    });

    $('.btn_home').on('click',function(){
        moveToHome();
    });

    $('.reload').click(function () {
        $(this).addClass('refresh-animate');
        refreshWallet();
    });

    $('#copytoclipboard').click(function(){
        copyToClipboard('#recv_address')
    });

    $('#btnReset').on('click', function () {
        if ($(this).hasClass('disable')) {
            return;
        }

        userDataMgr.clear();
        logout();
    })
});

function onSubmitBtnClickEventHandler () {
    showTxProgress();
    submit();
}

function showTxProgress() {
    var progress = $("#txProgressDialog");
    if(!progress.hasClass('in')){
        progress.modal('show');
    }
}

function hideTxProgress() {
    var progress = $("#txProgressDialog");
    progress.modal('hide');
}

function submit() {
    var send_address = $("#send_address").val().trim();
    var send_amount = parseFloat($("#txt_inputCoin").val());
    var fee = getSelectedFee();

    if (!existWallet(wallet.nextTxAddr)) {
        wallet.nextTxAddr = wallet.unspent_values[0].address;
    }

    var txBuilder = new bitcoin.TransactionBuilder(networks.hdac);

    var target = {
        targetValue: Math.floor(parseFloat(send_amount + fee) * Math.pow(10, 8))
    }

    var i;
    var sumAccum = 0;
    var utxos = coinSelect(wallet.unspent_values, target);
    for(i = 0; i < utxos.length; i++) {
        txBuilder.addInput(utxos[i].txid, utxos[i].vout);
        sumAccum += parseFloat((utxos[i].balance * Math.pow(10, -8)).toFixed(8));
    }

    var sendAmountSatoshi = Math.floor(parseFloat(send_amount) * Math.pow(10, 8));
    txBuilder.addOutput(send_address, sendAmountSatoshi);

    var remain = parseFloat((sumAccum - send_amount - fee).toFixed(8));
    if (remain > 0) {
        var remainSatoshi = Number((remain * Math.pow(10, 8)).toFixed(0));
        txBuilder.addOutput(wallet.nextTxAddr, remainSatoshi);
    }

    if (sign(txBuilder, utxos)) {
        sendRawTransaction(txBuilder);
    }
}

function sign(txBuilder, inputs) {
    for (var i = 0; i < inputs.length; i++) {
        var node;
        var path = inputs[i].path;
        if (path != null) {
            try {
                var splitPath = path.split('/');
                var change = parseInt(splitPath[3]);
                var address_index = parseInt(splitPath[4]);

                var hdMaster = bitcoin.HDNode.fromSeedHex(wallet.seedHex, networks.hdac);
                node = hdMaster.deriveHardened(44).deriveHardened(C.CoinIndex.HDAC).deriveHardened(0).derive(change).derive(address_index);
                txBuilder.sign(i, node.keyPair);
            }
            catch (err) {
                return false;
            }
        }
        else {
            return false;
        }
    }

    return true;
}

function sendRawTransaction(txBuilder) {
    try {
        var params = {
            rawtx: txBuilder.build().toHex()
        };

        var opt = {
            type : 'POST',
            url : '',
            cache : false,
            data : params,
            success : onTxSuccess,
            error : onTxError
        };

        opt.url = urljoin(blockExplorer.rootUrl, '/tx/send');
        return $.ajax(opt)
    } catch (err) {}
}

function onTxSuccess (data, state, xhr) {
    hideTxProgress();
    if (state === 'success') {
        showAlertDialog(i18next.t('main.msg_transfer_complete'), null);
        initSendPanel();
        try {
            refreshWallet();
            updatePath();
            return data;
        } catch (e) {
            return data
        }
    }
    else {
        showAlertDialog(i18next.t('main.msg_tx_fail'), null);
        return xhr;
    }
}

function onTxError (xhr, state, err) {
    hideTxProgress();

    if (xhr.status == 200) {
        updatePath();
    } else {
        var message = i18next.t('main.msg_tx_fail');
        if (xhr.responseText.includes('insufficient fee')) {
            message = i18next.t('main.msg_tx_fail_insufficient_fee');
        }
        showAlertDialog(message, null);
    }
}

function refreshWallet() {
    wallet.unspent_values = [];
    $('.reload').addClass('refresh-animate');

    walletLoader.load({
        id        : C.REQUEST_UNSPENT,
        addresses : getWalletaddresses(false),
        callback  : loaderCallback
    });
}

function loaderCallback(result) {
    if (!result.isSuccess) {
        stopRefreshAnimation();
        return;
    }

    if (result.requestId === C.REQUEST_UNSPENT) {
        setBalance(CommonUtils.toDisplayAmount(wallet.balance));

        walletLoader.load({
            id        : C.REQUEST_TX_HISTORY,
            addresses : getWalletaddresses(false),
            from      : 0,
            to        : 50,
            callback  : loaderCallback
        });
    }
    else if (result.requestId === C.REQUEST_TX_HISTORY) {
        stopRefreshAnimation();
        $('#trans_list_item').empty();

        var txHistory = parseTransaction(wallet.txHistory);
        if (txHistory) {
            addTxHistory(txHistory);
        }
    }
}

function updatePath() {
    var path = wallet.txPath.split('/');
    var change = parseInt(path[3]);
    var address_index = parseInt(path[4]);
    if (change === 0) {
        change = 1;
        address_index = 0;
    }
    else {
        address_index++;
        if (address_index >= C.MAX_INTERNAL_ADDR_COUNT) {
            address_index = 0;
        }
    }

    wallet.txPath = PathUtils.getPath(change, address_index);

    var hdMaster = bitcoin.HDNode.fromSeedHex(wallet.seedHex, networks.hdac);
    var node = hdMaster.deriveHardened(44).deriveHardened(C.CoinIndex.HDAC).deriveHardened(0).derive(change).derive(address_index);

    wallet.nextTxAddr = node.keyPair.getAddress();
}

function setBalance(coinAmount) {
    $('.balance_currency').css('font-size', '18px');
    $('.balance_amount').text(CommonUtils.numberWithCommas(CommonUtils.toDisplayAmount(coinAmount)));
}

function parseTransaction(txs) {
    var trans = [],
        txIdMap = [],
        i, j;


    for(i = 0; i < txs.length; i++) {
        var vFrom = false;
        var time = txs[i].time;
        var date = new Date(time * 1000);
        var formattedDate = CommonUtils.changeDateFormatKr(date);

        var amount = 0;
        var fee = parseFloat(txs[i].fees);
        var address = '';
        for(j = 0; j < txs[i].vin.length; j++) {
            if (existWallet(txs[i].vin[j].addr)) {
                vFrom = true;
                break;
            } else {
                address = txs[i].vin[j].addr;
                break;
            }
        }

        if (vFrom) {
            for(j = 0; j < txs[i].vout.length; j++) {
                if (!txs[i].vout[j].scriptPubKey.addresses) {
                    continue;
                }

                if (!existWallet(txs[i].vout[j].scriptPubKey.addresses[0])) {
                    address = txs[i].vout[j].scriptPubKey.addresses[0];
                    amount = parseFloat(txs[i].vout[j].value);
                    amount = 0 - amount - fee;
                    break;
                }
            }

            if (address.length === 0 && txs[i].vout[0].scriptPubKey.addresses !== undefined) {
                address = txs[i].vout[0].scriptPubKey.addresses[0];
                amount = parseFloat(txs[i].vout[0].value);
                amount = 0 - amount - fee;
            }
        } else {
            for(j = 0; j < txs[i].vout.length; j++) {
                if (!txs[i].vout[j].scriptPubKey.addresses) {
                    continue;
                }

                if (existWallet(txs[i].vout[j].scriptPubKey.addresses[0])) {
                    amount = parseFloat(txs[i].vout[j].value);
                    break;
                }
            }
        }

        var confirmations = txs[i].confirmations;
        var txId = txs[i].txid;

        var tran = {
            "time"          : formattedDate,
            "amount"        : amount,
            "address"       : address,
            "confirmations" : confirmations,
            "txId"          : txId,
            "fee"           : fee
        };

        if (!txIdMap[txId]) {
            txIdMap[txId] = true;
            trans.push(tran);
        }
    }

    return trans;
}

function existWallet(address) {
    for(var idx in wallet.internal_addresses) {
        wallet.internal_addresses[idx].address
        if (address == wallet.internal_addresses[idx].address)
            return true;
    }
    for(var idx in wallet.external_addresses) {
        wallet.external_addresses[idx].address
        if (address == wallet.external_addresses[idx].address)
            return true;
    }
    return false;
}

function addTxHistory(trans) {
    var listItem = $("#trans_list_item");
    var isDeposit;
    var isConfirmed;
    var validConfirmCount = 6;
    if (!trans || (trans.length === 0)) {
        $('#trans_list_item').css('display', 'none');
        $(".no_trans").css("display", "block");
        return;
    }

    listItem.css('display', 'block');
    $(".no_trans").css("display", "none");

    for (var idx in trans) {
        var transData = trans[idx];
        isDeposit = false;
        if (transData.amount > 0) {
            isDeposit = true;
        }
        isConfirmed = (transData.confirmations >= validConfirmCount);

        var additionalData = " ";
        if (transData['txId'] !== undefined) {
            additionalData += "data-txId='" + transData['txId'] + "' " ;
        }
        if (transData['fee'] !== undefined) {
            additionalData += "data-fee='" + CommonUtils.toDisplayAmount(transData['fee']) + "' " ;
        }

        var html = "<li class='transItem list_row'" + additionalData + ">";

        html += "<div class='list_cell list_date ellipsis'>";
        html += transData.time + "</div>";

        if (isDeposit) {
            html += "<div class='list_cell list_address ellipsis'><span class='deposit fromTo'>FROM </span>" + transData.address + "</div>";
        }
        else {
            html += "<div class='list_cell list_address ellipsis'><span class='withdraw fromTo'>TO </span>" + transData.address + "</div>";
        }

        html += "<div class='list_cell list_amount'>";
        if (isDeposit) {
            html += "<span class='deposit'>+ " + CommonUtils.toDisplayAmount(transData.amount)
                + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + "DAC" + "</span></div>";
        }
        else {
            var amount = CommonUtils.toDisplayAmount(transData.amount) * -1;
            if (amount <= 0) {
                amount *= -1;
            }

            html += "<span class='withdraw'>- " + CommonUtils.toDisplayAmount(amount)
                + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + "DAC" + "</span></div>";
        }

        html += "<div class='list_cell list_confirm'>";
        if (isConfirmed) {
            html += "<span class='ic_confirmed'>&nbsp;&nbsp;</span><span class='confirmed'>" + "Confirmed" + "</span></div>";
        }
        else {
            if (isDeposit) {
                html += "<span class='ic_deposit'>&nbsp;&nbsp;</span><span class='deposit'>" + "Confirm(" + transData.confirmations + "/" + validConfirmCount + ")" + "</span></div>";
            }
            else {
                html += "<span class='ic_withdraw'>&nbsp;&nbsp;</span><span class='withdraw'>" + "Confirm(" + transData.confirmations + "/" + validConfirmCount + ")" + "</span></div>";
            }
        }

        html += "</li>";
        listItem.append(html);
    }
}

function getWalletaddresses(unspent) {
    var addresses = [];
    if (unspent) {
        for(var idx in wallet.internal_addresses) {
            if (wallet.internal_addresses[idx].balance > 0)
                addresses.push(wallet.internal_addresses[idx].address)
        }

        for(idx in wallet.external_addresses) {
            if (wallet.external_addresses[idx].balance > 0)
                addresses.push(wallet.external_addresses[idx].address)
        }
    } else {
        for(idx in wallet.internal_addresses) {
            addresses.push(wallet.internal_addresses[idx].address)
        }

        for(idx in wallet.external_addresses) {
            addresses.push(wallet.external_addresses[idx].address)
        }

    }

    return addresses;
}

function getSelectedFee() {
    var feeLevel = {
        high   : 0.1,
        middle : 0.03,
        low    : 0.01
    };

    var fee;
    var checked = $("input[name='send_fee']:checked").attr("id");
    if (checked === "upper") {
        fee = feeLevel.high;
    }
    else if (checked === "middle") {
        fee = feeLevel.middle;
    }
    else if (checked === "low") {
        fee = feeLevel.low;
    }
    else {
        fee = Number($('#input_fee_user').val());
    }

    return fee;
}

function checkSubmitValidation() {
    // 1. check address validation
    var address = $('#send_address').val().trim();
    if (!address) {
        CommonUtils.showSnackBar(i18next.t('main.msg_input_address'));
        return false;
    }

    if (!isValidAddress(address)) {
        CommonUtils.showSnackBar(i18next.t('main.msg_invalid_address'));
        return false;
    }

    // 2. check tx input amount validation
    var inputAmount = $('#txt_inputCoin').val();
    if ((inputAmount === undefined) || (inputAmount <= 0) || (inputAmount === '')) {
        CommonUtils.showSnackBar(i18next.t('main.msg_enter_tx_amount'));
        return false;
    }

    var balance = wallet.balance;
    var totalTxAmount = $('#totalCoin').text();
    if (balance < totalTxAmount) {
        CommonUtils.showSnackBar(i18next.t('main.msg_tx_amount_over_balance'));
        return false;
    }

    if ((txFee <= 0) || (txFee === undefined)) {
        CommonUtils.showSnackBar(i18next.t('main.msg_input_fee'));
        return false;
    }

    if (!isAcceptableFee(txFee)) {
        CommonUtils.showSnackBar(i18next.t('main.msg_fee_is_too_low'));
        return false;
    }

    return true;
}

function isValidAddress(address) {
    var WAValidator = require('./lib/js/wallet-address-validator/wallet_address_validator.js');
    return WAValidator.validate(address, 'hdac');
    /*var deAddr = bs58.decode(address);
    if ((networks.hdac.pubKeyHash == deAddr[0] || networks.hdac.scriptHash == deAddr[0])
        && (deAddr.length === 25)) {
        return true;
    }

    return false;*/
}

function isAcceptableFee(fee) {
    if (fee < _DEFINE.hdac_min_tx_fee) {
        return false;
    }

    var send_amount = parseFloat($("#txt_inputCoin").val());
    var target = {
        targetValue: Math.round((send_amount + fee) * Math.pow(10, 8))
    };
    var inputs = coinSelect(wallet.unspent_values, target);
    var length = inputs.length;

    // generally, vin size is 150 byte
    // satoshi per byte is 1000
    var minimum = (600 + (150 * (length - 1))) * 1000;
    if ((fee * Math.pow(10, 8)) < minimum) {
        return false;
    }

    return true;
}

function stopRefreshAnimation() {
    var refreshBtn = $('.reload');
    var hasAnimation = refreshBtn.hasClass('refresh-animate');
    if (hasAnimation) {
        setTimeout(function () {
            refreshBtn.removeClass('refresh-animate');
        }, 500);
    }
}

function copyToClipboard(element) {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val($(element).val()).select();
    document.execCommand("copy");
    $temp.remove();
    CommonUtils.showSnackBar(i18next.t('main.msg_copyToClipboard'));
}

function makeQRCode(size, addr, send_amount) {
    var uri = "dac:" + addr + "?amount=" + send_amount;

    return "http://chart.googleapis.com/chart?chs=" + size + "x" + size + "&cht=qr&chl=" + uri + "&chld=L|0";
}

function moveToHome() {
    window.location.replace("./landing.html");
}

function logout() {
    window.location.replace("./index.html");
}

function linkCoinExplorer(txId) {
    var link = "https://explorer.as.hdactech.com/hdac-explorer/tx/" + txId;
    gui.Shell.openExternal(link);
}

function initSendPanel() {
    try {
        $('input:radio[name=send_fee]:input[value="3000000"]').prop("checked", true);

        $("#send_address").val("");
        $("#txt_inputCoin").val(0);
        $('.fee_input_wrapper').css('visibility', 'hidden');
        $('#input_fee_user').val(0);
        $('#fee_user').val(0);
        $("#totalCoin").text(0);
        $("#totalCash").text(0);
    }
    catch (error) {}
}

function showChildModal($target, anchor_id) {
    $target.find('.modal-prev').attr('anchor_id', anchor_id);
    anchor_id = '#' + anchor_id;
    $(anchor_id).modal('hide');
    $target.modal('show');
}

function showParentModal($prevBtn) {
    var anchor_id = $prevBtn.attr('anchor_id');
    var $curModal = $('.modal.in');
    $curModal.modal('hide');
    if (anchor_id) {
        anchor_id = '#' + anchor_id;
        $(anchor_id).modal('show');
    }

    $(this).removeAttr('anchor_id');
}

function showConfirmDialog(msg, callbackYes, callbackNo) {
    var $confirm = $("#confirmDialog");
    $confirm.modal('show');
    $("#lblMsg").html(msg);
    $("#btnConfirmYes").off('click').click(function() {
        callbackYes();
        $confirm.modal("hide");
    });
    $("#btnConfirmNo").off('click').click(function () {
        if (callbackNo !== null) {
            callbackNo();
        }
        $confirm.modal("hide");
    });
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

function initMain() {
    setBalance(CommonUtils.toDisplayAmount(wallet.balance));
    addTxHistory(parseTransaction(wallet.txHistory));
}

function initReceive() {
    var externalAddress = wallet.external_addresses[0].address;
    $("#recv_amount").val(0);
    $('#recv_address').val(externalAddress);
    $('.qr').attr("src", makeQRCode(143, externalAddress, 0));
}

function initSend() {
    $('#totalCoin').text(0);
    $('#totalCash').text(0);
    $('#send_address').val('');
    $('#txt_inputCoin').val(0);
    $('#input_fee_user').val(0);
    $('.send_fee_alert').css('visibility', 'hidden');
    $('.fee_input_wrapper').css('visibility', 'hidden');
    $(".send_fee_alert").css('visibility', 'hidden');
}