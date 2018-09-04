var userDataMgr = require('./lib/js/utils/userdata-mgr.js');
var wallet = require('./lib/js/wallet/wallet.js');
var bip39 = require('bip39');

var isRestore;
var mnemonic;

$(document).ready(function() {
    initControls();

    $('#btn-create-wallet').on('click', function () {
        isRestore = false;
        $('#dialog-input-seed-header').text(i18next.t('landing.caption_create_wallet'));
        $('#dialog-create-wallet-info').modal('show');
        $('input[name="confirm"]').parent().removeClass("selected");
        $('#btnNext').addClass('disable');
    });

    $('#btn-restore-wallet').on('click', function () {
        isRestore = true;

        $('#dialog-input-seed-header').text(i18next.t('landing.caption_restore_wallet'));
        $('#dialog-input-seed').modal('show');
    });

    $('#btnNext').on('click', function () {
        if ($(this).hasClass('disable')) {
            return;
        }

        showMnemonicDialog();
    });

    $('#btnRecord').on('click', function () {
        showInputSeedDialog();
    });

    $('#backup-phrase-textArea').on('change keydown keyup paste', function () {
        var input = $(this).val();

        if (isValidInput(normalize(input))) {
            $('#btnCreateWallet').removeClass('disable');
        }
        else {
            $('#btnCreateWallet').addClass('disable');
        }
    });

    $('#btnCreateWallet').on('click', function () {
        if ($(this).hasClass('disable')) {
            return;
        }

        var seedHex;
        if (isRestore) {
            var inputValue = $('#backup-phrase-textArea').val();
            seedHex = bip39.mnemonicToSeedHex(normalize(inputValue));
        }
        else {
            seedHex = bip39.mnemonicToSeedHex(mnemonic);
        }

        wallet.seedHex = seedHex;
        userDataMgr.saveData('seedHex', seedHex);

        $('#create-wallet-container').css('display', 'none');
        $('#select-coin-container').css('display', 'block');
        $('.modal').modal('hide');
    });

    $('#btn-hdac').on('click', function () {
        window.location.replace('./loading.html');
    });
});


function showMnemonicDialog() {
    $('.modal').modal('hide');
    $('#dialog-create-seed').modal('show');

    if (!mnemonic) {
        mnemonic = bip39.generateMnemonic(128);
    }

    $('#backup-phrase').text(mnemonic);
}

function showInputSeedDialog() {
    $('#backup-phrase-textArea').val('');
    $('.modal').modal('hide');
    $('#dialog-input-seed').modal('show');
}

function isValidInput(input) {
    if (isRestore) {
        return bip39.validateMnemonic(input);
    }
    else {
        return (mnemonic) && (mnemonic === input);
    }
}

function normalize (seed) {
    if (typeof seed !== 'string') {
        throw new TypeError('string required')
    }

    seed = seed.normalize('NFKD');// Normalization Form: Compatibility Decomposition
    seed = seed.replace(/\s+/g, ' ');// Remove multiple spaces in a row
    seed = seed.toLowerCase();
    seed = seed.trim();

    return seed
}

function initControls() {
    try {
        userDataMgr.readData('seedHex', function(seedHex) {
            if (seedHex) {
                wallet.seedHex = seedHex;
                $('#select-coin-container').css('display', 'block');
            }
            else {
                $('#create-wallet-container').css('display', 'block');
            }
        });
    }
    catch (err) {}
}
