/*global QUnit*/

sap.ui.define([
	"zsddeliverychk/controller/Main.controller",
	"sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
	"use strict";

	QUnit.module("Main Controller");

	QUnit.test("The search starts with an empty result list", function (assert) {
		var oAppController = new Controller();
		var oPage;
		oAppController.getView = function () {
			return { setModel: function (oModel) { oPage = oModel; } };
		};
		oAppController.onInit();
		assert.ok(oPage instanceof JSONModel);
		assert.deepEqual(oPage.getProperty("/headers"), []);
		oPage.destroy();
		oAppController.destroy();
	});

});
