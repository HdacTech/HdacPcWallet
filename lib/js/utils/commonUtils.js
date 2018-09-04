
var CommonUtils = (function () {
   
    return {
        numberWithCommas: function(x) {
            var number = x.toString();
            var beforePeriod = number.slice(0, number.indexOf("."));
            var afterPeriod = number.slice(number.indexOf("."), number.length);
            var numberWithComma = beforePeriod.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

            return numberWithComma + afterPeriod;
        },

        showSnackBar: function(msg) {
            var $snackbar = $('#snackbar');
            if ($snackbar.length === 0) {
                $('body').append('<div id="snackbar"></div>');
                $snackbar = $('#snackbar');
            }

            $snackbar.text(msg);
            $snackbar.addClass("show");
            setTimeout(function(){
                $snackbar.removeClass("show");
            }, 3000);
        },

        changeDateFormatKr: function (date) {
            var year = date.getFullYear();
            var month = (1 + date.getMonth());
            month = month >= 10 ? month : '0' + month;
            var day = date.getDate();
            day = day >= 10 ? day : '0' + day;

            var hh = date.getHours();
            hh = hh >= 10 ? hh : '0' + hh;
            var mm = date.getMinutes();
            mm = mm >= 10 ? mm : '0' + mm;

            return  year + '.' + month + '.' + day + " " + hh + ":" + mm;
        },

        filterNumberOnly: function(input) {
            return (input != null ? input.replace(/[^0-9.]/gi, '') : input);
        },

        toDisplayAmount: function(number) {
            if (typeof number !== 'number') {
                number = Number(number);
            }

            number = number.toFixed(8);
            number = number.replace(/(0+$)/, "");

            if (number.indexOf(".") === (number.length - 1)) {
                number = number.substr(0, number.length - 1)
            }

            return number;
        }
    }
    
}());