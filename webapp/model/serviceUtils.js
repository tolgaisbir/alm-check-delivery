sap.ui.define([
    "sap/ndc/BarcodeScanner",
    "sap/m/MessageBox"
], function (BarcodeScanner, MessageBox) {
    "use strict";

    return {
        scan: function (oBundle, fnDone) {
            BarcodeScanner.scan(function (oResult) {
                fnDone(!oResult.cancelled && typeof oResult.text === "string" ? oResult.text : null);
            }, function (oError) {
                fnDone(null);
                this.showError(oBundle, "scanError", oError);
            }.bind(this));
        },

        showError: function (oBundle, sKey, oError) {
            var sDetail = typeof oError === "string" ? oError : oError && (oError.message || oError.statusText);
            if (oError && oError.responseText) {
                try {
                    var oResponse = JSON.parse(oError.responseText);
                    if (oResponse.error && oResponse.error.message) {
                        sDetail = oResponse.error.message.value || oResponse.error.message;
                    }
                } catch {
                    sDetail = sDetail || oError.responseText;
                }
            }
            MessageBox.error(oBundle.getText(sKey) + (sDetail ? "\n" + sDetail : ""));
        }
    };
});
