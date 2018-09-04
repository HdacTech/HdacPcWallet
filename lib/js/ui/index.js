$(document).ready(function () {
    delayedRedirect('landing.html');
});

function delayedRedirect(location) {
    setTimeout(function() {
        window.location = location;
    }, 1500);
}