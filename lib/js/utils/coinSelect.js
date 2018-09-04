function uintOrNaN (v) {
    if (typeof v !== 'number') return NaN
    if (!isFinite(v)) return NaN
    if (Math.floor(v) !== v) return NaN
    if (v < 0) return NaN
    return v
}

function blackjack (utxos, outputs) {
    if (!isFinite(uintOrNaN(outputs.targetValue))) return []

    var inAccum = 0
    var inputs = []
    var targetValue = outputs.targetValue;

    for (var i = 0; i < utxos.length; ++i) {
        var input = utxos[i]

        inAccum += uintOrNaN(input.balance)
        inputs.push(input)

        if (inAccum >= targetValue)
            return inputs;
    }

    return []
}

function utxoScore (x) {
    return x.balance
}

module.exports = function coinSelect(utxos, outputs) {
    utxos = utxos.concat().sort(function (a, b) {
        return utxoScore(b) - utxoScore(a)
    })

    var base = blackjack(utxos, outputs)
    if (base.length > 0) return base

    return []
}
