// adapted from http://uniqueturker.myleott.com/lib.js

// Source: https://s3.amazonaws.com/mturk-public/externalHIT_v1.js
function turkGetParam( name, defaultValue ) { 
    var regexS = "[\?&]"+name+"=([^&#]*)"; 
    var regex = new RegExp( regexS ); 
    var tmpURL = window.location.href; 
    var results = regex.exec( tmpURL ); 
    if( results == null ) { 
        return defaultValue; 
    } else { 
        return results[1];
    } 
}

function UTWorkerLimitReached(ut_id, workerId, assignmentId) {
    
    //    var sys = require("sys"),
    //	path = require("path"), 
    //	fs = require("fs");
    
    var assignmentId = turkGetParam('assignmentId', '');
    if (assignmentId != '' && assignmentId != 'ASSIGNMENT_ID_NOT_AVAILABLE') {
        var workerId = turkGetParam('workerId', '');
        var url = '/db/'+ut_id+'/'+workerId+'/'+assignmentId;
	
        var response = turkGetParam('ut_response', '-1');
        if (window.XDomainRequest) {
            if (response == '-1') {
                // Use Microsoft XDR
                var xdr = new XDomainRequest();
                xdr.open("get", url);
                xdr.onload = function() {
                    response = xdr.responseText;
                    window.location.replace(window.location.href + "&ut_response="+response);
                };
                xdr.send();
            }
        } else {
            var request = new XMLHttpRequest();
            request.open('GET', url, false);
            request.send();
            response = request.responseText;
        }

        if (response == '0') {
            return true;
        }
    }
    return false;
}
