sap.ui.define([
    "zsddeliverychk/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "zsddeliverychk/model/serviceUtils"
],
function (Controller, JSONModel, Filter, FilterOperator, MessageToast, serviceUtils) {
    "use strict";

    return Controller.extend("zsddeliverychk.controller.Main", {
        onInit: function () {
            this.getView().setModel(new JSONModel({
                search: "",
                headers: [],
                loading: false,
                scanning: false
            }), "page");
            this._searchSequence = 0;
        },

        onScan: function () {
            var oPage = this.getView().getModel("page");
            oPage.setProperty("/scanning", true);
            serviceUtils.scan(this.getResourceBundle(), function (sText) {
                oPage.setProperty("/scanning", false);
                if (sText !== null) {
                    oPage.setProperty("/search", sText);
                    this.onSearch();
                }
            }.bind(this));
        },

        onSearch: function () {
            var oPage = this.getView().getModel("page");
            var sVbeln = oPage.getProperty("/search").trim();
            var iSequence = ++this._searchSequence;
            oPage.setProperty("/headers", []);
            oPage.setProperty("/loading", false);
            if (!sVbeln) {
                MessageToast.show(this.getResourceBundle().getText("deliveryRequired"));
                return;
            }
            oPage.setProperty("/search", sVbeln);
            oPage.setProperty("/loading", true);
            this.getView().getModel().read("/CheckHeaderSet", {
                filters: [new Filter("Vbeln", FilterOperator.EQ, sVbeln)],
                success: function (oData) {
                    if (iSequence === this._searchSequence) {
                        oPage.setSizeLimit(Math.max(100, oData.results.length));
                        oPage.setProperty("/headers", oData.results);
                        oPage.setProperty("/loading", false);
                    }
                }.bind(this),
                error: function (oError) {
                    if (iSequence === this._searchSequence) {
                        oPage.setProperty("/loading", false);
                        serviceUtils.showError(this.getResourceBundle(), "headerLoadError", oError);
                    }
                }.bind(this)
            });
        },

        onHeaderPress: function (oEvent) {
            var sVbeln = oEvent.getSource().getBindingContext("page").getProperty("Vbeln");
            this.getRouter().navTo("RouteItems", { vbeln: encodeURIComponent(sVbeln) });
        }
    });
});
