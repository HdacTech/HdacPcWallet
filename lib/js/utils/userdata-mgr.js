var saveData = function(key, data) {
    if ((typeof key !== 'string') || (typeof data !== 'string')) {
        throw('key or data must be text.')
    }

    window.localStorage.setItem(key, data)
};

var readData = function(key, callback) {
    if (typeof key !== 'string') {
        throw('key must be text.')
    }

    if (typeof callback === 'function') {
        callback(window.localStorage.getItem(key));
    }
};

var removeData = function(key) {
    if (typeof key !== 'string') {
        throw('key must be text.')
    }

    window.localStorage.removeItem(key);
};

var clear = function() {
    window.localStorage.clear();
};


module.exports = {
    saveData: saveData,
    readData: readData,
    removeData: removeData,
    clear: clear
};