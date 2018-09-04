var PathUtils = (function () {
    return {
        getPath: function (internal_path, external_path) {
            var bip_path = 0x8000002c;
            var coin_path = 0x800000c8;
            var account_path = 0x80000000;

            return bip_path + '/' + coin_path + '/' + account_path + '/' + internal_path + '/' + external_path;
        },

        getPathFromAddress: function(wallet, address) {
            for (var idx in wallet.internal_addresses) {
                if (address === wallet.internal_addresses[idx].address) {
                    return this.getPath(1, idx);
                }
            }

            for(idx in wallet.external_addresses) {
                if (address === wallet.external_addresses[idx].address) {
                    return this.getPath(0, idx);
                }
            }

            return '';
        }
    }
}());
