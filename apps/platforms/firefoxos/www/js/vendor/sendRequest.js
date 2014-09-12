(function(window) {
    function sendRequest(url, options) {
        var options = options || {};
        var req = createXMLHTTPObject();
        if (!req) return;
        var method = options.method || "GET";
        req.open(method,url,true);
        if (method && options.formData) {
            req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
        }
        if(options.json) {
            req.setRequestHeader('Accept','application/json');
            req.overrideMimeType("application/json");  
        }
        req.onreadystatechange = function () {
            if (req.readyState != 4) return;
            if (req.status != 200 && req.status != 304) {
                // alert('HTTP error ' + req.status);
                if(typeof options.fail === 'function') {
                    options.fail.call(options.scope || window, req);
                }
            }
            if(typeof options.done === 'function') {
                if(options.json) {
                    var response = req.response || req.responseText;
                    try {
                        response = JSON.parse(response);
                    } catch(e) {}
                    options.done.call(options.scope || window, response);
                } else {
                    options.done.call(options.scope || window, req);   
                }
            }
        }
        if (req.readyState == 4) return;
        req.send(options.postData);
    }

    var XMLHttpFactories = [
        function () {return new XMLHttpRequest()},
        function () {return new ActiveXObject("Msxml2.XMLHTTP")},
        function () {return new ActiveXObject("Msxml3.XMLHTTP")},
        function () {return new ActiveXObject("Microsoft.XMLHTTP")}
    ];

    function createXMLHTTPObject() {
        var xmlhttp = false;
        for (var i=0;i<XMLHttpFactories.length;i++) {
            try {
                xmlhttp = XMLHttpFactories[i]();
            }
            catch (e) {
                continue;
            }
            break;
        }
        return xmlhttp;
    }

    window.sendRequest = sendRequest;
})(window);