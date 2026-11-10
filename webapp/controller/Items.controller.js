sap.ui.define([
    "zsddeliverychk/controller/BaseController",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "zsddeliverychk/model/serviceUtils"
], function (Controller, History, JSONModel, Filter, FilterOperator, MessageToast, serviceUtils) {
    "use strict";

    return Controller.extend("zsddeliverychk.controller.Items", {
        onInit: function () {
            this.getView().setModel(new JSONModel({
                vbeln: "",
                barcode: "",
                items: [],
                loading: false,
                posting: false,
                scanning: false
            }), "page");
            this._routeSequence = 0;
            this._readSequence = 0;
            this.getRouter().getRoute("RouteItems").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var oPage = this.getView().getModel("page");
            this._routeSequence++;
            oPage.setData({
                vbeln: decodeURIComponent(oEvent.getParameter("arguments").vbeln),
                barcode: "",
                items: [],
                loading: false,
                posting: false,
                scanning: false
            });
            this._loadItems();
        },

        _loadItems: function () {
            var oPage = this.getView().getModel("page");
            var iRoute = this._routeSequence;
            var iRead = ++this._readSequence;
            oPage.setProperty("/loading", true);
            this.getView().getModel().read("/CheckItemsSet", {
                filters: [new Filter("Vbeln", FilterOperator.EQ, oPage.getProperty("/vbeln"))],
                success: function (oData) {
                    if (iRoute === this._routeSequence && iRead === this._readSequence) {
                        oPage.setSizeLimit(Math.max(100, oData.results.length));
                        oPage.setProperty("/items", oData.results);
                        oPage.setProperty("/loading", false);
                    }
                }.bind(this),
                error: function (oError) {
                    if (iRoute === this._routeSequence && iRead === this._readSequence) {
                        oPage.setProperty("/loading", false);
                        serviceUtils.showError(this.getResourceBundle(), "itemsLoadError", oError);
                    }
                }.bind(this)
            });
        },

        onScan: function () {
            var oPage = this.getView().getModel("page");
            var iRoute = this._routeSequence;
            oPage.setProperty("/scanning", true);
            serviceUtils.scan(this.getResourceBundle(), function (sText) {
                if (iRoute !== this._routeSequence) {
                    return;
                }
                oPage.setProperty("/scanning", false);
                if (sText !== null) {
                    oPage.setProperty("/barcode", sText);
                    this.onCreateItem();
                }
            }.bind(this));
        },

        onCreateItem: function () {
            var oPage = this.getView().getModel("page");
            var sBarcode = oPage.getProperty("/barcode");
            var sVbeln = oPage.getProperty("/vbeln");
            var iRoute = this._routeSequence;
            if (oPage.getProperty("/posting")) {
                return;
            }
            if (!sBarcode || !sBarcode.trim()) {
                MessageToast.show(this.getResourceBundle().getText("barcodeRequired"));
                return;
            }
            oPage.setProperty("/posting", true);
            this.getView().getModel().create("/CheckItemsSet", {
                Vbeln: sVbeln,
                Barcode: sBarcode
            }, {
                success: function () {
                    MessageToast.show(this.getResourceBundle().getText("itemCreated"));
                    if (iRoute === this._routeSequence) {
                        oPage.setProperty("/posting", false);
                        oPage.setProperty("/barcode", "");
                        this._loadItems();
                    } else if (sVbeln === oPage.getProperty("/vbeln")) {
                        this._loadItems();
                    }
                }.bind(this),
                error: function (oError) {
                    if (iRoute === this._routeSequence) {
                        oPage.setProperty("/posting", false);
                    }
                    serviceUtils.showError(this.getResourceBundle(), "itemCreateError", oError);
                }.bind(this)
            });
        },

        onNavBack: function () {
            this._routeSequence++;
            if (History.getInstance().getPreviousHash() !== undefined) {
                window.history.go(-1);
            } else {
                this.getRouter().navTo("RouteMain", {}, true);
            }
        }
    });
});
